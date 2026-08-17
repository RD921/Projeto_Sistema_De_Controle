const pool = require("../config/db");
exports.getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const tid = req.tenant_id;
    const [[countRows], [rows]] = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM customers WHERE tenant_id = ?", [tid]),
      pool.query("SELECT id, nome, email, telefone, ativo, created_at FROM customers WHERE tenant_id = ? LIMIT ? OFFSET ?", [tid, limit, offset])
    ]);
    res.json({ data: rows, page, limit, total: countRows[0].total });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar clientes", details: err.message });
  }
};
exports.getCustomerById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nome, email, telefone, ativo, created_at FROM customers WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Cliente nao encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar cliente", details: err.message });
  }
};
exports.createCustomer = async (req, res) => {
  try {
    const { nome, email, telefone } = req.body || {};
    if (!nome || !email) {
      return res.status(400).json({ error: "Nome e email sao obrigatorios" });
    }
    const [existing] = await pool.query("SELECT id FROM customers WHERE email = ? AND tenant_id = ?", [email, req.tenant_id]);
    if (existing.length > 0) return res.status(409).json({ error: "Email ja cadastrado" });
    await pool.query(
      "INSERT INTO customers (nome, email, telefone, tenant_id) VALUES (?, ?, ?, ?)",
      [nome, email, telefone || null, req.tenant_id]
    );
    res.status(201).json({ message: "Cliente criado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar cliente", details: err.message });
  }
};
exports.updateCustomer = async (req, res) => {
  try {
    const { nome, email, telefone, ativo } = req.body || {};
    const [existing] = await pool.query("SELECT id FROM customers WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (existing.length === 0) return res.status(404).json({ error: "Cliente nao encontrado" });
    await pool.query(
      "UPDATE customers SET nome = COALESCE(?, nome), email = COALESCE(?, email), telefone = COALESCE(?, telefone), ativo = COALESCE(?, ativo) WHERE id = ? AND tenant_id = ?",
      [nome, email, telefone, ativo, req.params.id, req.tenant_id]
    );
    res.json({ message: "Cliente atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar cliente", details: err.message });
  }
};
exports.deleteCustomer = async (req, res) => {
  try {
    const [existing] = await pool.query("SELECT id FROM customers WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (existing.length === 0) return res.status(404).json({ error: "Cliente nao encontrado" });
    await pool.query("DELETE FROM customers WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    res.json({ message: "Cliente removido com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao remover cliente", details: err.message });
  }
};