const pool = require("../config/db");
const audit = require("../services/auditService");

// Transicoes de status validas - o sistema controla, nao aceita qualquer string
const STATUS_VALIDOS = ["novo", "em_atendimento", "aguardando_cliente", "aguardando_empresa", "resolvido", "encerrado", "reaberto"];
const PRIORIDADES_VALIDAS = ["baixa", "normal", "alta", "urgente"];
const CANAIS_VALIDOS = ["email", "whatsapp", "chat", "formulario", "marketplace", "outros"];

async function registrarHistorico(ticketId, usuarioId, evento, valorAnterior, valorNovo) {
  try {
    await pool.query(
      "INSERT INTO sac_ticket_historico (ticket_id, usuario_id, evento, valor_anterior, valor_novo) VALUES (?, ?, ?, ?, ?)",
      [ticketId, usuarioId || null, evento, valorAnterior || null, valorNovo || null]
    );
  } catch (err) {
    console.error("[SAC HISTORICO ERROR]", err.message);
  }
}

exports.listarTickets = async (req, res) => {
  try {
    const { status, prioridade, categoria } = req.query;
    let sql = `SELECT t.*, c.nome AS customer_nome, u.nome AS responsavel_nome
               FROM sac_tickets t
               LEFT JOIN customers c ON c.id = t.customer_id
               LEFT JOIN users u ON u.id = t.responsavel_id
               WHERE t.tenant_id = ?`;
    const params = [req.tenant_id];

    if (status) { sql += " AND t.status = ?"; params.push(status); }
    if (prioridade) { sql += " AND t.prioridade = ?"; params.push(prioridade); }
    if (categoria) { sql += " AND t.categoria = ?"; params.push(categoria); }

    sql += " ORDER BY t.updated_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar tickets", details: err.message });
  }
};

exports.buscarTicket = async (req, res) => {
  try {
    const [[ticket]] = await pool.query(
      `SELECT t.*, c.nome AS customer_nome, c.email AS customer_email, u.nome AS responsavel_nome
       FROM sac_tickets t
       LEFT JOIN customers c ON c.id = t.customer_id
       LEFT JOIN users u ON u.id = t.responsavel_id
       WHERE t.id = ? AND t.tenant_id = ?`,
      [req.params.id, req.tenant_id]
    );
    if (!ticket) return res.status(404).json({ error: "Ticket nao encontrado" });

    const [mensagens] = await pool.query(
      `SELECT m.*, u.nome AS remetente_nome FROM sac_messages m
       LEFT JOIN users u ON u.id = m.remetente_id
       WHERE m.ticket_id = ? ORDER BY m.created_at ASC`,
      [ticket.id]
    );

    const [historico] = await pool.query(
      `SELECT h.*, u.nome AS usuario_nome FROM sac_ticket_historico h
       LEFT JOIN users u ON u.id = h.usuario_id
       WHERE h.ticket_id = ? ORDER BY h.created_at ASC`,
      [ticket.id]
    );

    res.json({ ...ticket, mensagens, historico });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar ticket", details: err.message });
  }
};

exports.criarTicket = async (req, res) => {
  try {
    const { customer_id, order_id, assunto, descricao, categoria, prioridade, canal } = req.body;
    if (!assunto) return res.status(400).json({ error: "assunto e obrigatorio" });
    if (prioridade && !PRIORIDADES_VALIDAS.includes(prioridade)) return res.status(400).json({ error: `prioridade deve ser uma de: ${PRIORIDADES_VALIDAS.join(", ")}` });
    if (canal && !CANAIS_VALIDOS.includes(canal)) return res.status(400).json({ error: `canal deve ser um de: ${CANAIS_VALIDOS.join(", ")}` });

    // Se customer_id foi informado, confirma que pertence ao tenant (nunca confiar em ID arbitrario do frontend)
    if (customer_id) {
      const [[cliente]] = await pool.query("SELECT id FROM customers WHERE id = ? AND tenant_id = ?", [customer_id, req.tenant_id]);
      if (!cliente) return res.status(400).json({ error: "Cliente nao encontrado neste tenant" });
    }
    if (order_id) {
      const [[pedido]] = await pool.query("SELECT id FROM orders WHERE id = ? AND tenant_id = ?", [order_id, req.tenant_id]);
      if (!pedido) return res.status(400).json({ error: "Pedido nao encontrado neste tenant" });
    }

    const [result] = await pool.query(
      `INSERT INTO sac_tickets (tenant_id, customer_id, order_id, assunto, descricao, categoria, prioridade, canal, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'novo')`,
      [req.tenant_id, customer_id || null, order_id || null, assunto, descricao || null, categoria || "outros", prioridade || "normal", canal || "chat"]
    );

    await registrarHistorico(result.insertId, req.user.id, "Ticket criado", null, "novo");

    res.status(201).json({ id: result.insertId, message: "Ticket criado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar ticket", details: err.message });
  }
};

exports.atualizarStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUS_VALIDOS.includes(status)) return res.status(400).json({ error: `status deve ser um de: ${STATUS_VALIDOS.join(", ")}` });

    const [[ticket]] = await pool.query("SELECT status FROM sac_tickets WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!ticket) return res.status(404).json({ error: "Ticket nao encontrado" });

    const camposExtras = {};
    if (status === "resolvido") camposExtras.resolvido_em = new Date();
    if (status === "encerrado") camposExtras.encerrado_em = new Date();
    if (status === "reaberto") camposExtras.reaberto_em = new Date();

    const setExtras = Object.keys(camposExtras).map(c => `${c} = ?`).join(", ");
    const valoresExtras = Object.values(camposExtras);

    await pool.query(
      `UPDATE sac_tickets SET status = ? ${setExtras ? ", " + setExtras : ""} WHERE id = ? AND tenant_id = ?`,
      [status, ...valoresExtras, req.params.id, req.tenant_id]
    );

    await registrarHistorico(req.params.id, req.user.id, "Status alterado", ticket.status, status);

    // Acoes de encerramento administrativo sao sensiveis - entram na auditoria central
    if (status === "encerrado") {
      const [[usuario]] = await pool.query("SELECT nome FROM users WHERE id = ?", [req.user.id]);
      await audit.registrar({
        tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: usuario?.nome,
        acao: `Encerrou o ticket #${req.params.id}`, origem: "SAC / Atendimento",
      });
    }

    res.json({ message: "Status atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar status", details: err.message });
  }
};

