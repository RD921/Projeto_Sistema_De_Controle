const pool = require("../config/db");

exports.getTenants = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [[countRows], [rows]] = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM tenants"),
      pool.query(
        `SELECT t.id, t.nome, t.email, t.ativo, t.trial_ends_at, t.created_at,
                p.nome as plano, p.preco_mensal
         FROM tenants t
         JOIN plans p ON p.id = t.plan_id
         ORDER BY t.created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      )
    ]);

    res.json({ data: rows, page, limit, total: countRows[0].total });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar tenants", details: err.message });
  }
};

exports.getTenantById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, p.nome as plano, p.preco_mensal, p.limite_produtos,
              p.limite_pedidos_mes, p.limite_usuarios, p.marketplaces_permitidos
       FROM tenants t
       JOIN plans p ON p.id = t.plan_id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Tenant nao encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar tenant", details: err.message });
  }
};

exports.updateTenant = async (req, res) => {
  try {
    const { nome, plan_id, ativo } = req.body || {};
    const [existing] = await pool.query("SELECT id FROM tenants WHERE id = ?", [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: "Tenant nao encontrado" });

    await pool.query(
      "UPDATE tenants SET nome = COALESCE(?, nome), plan_id = COALESCE(?, plan_id), ativo = COALESCE(?, ativo) WHERE id = ?",
      [nome, plan_id, ativo, req.params.id]
    );
    res.json({ message: "Tenant atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar tenant", details: err.message });
  }
};

exports.getTenantStats = async (req, res) => {
  try {
    const { id } = req.params;
    const [[users], [products], [customers], [orders]] = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM users WHERE tenant_id = ?", [id]),
      pool.query("SELECT COUNT(*) as total FROM products WHERE tenant_id = ?", [id]),
      pool.query("SELECT COUNT(*) as total FROM customers WHERE tenant_id = ?", [id]),
      pool.query("SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as receita FROM orders WHERE tenant_id = ? AND status != 'cancelado'", [id])
    ]);

    res.json({
      tenant_id: parseInt(id),
      usuarios: users[0].total,
      produtos: products[0].total,
      clientes: customers[0].total,
      pedidos: orders[0].total,
      receita_total: orders[0].receita
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar stats", details: err.message });
  }
};

exports.getMyTenant = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.nome, t.email, t.ativo, t.trial_ends_at, t.created_at,
              p.nome as plano, p.preco_mensal, p.limite_produtos,
              p.limite_pedidos_mes, p.limite_usuarios, p.marketplaces_permitidos
       FROM tenants t
       JOIN plans p ON p.id = t.plan_id
       WHERE t.id = ?`,
      [req.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Tenant nao encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar seu tenant", details: err.message });
  }
};