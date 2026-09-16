const pool = require("../config/db");
const eventDispatcher = require("../automation/engine/EventDispatcher");
const audit = require("../services/auditService");

// ── Depositos ──
exports.listarDepositos = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM logistics_warehouses WHERE tenant_id = ? ORDER BY nome", [req.tenant_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar depositos", details: err.message });
  }
};

exports.criarDeposito = async (req, res) => {
  try {
    const { nome, endereco, cidade, estado, cep, capacidade, responsavel } = req.body;
    if (!nome) return res.status(400).json({ error: "nome e obrigatorio" });
    const [result] = await pool.query(
      "INSERT INTO logistics_warehouses (tenant_id, nome, endereco, cidade, estado, cep, capacidade, responsavel) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [req.tenant_id, nome, endereco || null, cidade || null, estado || null, cep || null, capacidade || null, responsavel || null]
    );

    try {
      const pool2 = require("../config/db");
      const [[usuario]] = await pool2.query("SELECT nome FROM users WHERE id = ?", [req.user.id]);
      await audit.registrar({
        tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: usuario?.nome,
        acao: `Criou o depósito ${nome}`, origem: "Logística",
      });
    } catch { /* auditoria nao deve travar a criacao do deposito */ }

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar deposito", details: err.message });
  }
};

exports.desativarDeposito = async (req, res) => {
  try {
    const [[deposito]] = await pool.query("SELECT nome FROM logistics_warehouses WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    await pool.query("UPDATE logistics_warehouses SET ativo = FALSE WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);

    try {
      const [[usuario]] = await pool.query("SELECT nome FROM users WHERE id = ?", [req.user.id]);
      await audit.registrar({
        tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: usuario?.nome,
        acao: `Desativou o depósito ${deposito?.nome || req.params.id}`, origem: "Logística",
      });
    } catch { /* auditoria nao deve travar a desativacao */ }

    res.json({ message: "Deposito desativado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desativar deposito", details: err.message });
  }
};

// ── Transportadoras ──
exports.listarTransportadoras = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM logistics_carriers WHERE tenant_id = ? ORDER BY nome", [req.tenant_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar transportadoras", details: err.message });
  }
};

exports.criarTransportadora = async (req, res) => {
  try {
    const { nome, cnpj, contato, modalidades, prazo_medio_dias, custo_medio } = req.body;
    if (!nome) return res.status(400).json({ error: "nome e obrigatorio" });
    const [result] = await pool.query(
      "INSERT INTO logistics_carriers (tenant_id, nome, cnpj, contato, modalidades, prazo_medio_dias, custo_medio) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [req.tenant_id, nome, cnpj || null, contato || null, modalidades || null, prazo_medio_dias || null, custo_medio || null]
    );

    try {
      const [[usuario]] = await pool.query("SELECT nome FROM users WHERE id = ?", [req.user.id]);
      await audit.registrar({
        tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: usuario?.nome,
        acao: `Criou a transportadora ${nome}`, origem: "Logística",
      });
    } catch { /* auditoria nao deve travar a criacao */ }

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar transportadora", details: err.message });
  }
};

exports.desativarTransportadora = async (req, res) => {
  try {
    const [[transportadora]] = await pool.query("SELECT nome FROM logistics_carriers WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    await pool.query("UPDATE logistics_carriers SET ativo = FALSE WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);

    try {
      const [[usuario]] = await pool.query("SELECT nome FROM users WHERE id = ?", [req.user.id]);
      await audit.registrar({
        tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: usuario?.nome,
        acao: `Desativou a transportadora ${transportadora?.nome || req.params.id}`, origem: "Logística",
      });
    } catch { /* auditoria nao deve travar a desativacao */ }

    res.json({ message: "Transportadora desativada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desativar transportadora", details: err.message });
  }
};

// ── Envios (shipments) ──
const ESTAGIOS_VALIDOS = [
  "aguardando_separacao","em_separacao","conferencia","em_embalagem","pronto_expedicao",
  "despachado","em_transito","saiu_entrega","entregue",
  "cancelado","devolvido","extraviado","endereco_invalido","aguardando_informacao",
  "tentativa_entrega","entrega_recusada","problema_transporte",
];

