const pool = require("../config/db");

exports.list = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM sales_channels WHERE tenant_id = ? ORDER BY tipo, nome",
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar canais de venda", details: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { tipo, nome, taxa_media_percentual, prazo_medio_dias } = req.body || {};
    const tiposValidos = ["loja_fisica", "site", "marketplace", "rede_social", "outro"];
    if (!tipo || !tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: `tipo deve ser um de: ${tiposValidos.join(", ")}` });
    }
    if (!nome) return res.status(400).json({ error: "nome é obrigatório" });

    const [result] = await pool.query(
      "INSERT INTO sales_channels (tenant_id, tipo, nome, taxa_media_percentual, prazo_medio_dias) VALUES (?, ?, ?, ?, ?)",
      [req.tenant_id, tipo, nome, taxa_media_percentual || null, prazo_medio_dias || null]
    );
    res.status(201).json({ message: "Canal criado com sucesso", id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar canal de venda", details: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { nome, ativo, taxa_media_percentual, prazo_medio_dias } = req.body || {};
    const [existing] = await pool.query("SELECT id FROM sales_channels WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (existing.length === 0) return res.status(404).json({ error: "Canal não encontrado" });

    await pool.query(
      "UPDATE sales_channels SET nome = COALESCE(?, nome), ativo = COALESCE(?, ativo), taxa_media_percentual = ?, prazo_medio_dias = ? WHERE id = ? AND tenant_id = ?",
      [nome || null, ativo === undefined ? null : ativo, taxa_media_percentual ?? null, prazo_medio_dias ?? null, req.params.id, req.tenant_id]
    );
    res.json({ message: "Canal atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar canal de venda", details: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const [existing] = await pool.query("SELECT id FROM sales_channels WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (existing.length === 0) return res.status(404).json({ error: "Canal não encontrado" });
    await pool.query("UPDATE sales_channels SET ativo = FALSE WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    res.json({ message: "Canal desativado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao remover canal de venda", details: err.message });
  }
};