exports.atualizarPrioridade = async (req, res) => {
  try {
    const { prioridade } = req.body;
    if (!PRIORIDADES_VALIDAS.includes(prioridade)) return res.status(400).json({ error: `prioridade deve ser uma de: ${PRIORIDADES_VALIDAS.join(", ")}` });

    const [[ticket]] = await pool.query("SELECT prioridade FROM sac_tickets WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!ticket) return res.status(404).json({ error: "Ticket nao encontrado" });

    await pool.query("UPDATE sac_tickets SET prioridade = ? WHERE id = ? AND tenant_id = ?", [prioridade, req.params.id, req.tenant_id]);
    await registrarHistorico(req.params.id, req.user.id, "Prioridade alterada", ticket.prioridade, prioridade);

    res.json({ message: "Prioridade atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar prioridade", details: err.message });
  }
};

exports.atribuirResponsavel = async (req, res) => {
  try {
    const { responsavel_id } = req.body;
    if (responsavel_id) {
      const [[usuarioAlvo]] = await pool.query("SELECT id, nome FROM users WHERE id = ? AND tenant_id = ?", [responsavel_id, req.tenant_id]);
      if (!usuarioAlvo) return res.status(400).json({ error: "Usuario responsavel nao encontrado neste tenant" });
    }

    const [[ticket]] = await pool.query("SELECT responsavel_id FROM sac_tickets WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!ticket) return res.status(404).json({ error: "Ticket nao encontrado" });

    await pool.query("UPDATE sac_tickets SET responsavel_id = ? WHERE id = ? AND tenant_id = ?", [responsavel_id || null, req.params.id, req.tenant_id]);
    await registrarHistorico(req.params.id, req.user.id, "Responsável atribuído", String(ticket.responsavel_id || "ninguém"), String(responsavel_id || "ninguém"));

    res.json({ message: "Responsavel atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atribuir responsavel", details: err.message });
  }
};

exports.enviarMensagem = async (req, res) => {
  try {
    const { conteudo, interna } = req.body;
    if (!conteudo) return res.status(400).json({ error: "conteudo e obrigatorio" });

    const [[ticket]] = await pool.query("SELECT id, status FROM sac_tickets WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!ticket) return res.status(404).json({ error: "Ticket nao encontrado" });

    await pool.query(
      "INSERT INTO sac_messages (ticket_id, remetente_id, tipo, conteudo, interna) VALUES (?, ?, 'atendente', ?, ?)",
      [req.params.id, req.user.id, conteudo, !!interna]
    );

    // Primeira resposta: registra o timestamp se ainda nao existir
    const [[jaTemResposta]] = await pool.query("SELECT primeira_resposta_em FROM sac_tickets WHERE id = ?", [req.params.id]);
    if (!jaTemResposta.primeira_resposta_em && !interna) {
      await pool.query("UPDATE sac_tickets SET primeira_resposta_em = NOW() WHERE id = ?", [req.params.id]);
    }

    // Se o ticket estava "novo" ou "aguardando_empresa", responder move para "em_atendimento"
    if (!interna && ["novo", "aguardando_empresa"].includes(ticket.status)) {
      await pool.query("UPDATE sac_tickets SET status = 'em_atendimento' WHERE id = ?", [req.params.id]);
      await registrarHistorico(req.params.id, req.user.id, "Status alterado", ticket.status, "em_atendimento");
    }

    res.status(201).json({ message: "Mensagem enviada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao enviar mensagem", details: err.message });
  }
};

exports.metricas = async (req, res) => {
  try {
    const tenantId = req.tenant_id;
    const [[totais]] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status IN ('novo','em_atendimento','aguardando_cliente','aguardando_empresa','reaberto') THEN 1 ELSE 0 END) AS abertos,
         SUM(CASE WHEN status = 'resolvido' THEN 1 ELSE 0 END) AS resolvidos,
         SUM(CASE WHEN status = 'encerrado' THEN 1 ELSE 0 END) AS encerrados
       FROM sac_tickets WHERE tenant_id = ?`,
      [tenantId]
    );

    const [porCategoria] = await pool.query(
      "SELECT categoria, COUNT(*) AS total FROM sac_tickets WHERE tenant_id = ? GROUP BY categoria ORDER BY total DESC",
      [tenantId]
    );

    const [[tempoMedio]] = await pool.query(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, primeira_resposta_em)) AS media_primeira_resposta_min
       FROM sac_tickets WHERE tenant_id = ? AND primeira_resposta_em IS NOT NULL`,
      [tenantId]
    );

        res.json({
      total: Number(totais.total) || 0,
      abertos: Number(totais.abertos) || 0,
      resolvidos: Number(totais.resolvidos) || 0,
      encerrados: Number(totais.encerrados) || 0,
      por_categoria: porCategoria,
      tempo_medio_primeira_resposta_minutos: tempoMedio.media_primeira_resposta_min != null ? Math.round(tempoMedio.media_primeira_resposta_min) : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular metricas", details: err.message });
  }
};