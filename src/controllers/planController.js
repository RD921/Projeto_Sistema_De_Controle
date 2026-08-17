const pool = require("../config/db");
exports.getPlans = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM plans WHERE ativo = TRUE ORDER BY preco_mensal");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar planos", details: err.message });
  }
};
exports.getPlanById = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM plans WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Plano nao encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar plano", details: err.message });
  }
};
exports.createPlan = async (req, res) => {
  try {
    const { nome, descricao, preco_mensal, limite_produtos, limite_pedidos_mes, limite_usuarios, marketplaces_permitidos } = req.body || {};
    if (!nome || preco_mensal === undefined) {
      return res.status(400).json({ error: "Nome e preco_mensal sao obrigatorios" });
    }
    await pool.query(
      "INSERT INTO plans (nome, descricao, preco_mensal, limite_produtos, limite_pedidos_mes, limite_usuarios, marketplaces_permitidos) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [nome, descricao || null, preco_mensal, limite_produtos || 100, limite_pedidos_mes || 500, limite_usuarios || 5, JSON.stringify(marketplaces_permitidos || [])]
    );
    res.status(201).json({ message: "Plano criado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar plano", details: err.message });
  }
};
exports.updatePlan = async (req, res) => {
  try {
    const { nome, descricao, preco_mensal, limite_produtos, limite_pedidos_mes, limite_usuarios, ativo } = req.body || {};
    const [existing] = await pool.query("SELECT id FROM plans WHERE id = ?", [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: "Plano nao encontrado" });
    await pool.query(
      "UPDATE plans SET nome = COALESCE(?, nome), descricao = COALESCE(?, descricao), preco_mensal = COALESCE(?, preco_mensal), limite_produtos = COALESCE(?, limite_produtos), limite_pedidos_mes = COALESCE(?, limite_pedidos_mes), limite_usuarios = COALESCE(?, limite_usuarios), ativo = COALESCE(?, ativo) WHERE id = ?",
      [nome, descricao, preco_mensal, limite_produtos, limite_pedidos_mes, limite_usuarios, ativo, req.params.id]
    );
    res.json({ message: "Plano atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar plano", details: err.message });
  }
};