exports.listarEnvios = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT s.*, o.total AS pedido_total, c.nome AS customer_nome, cr.nome AS carrier_nome, w.nome AS warehouse_nome
               FROM logistics_shipments s
               JOIN orders o ON o.id = s.order_id
               LEFT JOIN customers c ON c.id = o.customer_id
               LEFT JOIN logistics_carriers cr ON cr.id = s.carrier_id
               LEFT JOIN logistics_warehouses w ON w.id = s.warehouse_id
               WHERE s.tenant_id = ?`;
    const params = [req.tenant_id];
    if (status) { sql += " AND s.status = ?"; params.push(status); }
    sql += " ORDER BY s.created_at DESC LIMIT 100";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar envios", details: err.message });
  }
};

exports.criarEnvio = async (req, res) => {
  try {
    const { order_id, warehouse_id, carrier_id, prioridade, peso_kg, volumes, frete_valor, data_prevista } = req.body;
    if (!order_id) return res.status(400).json({ error: "order_id e obrigatorio" });

    const [[pedido]] = await pool.query("SELECT id FROM orders WHERE id = ? AND tenant_id = ?", [order_id, req.tenant_id]);
    if (!pedido) return res.status(400).json({ error: "order_id invalido para este tenant" });

    const [result] = await pool.query(
      `INSERT INTO logistics_shipments (tenant_id, order_id, warehouse_id, carrier_id, prioridade, peso_kg, volumes, frete_valor, data_prevista)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenant_id, order_id, warehouse_id || null, carrier_id || null, prioridade || "normal", peso_kg || null, volumes || 1, frete_valor || null, data_prevista || null]
    );
    res.status(201).json({ id: result.insertId, status: "aguardando_separacao" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar envio", details: err.message });
  }
};

