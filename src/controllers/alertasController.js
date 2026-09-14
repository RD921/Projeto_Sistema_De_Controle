const pool = require("../config/db");
const { gerarAlertas } = require("../services/alertasService");

exports.listar = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM financial_alerts WHERE tenant_id = ? AND resolvido = FALSE
       ORDER BY FIELD(severidade, 'critico','importante','atencao','normal'), created_at DESC`,
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar alertas", details: err.message });
  }
};

exports.revarrer = async (req, res) => {
  try {
    const qtd = await gerarAlertas(req.tenant_id);
    res.json({ message: `${qtd} alerta(s) identificado(s)`, quantidade: qtd });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar alertas", details: err.message });
  }
};

exports.marcarLido = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE financial_alerts SET lido = TRUE WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    res.json({ message: "Alerta marcado como lido" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar alerta", details: err.message });
  }
};

exports.resolver = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE financial_alerts SET resolvido = TRUE WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    res.json({ message: "Alerta resolvido" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao resolver alerta", details: err.message });
  }
};