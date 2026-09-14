const pool = require("../config/db");
const eventDispatcher = require("../automation/engine/EventDispatcher");
const { aplicarRegras } = require("../services/marketingScoringService");

exports.listar = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = "SELECT * FROM marketing_leads WHERE tenant_id = ?";
    const params = [req.tenant_id];
    if (status) { sql += " AND status = ?"; params.push(status); }
    sql += " ORDER BY created_at DESC LIMIT 100";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar leads", details: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { nome, email, telefone, empresa, origem, canal } = req.body;
    if (!nome) return res.status(400).json({ error: "nome e obrigatorio" });

    const [result] = await pool.query(
      `INSERT INTO marketing_leads (tenant_id, nome, email, telefone, empresa, origem, canal)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.tenant_id, nome, email || null, telefone || null, empresa || null, origem || null, canal || null]
    );

    const leadId = result.insertId;

    try {
      await eventDispatcher.dispatch("lead_created", req.tenant_id, {
        lead_id: leadId, nome, email, origem, canal,
      });
    } catch { /* nao bloqueia a criacao por erro de automacao */ }

    try {
      await aplicarRegras(req.tenant_id, leadId, "lead_created");
    } catch { /* nao bloqueia criacao por erro de scoring */ }

    res.status(201).json({ id: leadId, message: "Lead criado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar lead", details: err.message });
  }
};

exports.atualizarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const statusValidos = ["novo","contactado","engajado","qualificado","oportunidade","cliente","perdido","inativo"];
    if (!statusValidos.includes(status)) return res.status(400).json({ error: "status invalido" });

    const [result] = await pool.query(
      "UPDATE marketing_leads SET status = ? WHERE id = ? AND tenant_id = ?",
      [status, id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Lead nao encontrado" });

    try {
      await eventDispatcher.dispatch("lead_status_changed", req.tenant_id, { lead_id: Number(id), novo_status: status });
    } catch { /* nao bloqueia */ }

    try {
      await aplicarRegras(req.tenant_id, Number(id), `lead_${status}`);
    } catch { /* nao bloqueia */ }

    res.json({ message: "Status atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar status", details: err.message });
  }
};

exports.ajustarScore = async (req, res) => {
  try {
    const { id } = req.params;
    const { delta } = req.body;
    if (typeof delta !== "number") return res.status(400).json({ error: "delta deve ser numerico" });

    const [result] = await pool.query(
      "UPDATE marketing_leads SET score = GREATEST(0, score + ?) WHERE id = ? AND tenant_id = ?",
      [delta, id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Lead nao encontrado" });
    res.json({ message: "Score ajustado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao ajustar score", details: err.message });
  }
};

// Vincula o lead a um customer_id existente (ex: quando o lead vira cliente de verdade).
// Isso e o que permite depois relacionar pedidos desse cliente a campanhas.
exports.vincularCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id } = req.body;
    if (!customer_id) return res.status(400).json({ error: "customer_id e obrigatorio" });

    const [[customer]] = await pool.query("SELECT id FROM customers WHERE id = ? AND tenant_id = ?", [customer_id, req.tenant_id]);
    if (!customer) return res.status(400).json({ error: "customer_id invalido para este tenant" });

    const [result] = await pool.query(
      "UPDATE marketing_leads SET customer_id = ?, status = 'cliente' WHERE id = ? AND tenant_id = ?",
      [customer_id, id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Lead nao encontrado" });

    res.json({ message: "Lead vinculado ao cliente" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao vincular cliente", details: err.message });
  }
};

exports.excluir = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM marketing_leads WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Lead nao encontrado" });
    res.json({ message: "Lead excluido" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir lead", details: err.message });
  }
};