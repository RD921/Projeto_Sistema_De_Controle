const pool = require("../config/db");

exports.listarRegras = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, cc.nome AS cost_center_nome
       FROM financial_automation_rules r
       LEFT JOIN cost_centers cc ON cc.id = r.condicao_cost_center_id
       WHERE r.tenant_id = ?
       ORDER BY r.ordem ASC`,
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar regras", details: err.message });
  }
};

exports.criarRegra = async (req, res) => {
  try {
    const {
      nome, ordem, condicao_tipo, condicao_categoria, condicao_cost_center_id,
      condicao_valor_operador, condicao_valor_min, condicao_valor_max, acao,
    } = req.body;

    if (!nome || !acao) return res.status(400).json({ error: "nome e acao são obrigatórios" });

    const [result] = await pool.query(
      `INSERT INTO financial_automation_rules
        (tenant_id, nome, ordem, condicao_tipo, condicao_categoria, condicao_cost_center_id,
         condicao_valor_operador, condicao_valor_min, condicao_valor_max, acao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenant_id, nome, ordem || 0, condicao_tipo || null, condicao_categoria || null, condicao_cost_center_id || null,
        condicao_valor_operador || null, condicao_valor_min || null, condicao_valor_max || null, acao,
      ]
    );
    res.status(201).json({ id: result.insertId, message: "Regra criada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar regra", details: err.message });
  }
};

exports.atualizarRegra = async (req, res) => {
  try {
    const { id } = req.params;
    const { ativo } = req.body;
    const [result] = await pool.query(
      "UPDATE financial_automation_rules SET ativo = ? WHERE id = ? AND tenant_id = ?",
      [ativo, id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Regra não encontrada" });
    res.json({ message: "Regra atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar regra", details: err.message });
  }
};

exports.excluirRegra = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "DELETE FROM financial_automation_rules WHERE id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Regra não encontrada" });
    res.json({ message: "Regra excluída" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir regra", details: err.message });
  }
};

exports.listarLogs = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.*, r.nome AS regra_nome, fe.descricao AS lancamento_descricao, fe.valor AS lancamento_valor
       FROM financial_automation_logs l
       LEFT JOIN financial_automation_rules r ON r.id = l.rule_id
       JOIN financial_entries fe ON fe.id = l.financial_entry_id
       WHERE l.tenant_id = ?
       ORDER BY l.created_at DESC
       LIMIT 100`,
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar logs", details: err.message });
  }
};