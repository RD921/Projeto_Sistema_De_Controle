const pool = require("../config/db");

exports.listarRegras = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM marketing_scoring_rules WHERE tenant_id = ? ORDER BY event_type", [req.tenant_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar regras", details: err.message });
  }
};

exports.criarRegra = async (req, res) => {
  try {
    const { event_type, pontos, descricao } = req.body;
    if (!event_type || typeof pontos !== "number") return res.status(400).json({ error: "event_type e pontos (numero) sao obrigatorios" });
    const [result] = await pool.query(
      "INSERT INTO marketing_scoring_rules (tenant_id, event_type, pontos, descricao) VALUES (?, ?, ?, ?)",
      [req.tenant_id, event_type, pontos, descricao || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar regra", details: err.message });
  }
};

exports.atualizarRegra = async (req, res) => {
  try {
    const { ativa, pontos } = req.body;
    const campos = [];
    const valores = [];
    if (typeof ativa === "boolean") { campos.push("ativa = ?"); valores.push(ativa); }
    if (typeof pontos === "number") { campos.push("pontos = ?"); valores.push(pontos); }
    if (campos.length === 0) return res.status(400).json({ error: "nada para atualizar" });

    valores.push(req.params.id, req.tenant_id);
    const [result] = await pool.query(`UPDATE marketing_scoring_rules SET ${campos.join(", ")} WHERE id = ? AND tenant_id = ?`, valores);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Regra nao encontrada" });
    res.json({ message: "Regra atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar regra", details: err.message });
  }
};

exports.excluirRegra = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM marketing_scoring_rules WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Regra nao encontrada" });
    res.json({ message: "Regra excluida" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir regra", details: err.message });
  }
};

exports.historicoDoLead = async (req, res) => {
  try {
    const [[lead]] = await pool.query("SELECT id FROM marketing_leads WHERE id = ? AND tenant_id = ?", [req.params.leadId, req.tenant_id]);
    if (!lead) return res.status(404).json({ error: "Lead nao encontrado" });

    const [rows] = await pool.query(
      "SELECT * FROM marketing_lead_score_history WHERE lead_id = ? ORDER BY created_at DESC",
      [req.params.leadId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar historico", details: err.message });
  }
};