exports.mudarStatusEnvio = async (req, res) => {
  try {
    const { status, descricao, localizacao } = req.body;
    if (!ESTAGIOS_VALIDOS.includes(status)) return res.status(400).json({ error: "status invalido" });

    const [[envio]] = await pool.query("SELECT * FROM logistics_shipments WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!envio) return res.status(404).json({ error: "Envio nao encontrado" });

    const camposExtras = {};
    if (status === "despachado") camposExtras.data_despacho = new Date();
    if (status === "entregue") camposExtras.data_entrega = new Date();

    const setExtras = Object.keys(camposExtras).map(k => `${k} = ?`).join(", ");
    const sql = `UPDATE logistics_shipments SET status = ?${setExtras ? ", " + setExtras : ""} WHERE id = ?`;
    await pool.query(sql, [status, ...Object.values(camposExtras), req.params.id]);

    await pool.query(
      "INSERT INTO logistics_tracking_events (tenant_id, shipment_id, evento, descricao, localizacao) VALUES (?, ?, ?, ?, ?)",
      [req.tenant_id, req.params.id, status, descricao || null, localizacao || null]
    );

        if (status === "despachado") {
      try { await eventDispatcher.dispatch("ORDER_SHIPPED", req.tenant_id, { shipment_id: Number(req.params.id) }); } catch {}
    }
    if (status === "entregue") {
      try { await eventDispatcher.dispatch("ORDER_DELIVERED", req.tenant_id, { shipment_id: Number(req.params.id), customer_id: envio.customer_id }); } catch {}
    }

    res.json({ message: "Status do envio atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao mudar status do envio", details: err.message });
  }
};

exports.registrarRastreio = async (req, res) => {
  try {
    const { tracking_code } = req.body;
    await pool.query("UPDATE logistics_shipments SET tracking_code = ? WHERE id = ? AND tenant_id = ?", [tracking_code, req.params.id, req.tenant_id]);
        try {
      await eventDispatcher.dispatch("TRACKING_UPDATED", req.tenant_id, { shipment_id: Number(req.params.id), tracking_code });
    } catch { /* nao bloqueia */ }
    res.json({ message: "Codigo de rastreio registrado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao registrar rastreio", details: err.message });
  }
};

exports.detalharEnvio = async (req, res) => {
  try {
    const [[envio]] = await pool.query(
      `SELECT s.*, o.total AS pedido_total, c.nome AS customer_nome, cr.nome AS carrier_nome, w.nome AS warehouse_nome
       FROM logistics_shipments s
       JOIN orders o ON o.id = s.order_id
       LEFT JOIN customers c ON c.id = o.customer_id
       LEFT JOIN logistics_carriers cr ON cr.id = s.carrier_id
       LEFT JOIN logistics_warehouses w ON w.id = s.warehouse_id
       WHERE s.id = ? AND s.tenant_id = ?`,
      [req.params.id, req.tenant_id]
    );
    if (!envio) return res.status(404).json({ error: "Envio nao encontrado" });

    const [eventos] = await pool.query(
      "SELECT * FROM logistics_tracking_events WHERE shipment_id = ? ORDER BY created_at ASC",
      [req.params.id]
    );
    res.json({ ...envio, eventos });
  } catch (err) {
    res.status(500).json({ error: "Erro ao detalhar envio", details: err.message });
  }
};

// ── Dashboard / Torre de Controle (versao inicial da Fase 1) ──
exports.dashboard = async (req, res) => {
  try {
    const tenantId = req.tenant_id;

    const [porStatus] = await pool.query(
      "SELECT status, COUNT(*) AS total FROM logistics_shipments WHERE tenant_id = ? GROUP BY status",
      [tenantId]
    );

    const [[atrasados]] = await pool.query(
      `SELECT COUNT(*) AS total FROM logistics_shipments
       WHERE tenant_id = ? AND data_prevista < CURDATE() AND status NOT IN ('entregue','cancelado','devolvido')`,
      [tenantId]
    );

    const [[fretes]] = await pool.query(
      "SELECT COALESCE(AVG(frete_valor), 0) AS frete_medio, COALESCE(SUM(frete_valor), 0) AS frete_total FROM logistics_shipments WHERE tenant_id = ?",
      [tenantId]
    );

    const [[entregues]] = await pool.query(
      "SELECT COUNT(*) AS total FROM logistics_shipments WHERE tenant_id = ? AND status = 'entregue'",
      [tenantId]
    );
    const [[totalEnvios]] = await pool.query(
      "SELECT COUNT(*) AS total FROM logistics_shipments WHERE tenant_id = ?",
      [tenantId]
    );
    const taxaEntrega = totalEnvios.total > 0 ? Number(((entregues.total / totalEnvios.total) * 100).toFixed(1)) : null;

    res.json({
      por_status: porStatus,
      atrasados: atrasados.total,
      frete_medio: Number(fretes.frete_medio).toFixed(2),
      frete_total: Number(fretes.frete_total).toFixed(2),
      taxa_entrega: taxaEntrega,
      total_envios: totalEnvios.total,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar dashboard logistico", details: err.message });
  }
};

// ── Operacao: iniciar/concluir separacao e embalagem ──
exports.iniciarSeparacao = async (req, res) => {
  try {
    await pool.query(
      "UPDATE logistics_shipments SET status = 'em_separacao', separacao_operador_id = ?, separacao_inicio = NOW() WHERE id = ? AND tenant_id = ?",
      [req.user?.id || null, req.params.id, req.tenant_id]
    );
    await pool.query(
      "INSERT INTO logistics_tracking_events (tenant_id, shipment_id, evento, descricao) VALUES (?, ?, 'em_separacao', 'Separacao iniciada')",
      [req.tenant_id, req.params.id]
    );
        try {
      await eventDispatcher.dispatch("ORDER_PICKING_STARTED", req.tenant_id, { shipment_id: Number(req.params.id) });
    } catch { /* nao bloqueia */ }
    res.json({ message: "Separacao iniciada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao iniciar separacao", details: err.message });
  }
};

exports.concluirSeparacao = async (req, res) => {
  try {
    await pool.query(
      "UPDATE logistics_shipments SET status = 'conferencia', separacao_fim = NOW() WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenant_id]
    );
    await pool.query(
      "INSERT INTO logistics_tracking_events (tenant_id, shipment_id, evento, descricao) VALUES (?, ?, 'conferencia', 'Separacao concluida, aguardando conferencia')",
      [req.tenant_id, req.params.id]
    );
    res.json({ message: "Separacao concluida" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao concluir separacao", details: err.message });
  }
};

exports.registrarEmbalagem = async (req, res) => {
  try {
    const { dimensoes, peso_kg, volumes, custo } = req.body;
    await pool.query(
      `UPDATE logistics_shipments SET status = 'em_embalagem', embalagem_operador_id = ?, embalagem_dimensoes = ?,
       embalagem_custo = ?, peso_kg = COALESCE(?, peso_kg), volumes = COALESCE(?, volumes)
       WHERE id = ? AND tenant_id = ?`,
      [req.user?.id || null, dimensoes || null, custo || null, peso_kg || null, volumes || null, req.params.id, req.tenant_id]
    );
    await pool.query(
      "INSERT INTO logistics_tracking_events (tenant_id, shipment_id, evento, descricao) VALUES (?, ?, 'em_embalagem', 'Embalagem registrada')",
      [req.tenant_id, req.params.id]
    );
        try {
      await eventDispatcher.dispatch("ORDER_PACKED", req.tenant_id, { shipment_id: Number(req.params.id) });
    } catch { /* nao bloqueia */ }
    res.json({ message: "Embalagem registrada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao registrar embalagem", details: err.message });
  }
};

// ── Painel de Entregas (com filtros) ──
exports.listarEntregas = async (req, res) => {
  try {
    const { filtro } = req.query; // hoje | amanha | atrasadas | entregues
    let sql = `SELECT s.*, o.total AS pedido_total, c.nome AS customer_nome, cr.nome AS carrier_nome
               FROM logistics_shipments s
               JOIN orders o ON o.id = s.order_id
               LEFT JOIN customers c ON c.id = o.customer_id
               LEFT JOIN logistics_carriers cr ON cr.id = s.carrier_id
               WHERE s.tenant_id = ?`;
    const params = [req.tenant_id];

    if (filtro === "hoje") {
      sql += " AND s.data_prevista = CURDATE() AND s.status NOT IN ('entregue','cancelado')";
    } else if (filtro === "amanha") {
      sql += " AND s.data_prevista = DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND s.status NOT IN ('entregue','cancelado')";
    } else if (filtro === "atrasadas") {
      sql += " AND s.data_prevista < CURDATE() AND s.status NOT IN ('entregue','cancelado','devolvido')";
    } else if (filtro === "entregues") {
      sql += " AND s.status = 'entregue'";
    } else {
      sql += " AND s.status NOT IN ('entregue','cancelado')";
    }
    sql += " ORDER BY s.data_prevista ASC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar entregas", details: err.message });
  }
};

// ── Score de Transportadoras (Secao 15 do documento) ──
// Calcula o score com base em dados reais dos envios (nao em numero fixo cadastrado manualmente).
exports.scoreTransportadoras = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         cr.id, cr.nome, cr.custo_medio, cr.prazo_medio_dias,
         COUNT(s.id) AS total_envios,
         SUM(CASE WHEN s.status = 'entregue' THEN 1 ELSE 0 END) AS entregues,
         SUM(CASE WHEN s.status = 'entregue' AND s.data_prevista IS NOT NULL AND DATE(s.data_entrega) <= s.data_prevista THEN 1 ELSE 0 END) AS no_prazo,
         SUM(CASE WHEN s.status IN ('extraviado','devolvido','problema_transporte') THEN 1 ELSE 0 END) AS ocorrencias,
         COALESCE(AVG(s.frete_valor), 0) AS frete_medio_real
       FROM logistics_carriers cr
       LEFT JOIN logistics_shipments s ON s.carrier_id = cr.id AND s.tenant_id = cr.tenant_id
       WHERE cr.tenant_id = ? AND cr.ativo = TRUE
       GROUP BY cr.id`,
      [req.tenant_id]
    );

    const resultado = rows.map(r => {
      const totalEnvios = Number(r.total_envios) || 0;
      const pontualidade = totalEnvios > 0 ? (Number(r.no_prazo) / totalEnvios) * 100 : null;
      const taxaOcorrencia = totalEnvios > 0 ? (Number(r.ocorrencias) / totalEnvios) * 100 : null;

      let score = null;
      if (totalEnvios > 0) {
        score = Number((((pontualidade ?? 0) + (100 - (taxaOcorrencia ?? 0))) / 2).toFixed(1));
      }

      return {
        id: r.id,
        nome: r.nome,
        total_envios: totalEnvios,
        pontualidade_pct: pontualidade != null ? Number(pontualidade.toFixed(1)) : null,
        taxa_ocorrencia_pct: taxaOcorrencia != null ? Number(taxaOcorrencia.toFixed(1)) : null,
        frete_medio_real: Number(r.frete_medio_real).toFixed(2),
        score,
      };
    });

    resultado.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular score de transportadoras", details: err.message });
  }
};

// ── Cotacao/comparacao simples entre transportadoras cadastradas (Secao 13) ──
exports.compararFretes = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nome, custo_medio, prazo_medio_dias FROM logistics_carriers WHERE tenant_id = ? AND ativo = TRUE ORDER BY custo_medio ASC",
      [req.tenant_id]
    );
    if (rows.length === 0) {
      return res.json({ aviso: "Nenhuma transportadora cadastrada com custo/prazo medio definidos.", opcoes: [] });
    }
    res.json({ opcoes: rows });
  } catch (err) {
    res.status(500).json({ error: "Erro ao comparar fretes", details: err.message });
  }
};

// ── Indicadores (KPIs) - Secao 30 do documento ──
exports.indicadores = async (req, res) => {
  try {
    const tenantId = req.tenant_id;

    const [[otif]] = await pool.query(
      `SELECT
         COUNT(*) AS total_entregues,
         SUM(CASE WHEN data_prevista IS NOT NULL AND DATE(data_entrega) <= data_prevista THEN 1 ELSE 0 END) AS no_prazo
       FROM logistics_shipments WHERE tenant_id = ? AND status = 'entregue'`,
      [tenantId]
    );
    const otifPct = otif.total_entregues > 0 ? Number(((otif.no_prazo / otif.total_entregues) * 100).toFixed(1)) : null;

    const [[tempoMedio]] = await pool.query(
      `SELECT AVG(TIMESTAMPDIFF(HOUR, separacao_inicio, separacao_fim)) AS horas_separacao_media,
              AVG(TIMESTAMPDIFF(HOUR, created_at, data_despacho)) AS horas_expedicao_media
       FROM logistics_shipments WHERE tenant_id = ? AND separacao_fim IS NOT NULL`,
      [tenantId]
    );

    const [[devolucoes]] = await pool.query(
      `SELECT COUNT(*) AS total FROM logistics_returns r
       JOIN logistics_shipments s ON s.id = r.shipment_id
       WHERE r.tenant_id = ?`,
      [tenantId]
    );
    const [[totalEnvios]] = await pool.query("SELECT COUNT(*) AS total FROM logistics_shipments WHERE tenant_id = ?", [tenantId]);
    const taxaDevolucao = totalEnvios.total > 0 ? Number(((devolucoes.total / totalEnvios.total) * 100).toFixed(1)) : null;

    const [[ocorrencias]] = await pool.query(
      "SELECT COUNT(*) AS total FROM logistics_shipments WHERE tenant_id = ? AND status IN ('extraviado','problema_transporte')",
      [tenantId]
    );
    const taxaOcorrencia = totalEnvios.total > 0 ? Number(((ocorrencias.total / totalEnvios.total) * 100).toFixed(1)) : null;

    res.json({
      otif_pct: otifPct,
      tempo_medio_separacao_horas: tempoMedio.horas_separacao_media != null ? Number(tempoMedio.horas_separacao_media).toFixed(1) : null,
      tempo_medio_expedicao_horas: tempoMedio.horas_expedicao_media != null ? Number(tempoMedio.horas_expedicao_media).toFixed(1) : null,
      taxa_devolucao_pct: taxaDevolucao,
      taxa_ocorrencia_pct: taxaOcorrencia,
      total_envios: totalEnvios.total,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular indicadores", details: err.message });
  }
};

// ── Custo Logistico Real - Secao 27 do documento ──
exports.custos = async (req, res) => {
  try {
    const tenantId = req.tenant_id;

    const [[custoFrete]] = await pool.query(
      "SELECT COALESCE(SUM(frete_valor), 0) AS total FROM logistics_shipments WHERE tenant_id = ?",
      [tenantId]
    );
    const [[custoEmbalagem]] = await pool.query(
      "SELECT COALESCE(SUM(embalagem_custo), 0) AS total FROM logistics_shipments WHERE tenant_id = ?",
      [tenantId]
    );
    const [[custoReversa]] = await pool.query(
      "SELECT COALESCE(SUM(custo_logistica_reversa), 0) AS total FROM logistics_returns WHERE tenant_id = ?",
      [tenantId]
    );

    const custoTotal = Number(custoFrete.total) + Number(custoEmbalagem.total) + Number(custoReversa.total);

    const [porTransportadora] = await pool.query(
      `SELECT cr.nome, COALESCE(SUM(s.frete_valor), 0) AS custo_frete, COUNT(s.id) AS total_envios
       FROM logistics_carriers cr
       LEFT JOIN logistics_shipments s ON s.carrier_id = cr.id
       WHERE cr.tenant_id = ? GROUP BY cr.id`,
      [tenantId]
    );

    res.json({
      custo_frete_total: Number(custoFrete.total).toFixed(2),
      custo_embalagem_total: Number(custoEmbalagem.total).toFixed(2),
      custo_logistica_reversa_total: Number(custoReversa.total).toFixed(2),
      custo_logistico_total: custoTotal.toFixed(2),
      por_transportadora: porTransportadora.map(t => ({ ...t, custo_frete: Number(t.custo_frete).toFixed(2) })),
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular custos logisticos", details: err.message });
  }
};

// ── Previsao de Ruptura (Secao 21) ──
exports.previsaoRuptura = async (req, res) => {
  try {
    const tenantId = req.tenant_id;
    const diasAnalise = 30;

    const [rows] = await pool.query(
      `SELECT p.id, p.nome, p.estoque,
              COALESCE(SUM(oi.quantidade), 0) / ? AS venda_media_diaria
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelado' AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       WHERE p.tenant_id = ? AND p.ativo = TRUE
       GROUP BY p.id
       HAVING venda_media_diaria > 0`,
      [diasAnalise, diasAnalise, tenantId]
    );

    const resultado = rows.map(p => {
      const coberturaDias = Number(p.venda_media_diaria) > 0 ? p.estoque / Number(p.venda_media_diaria) : null;
      let risco = "baixo";
      if (coberturaDias !== null) {
        if (coberturaDias <= 3) risco = "alto";
        else if (coberturaDias <= 7) risco = "medio";
      }
      return {
        id: p.id,
        nome: p.nome,
        estoque_atual: p.estoque,
        venda_media_diaria: Number(p.venda_media_diaria).toFixed(2),
        cobertura_dias: coberturaDias != null ? Number(coberturaDias.toFixed(1)) : null,
        risco,
      };
    }).filter(p => p.risco !== "baixo").sort((a, b) => a.cobertura_dias - b.cobertura_dias);

    res.json({ produtos_em_risco: resultado, periodo_analise_dias: diasAnalise });
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular previsao de ruptura", details: err.message });
  }
};

// ── Alertas Logisticos (Secao 22) ──
exports.alertas = async (req, res) => {
  try {
    const tenantId = req.tenant_id;
    const alertas = [];

    const [atrasados] = await pool.query(
      `SELECT s.id, s.order_id, s.data_prevista, c.nome AS customer_nome
       FROM logistics_shipments s
       LEFT JOIN orders o ON o.id = s.order_id
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE s.tenant_id = ? AND s.data_prevista < CURDATE() AND s.status NOT IN ('entregue','cancelado','devolvido')`,
      [tenantId]
    );
    atrasados.forEach(a => alertas.push({
      severidade: "critico", tipo: "pedido_atrasado",
      titulo: `Envio #${a.id} atrasado`, descricao: `Pedido de ${a.customer_nome || "cliente"} previsto para ${a.data_prevista}`,
      entidade_id: a.id,
    }));

    const [rupturaAlta] = await pool.query(
      `SELECT p.id, p.nome, p.estoque FROM products p WHERE p.tenant_id = ? AND p.ativo = TRUE AND p.estoque <= 5`,
      [tenantId]
    );
    rupturaAlta.forEach(p => alertas.push({
      severidade: "critico", tipo: "estoque_critico",
      titulo: `${p.nome} com estoque critico`, descricao: `Apenas ${p.estoque} unidade(s) em estoque`,
      entidade_id: p.id,
    }));

    const [[extraviados]] = await pool.query(
      "SELECT COUNT(*) AS total FROM logistics_shipments WHERE tenant_id = ? AND status = 'extraviado'",
      [tenantId]
    );
    if (extraviados.total > 0) {
      alertas.push({ severidade: "critico", tipo: "extravio", titulo: `${extraviados.total} envio(s) extraviado(s)`, descricao: "Requer acao imediata", entidade_id: null });
    }

    res.json({ total: alertas.length, alertas });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar alertas logisticos", details: err.message });
  }
};

  // ── Simulador Logistico (Secao 31) ──
