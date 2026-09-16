const pool = require("../config/db");
const audit = require("../services/auditService");
const role = require("../middleware/roleMiddleware");

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

    const [regras] = await pool.query("SELECT * FROM sac_sla_rules WHERE tenant_id = ?", [req.tenant_id]);
    const mapaRegras = Object.fromEntries(regras.map(r => [r.prioridade, r]));
    rows.forEach(t => { t.sla_status = calcularSlaStatus(t, mapaRegras[t.prioridade]); });

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

       const [[regra]] = await pool.query("SELECT * FROM sac_sla_rules WHERE tenant_id = ? AND prioridade = ?", [req.tenant_id, ticket.prioridade]);
    const sla_status = calcularSlaStatus(ticket, regra);

    res.json({ ...ticket, mensagens, historico, sla_status });
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
// ── FASE 3: Equipes ──
exports.listarEquipes = async (req, res) => {
  try {
    const [equipes] = await pool.query("SELECT * FROM sac_teams WHERE tenant_id = ? ORDER BY nome", [req.tenant_id]);
    for (const equipe of equipes) {
      const [membros] = await pool.query(
        `SELECT u.id, u.nome FROM sac_team_members tm JOIN users u ON u.id = tm.user_id WHERE tm.team_id = ?`,
        [equipe.id]
      );
      equipe.membros = membros;
    }
    res.json(equipes);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar equipes", details: err.message });
  }
};

exports.criarEquipe = async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    if (!nome) return res.status(400).json({ error: "nome e obrigatorio" });
    const [result] = await pool.query("INSERT INTO sac_teams (tenant_id, nome, descricao) VALUES (?, ?, ?)", [req.tenant_id, nome, descricao || null]);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar equipe", details: err.message });
  }
};

