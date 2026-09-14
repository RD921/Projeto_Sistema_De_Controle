const pool = require("../config/db");

exports.listarLogs = async (req, res) => {
  try {
    const { acao, entidade_tipo, limite } = req.query;
    let sql = "SELECT * FROM audit_logs WHERE tenant_id = ?";
    const params = [req.tenant_id];
    if (acao) { sql += " AND acao = ?"; params.push(acao); }
    if (entidade_tipo) { sql += " AND entidade_tipo = ?"; params.push(entidade_tipo); }
    sql += " ORDER BY created_at DESC LIMIT ?";
    params.push(parseInt(limite) || 200);

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar logs de auditoria", details: err.message });
  }
};

exports.getAlcada = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM approval_thresholds WHERE tenant_id = ?", [req.tenant_id]);
    res.json(rows[0] || { valor_minimo: 5000 });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar alçada", details: err.message });
  }
};

exports.salvarAlcada = async (req, res) => {
  try {
    const { valor_minimo } = req.body;
    if (valor_minimo === undefined) return res.status(400).json({ error: "valor_minimo é obrigatório" });

    await pool.query(
      `INSERT INTO approval_thresholds (tenant_id, valor_minimo) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE valor_minimo = VALUES(valor_minimo)`,
      [req.tenant_id, valor_minimo]
    );
    res.json({ message: "Alçada atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar alçada", details: err.message });
  }
};