// Nao persiste nada no banco por padrao - so calcula o impacto estimado a
// partir dos dados medios reais ja calculados em indicadores()/custos().
// Reaproveita os mesmos numeros, nao inventa dado novo.
exports.simular = async (req, res) => {
  try {
    const { tipo, parametros } = req.body;
    const tenantId = req.tenant_id;

    const [[baseFrete]] = await pool.query(
      "SELECT COALESCE(AVG(frete_valor), 0) AS frete_medio, COUNT(*) AS total_envios FROM logistics_shipments WHERE tenant_id = ?",
      [tenantId]
    );
    const [[baseCusto]] = await pool.query(
      "SELECT COALESCE(SUM(frete_valor), 0) AS custo_frete_total FROM logistics_shipments WHERE tenant_id = ?",
      [tenantId]
    );

    const freteMedioAtual = Number(baseFrete.frete_medio);
    const custoAtualTotal = Number(baseCusto.custo_frete_total);
    const totalEnviosAtual = baseFrete.total_envios;

    let resultado;

    if (tipo === "troca_transportadora") {
      const { novo_frete_medio } = parametros;
      if (novo_frete_medio == null) return res.status(400).json({ error: "novo_frete_medio e obrigatorio para este tipo de simulacao" });
      const custoEstimadoNovo = Number(novo_frete_medio) * totalEnviosAtual;
      resultado = {
        frete_medio_atual: freteMedioAtual.toFixed(2),
        frete_medio_simulado: Number(novo_frete_medio).toFixed(2),
        custo_total_atual: custoAtualTotal.toFixed(2),
        custo_total_simulado: custoEstimadoNovo.toFixed(2),
        impacto: (custoEstimadoNovo - custoAtualTotal).toFixed(2),
      };
    } else if (tipo === "aumento_volume") {
      const { percentual_aumento } = parametros;
      if (percentual_aumento == null) return res.status(400).json({ error: "percentual_aumento e obrigatorio" });
      const novoVolume = Math.round(totalEnviosAtual * (1 + Number(percentual_aumento) / 100));
      const custoEstimado = freteMedioAtual * novoVolume;
      resultado = {
        volume_atual: totalEnviosAtual,
        volume_simulado: novoVolume,
        custo_total_atual: custoAtualTotal.toFixed(2),
        custo_total_simulado: custoEstimado.toFixed(2),
        impacto: (custoEstimado - custoAtualTotal).toFixed(2),
      };
    } else if (tipo === "aumento_frete") {
      const { percentual_aumento } = parametros;
      if (percentual_aumento == null) return res.status(400).json({ error: "percentual_aumento e obrigatorio" });
      const novoFreteMedio = freteMedioAtual * (1 + Number(percentual_aumento) / 100);
      const custoEstimado = novoFreteMedio * totalEnviosAtual;
      resultado = {
        frete_medio_atual: freteMedioAtual.toFixed(2),
        frete_medio_simulado: novoFreteMedio.toFixed(2),
        custo_total_atual: custoAtualTotal.toFixed(2),
        custo_total_simulado: custoEstimado.toFixed(2),
        impacto: (custoEstimado - custoAtualTotal).toFixed(2),
      };
    } else {
      return res.status(400).json({ error: "tipo deve ser: troca_transportadora, aumento_volume ou aumento_frete" });
    }

    res.json({ tipo, parametros, resultado, base_real: { frete_medio_atual: freteMedioAtual.toFixed(2), total_envios_atual: totalEnviosAtual } });
  } catch (err) {
    res.status(500).json({ error: "Erro ao simular cenario logistico", details: err.message });
  }
};