exports.adicionarMembro = async (req, res) => {
  try {
    const { user_id } = req.body;
    const [[equipe]] = await pool.query("SELECT id FROM sac_teams WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!equipe) return res.status(404).json({ error: "Equipe nao encontrada" });
    const [[usuario]] = await pool.query("SELECT id FROM users WHERE id = ? AND tenant_id = ?", [user_id, req.tenant_id]);
    if (!usuario) return res.status(400).json({ error: "Usuario nao encontrado neste tenant" });

    await pool.query("INSERT IGNORE INTO sac_team_members (team_id, user_id) VALUES (?, ?)", [req.params.id, user_id]);
    res.json({ message: "Membro adicionado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao adicionar membro", details: err.message });
  }
};

exports.removerMembro = async (req, res) => {
  try {
    await pool.query("DELETE FROM sac_team_members WHERE team_id = ? AND user_id = ?", [req.params.id, req.params.userId]);
    res.json({ message: "Membro removido" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao remover membro", details: err.message });
  }
};

// ── FASE 3: Filas ──
exports.listarFilas = async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT f.*, t.nome AS team_nome FROM sac_queues f LEFT JOIN sac_teams t ON t.id = f.team_id
       WHERE f.tenant_id = ? ORDER BY f.nome`,
      [req.tenant_id]
    );
    res.json(filas);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar filas", details: err.message });
  }
};

exports.criarFila = async (req, res) => {
  try {
    const { nome, descricao, team_id } = req.body;
    if (!nome) return res.status(400).json({ error: "nome e obrigatorio" });
    if (team_id) {
      const [[equipe]] = await pool.query("SELECT id FROM sac_teams WHERE id = ? AND tenant_id = ?", [team_id, req.tenant_id]);
      if (!equipe) return res.status(400).json({ error: "Equipe nao encontrada neste tenant" });
    }
    const [result] = await pool.query("INSERT INTO sac_queues (tenant_id, nome, descricao, team_id) VALUES (?, ?, ?, ?)", [req.tenant_id, nome, descricao || null, team_id || null]);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar fila", details: err.message });
  }
};

exports.desativarFila = async (req, res) => {
  try {
    await pool.query("UPDATE sac_queues SET ativo = FALSE WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    res.json({ message: "Fila desativada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desativar fila", details: err.message });
  }
};

exports.atribuirFila = async (req, res) => {
  try {
    const { queue_id } = req.body;
    if (queue_id) {
      const [[fila]] = await pool.query("SELECT id FROM sac_queues WHERE id = ? AND tenant_id = ?", [queue_id, req.tenant_id]);
      if (!fila) return res.status(400).json({ error: "Fila nao encontrada neste tenant" });
    }
    const [[ticket]] = await pool.query("SELECT queue_id FROM sac_tickets WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!ticket) return res.status(404).json({ error: "Ticket nao encontrado" });

    await pool.query("UPDATE sac_tickets SET queue_id = ? WHERE id = ? AND tenant_id = ?", [queue_id || null, req.params.id, req.tenant_id]);
    await registrarHistorico(req.params.id, req.user.id, "Fila atribuída", String(ticket.queue_id || "nenhuma"), String(queue_id || "nenhuma"));

    res.json({ message: "Fila atribuida" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atribuir fila", details: err.message });
  }
};

// ── FASE 4: Integracoes (contexto do ticket) ──
exports.contextoTicket = async (req, res) => {
  try {
    const [[ticket]] = await pool.query("SELECT customer_id, order_id FROM sac_tickets WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!ticket) return res.status(404).json({ error: "Ticket nao encontrado" });

    const contexto = { pedido: null, logistica: null, crm: { deals: [], interacoes: [] }, tickets_anteriores: [] };

    // Pedido - reaproveita a tabela orders existente, nunca duplica
    if (ticket.order_id) {
      const [[pedido]] = await pool.query(
        `SELECT o.id, o.status, o.total, o.created_at FROM orders o WHERE o.id = ? AND o.tenant_id = ?`,
        [ticket.order_id, req.tenant_id]
      );
      contexto.pedido = pedido || null;

      // Logistica - busca envio vinculado ao pedido, se existir
      if (pedido) {
        const [[envio]] = await pool.query(
          `SELECT s.status, s.tracking_code, s.data_prevista, s.data_entrega, c.nome AS carrier_nome
           FROM logistics_shipments s LEFT JOIN logistics_carriers c ON c.id = s.carrier_id
           WHERE s.order_id = ? AND s.tenant_id = ?`,
          [ticket.order_id, req.tenant_id]
        );
        contexto.logistica = envio || null;
      }
    }

    // CRM - deals e interacoes do mesmo cliente, se vinculado
    if (ticket.customer_id) {
      const [deals] = await pool.query(
        `SELECT id, titulo, estagio, valor FROM crm_deals WHERE customer_id = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT 5`,
        [ticket.customer_id, req.tenant_id]
      );
      contexto.crm.deals = deals;

      const [interacoes] = await pool.query(
        `SELECT tipo, descricao, created_at FROM crm_activities WHERE customer_id = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT 5`,
        [ticket.customer_id, req.tenant_id]
      ).catch(() => [[]]);
      contexto.crm.interacoes = interacoes || [];

      // Tickets anteriores do mesmo cliente (exceto o atual)
      const [ticketsAnteriores] = await pool.query(
        `SELECT id, assunto, status, created_at FROM sac_tickets WHERE customer_id = ? AND tenant_id = ? AND id != ? ORDER BY created_at DESC LIMIT 5`,
        [ticket.customer_id, req.tenant_id, req.params.id]
      );
      contexto.tickets_anteriores = ticketsAnteriores;
    }

    res.json(contexto);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar contexto do ticket", details: err.message });
  }
};

// ── FASE 5: SLA ──
function calcularSlaStatus(ticket, regra) {
  if (!regra) return null;
  const agora = new Date();
  const criado = new Date(ticket.created_at);
  const minutosDecorridos = (agora - criado) / 60000;

  // Se ja foi resolvido/encerrado, o SLA de resolucao esta "cumprido" se resolveu dentro do prazo
  if (ticket.resolvido_em || ticket.encerrado_em) {
    const dataConclusao = new Date(ticket.resolvido_em || ticket.encerrado_em);
    const minutosAteConcluir = (dataConclusao - criado) / 60000;
    return minutosAteConcluir <= regra.resolucao_minutos ? "cumprido" : "vencido_mas_concluido";
  }

  // Ainda aberto: verifica primeira resposta e resolucao
  if (!ticket.primeira_resposta_em && minutosDecorridos > regra.primeira_resposta_minutos) return "vencido";
  if (minutosDecorridos > regra.resolucao_minutos) return "vencido";
  if (minutosDecorridos > regra.resolucao_minutos * 0.8) return "proximo_vencimento";
  return "dentro_prazo";
}

exports.listarSlaRegras = async (req, res) => {
  try {
    const [regras] = await pool.query("SELECT * FROM sac_sla_rules WHERE tenant_id = ? ORDER BY FIELD(prioridade, 'urgente','alta','normal','baixa')", [req.tenant_id]);
    res.json(regras);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar regras de SLA", details: err.message });
  }
};

exports.atualizarSlaRegra = async (req, res) => {
  try {
    const { prioridade, primeira_resposta_minutos, resolucao_minutos } = req.body;
    const prioridadesValidas = ["baixa", "normal", "alta", "urgente"];
    if (!prioridadesValidas.includes(prioridade)) return res.status(400).json({ error: `prioridade deve ser uma de: ${prioridadesValidas.join(", ")}` });
    if (!primeira_resposta_minutos || !resolucao_minutos) return res.status(400).json({ error: "primeira_resposta_minutos e resolucao_minutos sao obrigatorios" });

    await pool.query(
      `INSERT INTO sac_sla_rules (tenant_id, prioridade, primeira_resposta_minutos, resolucao_minutos) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE primeira_resposta_minutos = ?, resolucao_minutos = ?`,
      [req.tenant_id, prioridade, primeira_resposta_minutos, resolucao_minutos, primeira_resposta_minutos, resolucao_minutos]
    );

    res.json({ message: "Regra de SLA atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar regra de SLA", details: err.message });
  }
};

exports.indicadoresSla = async (req, res) => {
  try {
    const tenantId = req.tenant_id;
    const [tickets] = await pool.query("SELECT id, prioridade, created_at, primeira_resposta_em, resolvido_em, encerrado_em FROM sac_tickets WHERE tenant_id = ?", [tenantId]);
    const [regras] = await pool.query("SELECT * FROM sac_sla_rules WHERE tenant_id = ?", [tenantId]);
    const mapaRegras = Object.fromEntries(regras.map(r => [r.prioridade, r]));

    let cumprido = 0, vencido = 0, dentroPrazo = 0, proximoVencimento = 0;
    for (const t of tickets) {
      const status = calcularSlaStatus(t, mapaRegras[t.prioridade]);
      if (status === "cumprido") cumprido++;
      else if (status === "vencido" || status === "vencido_mas_concluido") vencido++;
      else if (status === "proximo_vencimento") proximoVencimento++;
      else if (status === "dentro_prazo") dentroPrazo++;
    }

    const totalAvaliado = cumprido + vencido + dentroPrazo + proximoVencimento;
    res.json({
      total_tickets: tickets.length,
      cumprido, vencido, dentro_prazo: dentroPrazo, proximo_vencimento: proximoVencimento,
      percentual_cumprimento: totalAvaliado > 0 ? Math.round(((cumprido + dentroPrazo) / totalAvaliado) * 100) : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular indicadores de SLA", details: err.message });
  }
};

// ── FASE 6: Base de Conhecimento ──
exports.listarArtigos = async (req, res) => {
  try {
    const { categoria, status } = req.query;
    let sql = "SELECT a.*, u.nome AS autor_nome FROM sac_kb_articles a LEFT JOIN users u ON u.id = a.autor_id WHERE a.tenant_id = ?";
    const params = [req.tenant_id];
    if (categoria) { sql += " AND a.categoria = ?"; params.push(categoria); }
    if (status) { sql += " AND a.status = ?"; params.push(status); }
    sql += " ORDER BY a.updated_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar artigos", details: err.message });
  }
};

exports.buscarArtigo = async (req, res) => {
  try {
    const [[artigo]] = await pool.query(
      "SELECT a.*, u.nome AS autor_nome FROM sac_kb_articles a LEFT JOIN users u ON u.id = a.autor_id WHERE a.id = ? AND a.tenant_id = ?",
      [req.params.id, req.tenant_id]
    );
    if (!artigo) return res.status(404).json({ error: "Artigo nao encontrado" });
    res.json(artigo);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar artigo", details: err.message });
  }
};

exports.criarArtigo = async (req, res) => {
  try {
    const { titulo, categoria, conteudo, status } = req.body;
    if (!titulo || !conteudo) return res.status(400).json({ error: "titulo e conteudo sao obrigatorios" });
    const [result] = await pool.query(
      "INSERT INTO sac_kb_articles (tenant_id, titulo, categoria, conteudo, status, autor_id) VALUES (?, ?, ?, ?, ?, ?)",
      [req.tenant_id, titulo, categoria || "outros", conteudo, status === "publicado" ? "publicado" : "rascunho", req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar artigo", details: err.message });
  }
};

exports.atualizarArtigo = async (req, res) => {
  try {
    const { titulo, categoria, conteudo, status } = req.body;
    const [[artigo]] = await pool.query("SELECT id FROM sac_kb_articles WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!artigo) return res.status(404).json({ error: "Artigo nao encontrado" });

    await pool.query(
      "UPDATE sac_kb_articles SET titulo = ?, categoria = ?, conteudo = ?, status = ? WHERE id = ? AND tenant_id = ?",
      [titulo, categoria || "outros", conteudo, status === "publicado" ? "publicado" : "rascunho", req.params.id, req.tenant_id]
    );
    res.json({ message: "Artigo atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar artigo", details: err.message });
  }
};

exports.excluirArtigo = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM sac_kb_articles WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Artigo nao encontrado" });
    res.json({ message: "Artigo excluido" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir artigo", details: err.message });
  }
};

// ── FASE 6: Respostas Rapidas ──
exports.listarRespostasRapidas = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM sac_quick_replies WHERE tenant_id = ? AND ativo = TRUE ORDER BY titulo", [req.tenant_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar respostas rapidas", details: err.message });
  }
};

exports.criarRespostaRapida = async (req, res) => {
  try {
    const { titulo, conteudo, categoria } = req.body;
    if (!titulo || !conteudo) return res.status(400).json({ error: "titulo e conteudo sao obrigatorios" });
    const [result] = await pool.query(
      "INSERT INTO sac_quick_replies (tenant_id, titulo, conteudo, categoria) VALUES (?, ?, ?, ?)",
      [req.tenant_id, titulo, conteudo, categoria || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar resposta rapida", details: err.message });
  }
};

exports.desativarRespostaRapida = async (req, res) => {
  try {
    await pool.query("UPDATE sac_quick_replies SET ativo = FALSE WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    res.json({ message: "Resposta rapida desativada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desativar resposta rapida", details: err.message });
  }
};

// Substitui variaveis reais na resposta rapida (ex: {nome} do cliente).
// So substitui variaveis que o sistema realmente sabe preencher - nunca inventa.
exports.aplicarRespostaRapida = async (req, res) => {
  try {
    const [[resposta]] = await pool.query("SELECT conteudo FROM sac_quick_replies WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!resposta) return res.status(404).json({ error: "Resposta rapida nao encontrada" });

    let textoFinal = resposta.conteudo;

    if (req.query.ticket_id) {
      const [[ticket]] = await pool.query(
        `SELECT c.nome AS customer_nome, t.assunto FROM sac_tickets t LEFT JOIN customers c ON c.id = t.customer_id
         WHERE t.id = ? AND t.tenant_id = ?`,
        [req.query.ticket_id, req.tenant_id]
      );
      if (ticket) {
        textoFinal = textoFinal.replace(/{nome}/g, ticket.customer_nome || "cliente");
        textoFinal = textoFinal.replace(/{assunto}/g, ticket.assunto || "");
      }
    }

    res.json({ conteudo: textoFinal });
  } catch (err) {
    res.status(500).json({ error: "Erro ao aplicar resposta rapida", details: err.message });
  }
};