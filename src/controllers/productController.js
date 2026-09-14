const pool = require("../config/db");
exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const tid = req.tenant_id;
    const [[countRows], [rows]] = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM products WHERE tenant_id = ?", [tid]),
      pool.query("SELECT id, nome, descricao, sku, preco, estoque, ativo FROM products WHERE tenant_id = ? LIMIT ? OFFSET ?", [tid, limit, offset])
    ]);
    res.json({ data: rows, page, limit, total: countRows[0].total });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar produtos", details: err.message });
  }
};
exports.getProductById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nome, descricao, sku, preco, estoque, ativo FROM products WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Produto nao encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar produto", details: err.message });
  }
};
exports.createProduct = async (req, res) => {
  try {
    const { nome, descricao, sku, preco, estoque } = req.body || {};
    if (!nome || !sku || preco === undefined) {
      return res.status(400).json({ error: "Nome, SKU e preco sao obrigatorios" });
    }
    const [existing] = await pool.query("SELECT id FROM products WHERE sku = ? AND tenant_id = ?", [sku, req.tenant_id]);
    if (existing.length > 0) return res.status(409).json({ error: "SKU ja cadastrado" });
    await pool.query(
      "INSERT INTO products (nome, descricao, sku, preco, estoque, tenant_id) VALUES (?, ?, ?, ?, ?, ?)",
      [nome, descricao || null, sku, preco, estoque || 0, req.tenant_id]
    );
    res.status(201).json({ message: "Produto criado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar produto", details: err.message });
  }
};
exports.updateProduct = async (req, res) => {
  try {
    // O campo "estoque" nao pode mais ser alterado por esta rota - toda mudanca
    // de estoque precisa passar por /api/stock/:id/ajustar, que registra o
    // historico rastreavel (stock_movements) e dispara os eventos corretos.
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, "estoque")) {
      return res.status(400).json({
        error: "Alteracao de estoque nao e permitida por esta rota. Use POST /api/stock/:id/ajustar para registrar entrada, saida ou ajuste com motivo.",
      });
    }

    const { nome, descricao, preco, ativo } = req.body || {};
    const [existing] = await pool.query("SELECT id FROM products WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (existing.length === 0) return res.status(404).json({ error: "Produto nao encontrado" });
    await pool.query(
      "UPDATE products SET nome = COALESCE(?, nome), descricao = COALESCE(?, descricao), preco = COALESCE(?, preco), ativo = COALESCE(?, ativo) WHERE id = ? AND tenant_id = ?",
      [nome, descricao, preco, ativo, req.params.id, req.tenant_id]
    );
    res.json({ message: "Produto atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar produto", details: err.message });
  }
};
exports.deleteProduct = async (req, res) => {
  try {
    const [existing] = await pool.query("SELECT id FROM products WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (existing.length === 0) return res.status(404).json({ error: "Produto nao encontrado" });
    await pool.query("DELETE FROM products WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    res.json({ message: "Produto removido com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao remover produto", details: err.message });
  }
};