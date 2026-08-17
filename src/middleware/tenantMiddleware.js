const pool = require("../config/db");
module.exports = async (req, res, next) => {
  try {
    const tenantId = req.tenant_id;
    if (!tenantId) return res.status(403).json({ error: "Tenant nao identificado" });
    const [rows] = await pool.query(
      `SELECT t.*, p.nome as plano, p.limite_produtos, p.limite_pedidos_mes,
              p.limite_usuarios, p.marketplaces_permitidos
       FROM tenants t
       JOIN plans p ON p.id = t.plan_id
       WHERE t.id = ? AND t.ativo = TRUE`,
      [tenantId]
    );
    if (rows.length === 0) return res.status(403).json({ error: "Tenant inativo ou nao encontrado" });
    req.tenant = rows[0];
    next();
  } catch (err) {
    res.status(500).json({ error: "Erro ao validar tenant", details: err.message });
  }
};