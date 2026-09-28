const pool = require("../config/db");

exports.list = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, sc.nome AS canal_nome FROM stores s
       LEFT JOIN sales_channels sc ON sc.id = s.sales_channel_id
       WHERE s.tenant_id = ? ORDER BY s.nome`,
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar lojas", details: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { nome, endereco, cidade, estado, sales_channel_id } = req.body || {};
    if (!nome) return res.status(400).json({ error: "nome é obrigatório" });

    if (sales_channel_id) {
      const [canal] = await pool.query("SELECT id FROM sales_channels WHERE id = ? AND tenant_id = ?", [sales_channel_id, req.tenant_id]);
      if (canal.length === 0) return res.status(400).json({ error: "Canal de venda inválido" });
    }

    const [result] = await pool.query(
      "INSERT INTO stores (tenant_id, sales_channel_id, nome, endereco, cidade, estado) VALUES (?, ?, ?, ?, ?, ?)",
      [req.tenant_id, sales_channel_id || null, nome, endereco || null, cidade || null, estado || null]
    );
    res.status(201).json({ message: "Loja criada com sucesso", id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar loja", details: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { nome, endereco, cidade, estado, ativo } = req.body || {};
    const [existing] = await pool.query("SELECT id FROM stores WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (existing.length === 0) return res.status(404).json({ error: "Loja não encontrada" });

    await pool.query(
      "UPDATE stores SET nome = COALESCE(?, nome), endereco = ?, cidade = ?, estado = ?, ativo = COALESCE(?, ativo) WHERE id = ? AND tenant_id = ?",
      [nome || null, endereco ?? null, cidade ?? null, estado ?? null, ativo === undefined ? null : ativo, req.params.id, req.tenant_id]
    );
    res.json({ message: "Loja atualizada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar loja", details: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const [existing] = await pool.query("SELECT id FROM stores WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (existing.length === 0) return res.status(404).json({ error: "Loja não encontrada" });
    await pool.query("UPDATE stores SET ativo = FALSE WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    res.json({ message: "Loja desativada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao remover loja", details: err.message });
  }
};