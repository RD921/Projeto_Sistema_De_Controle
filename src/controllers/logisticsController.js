const pool = require("../config/db");

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
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar deposito", details: err.message });
  }
};

exports.desativarDeposito = async (req, res) => {
  try {
    await pool.query("UPDATE logistics_warehouses SET ativo = FALSE WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
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
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar transportadora", details: err.message });
  }
};

exports.desativarTransportadora = async (req, res) => {
  try {
    await pool.query("UPDATE logistics_carriers SET ativo = FALSE WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
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

    res.json({ message: "Status do envio atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao mudar status do envio", details: err.message });
  }
};

exports.registrarRastreio = async (req, res) => {
  try {
    const { tracking_code } = req.body;
    await pool.query("UPDATE logistics_shipments SET tracking_code = ? WHERE id = ? AND tenant_id = ?", [tracking_code, req.params.id, req.tenant_id]);
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