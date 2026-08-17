const pool = require("../config/db");
function getDateRange(req) {
  const end = req.query.end_date ? new Date(req.query.end_date) : new Date();
  const start = req.query.start_date
    ? new Date(req.query.start_date)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
function getGroupBy(req) {
  const allowed = ["day", "week", "month"];
  const group = req.query.group_by || "day";
  return allowed.includes(group) ? group : "day";
}
exports.salesReport = async (req, res) => {
  try {
    const { start, end } = getDateRange(req);
    const groupBy = getGroupBy(req);
    const groupExpr = {
      day: "DATE(o.created_at)",
      week: "YEARWEEK(o.created_at, 1)",
      month: "DATE_FORMAT(o.created_at, '%Y-%m')"
    }[groupBy];
    const [rows] = await pool.query(
      `SELECT
        ${groupExpr} as periodo,
        COUNT(o.id) as total_pedidos,
        SUM(o.total) as receita_total,
        ROUND(AVG(o.total), 2) as ticket_medio,
        COUNT(DISTINCT o.customer_id) as clientes_unicos
       FROM orders o
       WHERE o.created_at BETWEEN ? AND ?
         AND o.status != 'cancelado'
       GROUP BY ${groupExpr}
       ORDER BY periodo`,
      [start, end]
    );
    const [summary] = await pool.query(
      `SELECT
        COUNT(id) as total_pedidos,
        SUM(total) as receita_total,
        ROUND(AVG(total), 2) as ticket_medio,
        COUNT(DISTINCT customer_id) as clientes_unicos,
        SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) as cancelados
       FROM orders
       WHERE created_at BETWEEN ? AND ?`,
      [start, end]
    );
    res.json({
      tipo: "vendas",
      periodo: { start, end, group_by: groupBy },
      resumo: summary[0],
      dados: rows
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar relatorio de vendas", details: err.message });
  }
};
exports.marketingReport = async (req, res) => {
  try {
    const { start, end } = getDateRange(req);
    const limit = parseInt(req.query.limit) || 20;
    const [topCustomers] = await pool.query(
      `SELECT
        c.id, c.nome, c.email,
        COUNT(o.id) as total_pedidos,
        COALESCE(SUM(o.total), 0) as valor_total,
        ROUND(AVG(o.total), 2) as ticket_medio,
        MAX(o.created_at) as ultimo_pedido
       FROM customers c
       LEFT JOIN orders o ON o.customer_id = c.id
         AND o.status != 'cancelado'
         AND o.created_at BETWEEN ? AND ?
       GROUP BY c.id
       ORDER BY valor_total DESC
       LIMIT ?`,
      [start, end, limit]
    );
    const [newCustomers] = await pool.query(
      `SELECT COUNT(*) as novos_clientes
       FROM customers
       WHERE created_at BETWEEN ? AND ?`,
      [start, end]
    );
    const [retention] = await pool.query(
      `SELECT
        COUNT(DISTINCT customer_id) as clientes_recorrentes
       FROM orders
       WHERE status != 'cancelado'
       GROUP BY customer_id
       HAVING COUNT(id) > 1`
    );
    res.json({
      tipo: "marketing",
      periodo: { start, end },
      resumo: {
        novos_clientes: newCustomers[0].novos_clientes,
        clientes_recorrentes: retention.length,
        top_clientes: topCustomers.length
      },
      top_clientes: topCustomers
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar relatorio de marketing", details: err.message });
  }
};
exports.logisticsReport = async (req, res) => {
  try {
    const { start, end } = getDateRange(req);
    const lowStockThreshold = parseInt(req.query.low_stock) || 5;

    const [inventory] = await pool.query(
      `SELECT
        p.id, p.nome, p.sku, p.estoque, p.preco,
        ROUND(p.preco * p.estoque, 2) as valor_em_estoque,
        COALESCE(SUM(oi.quantidade), 0) as unidades_vendidas,
        CASE WHEN p.estoque <= ? THEN true ELSE false END as estoque_baixo
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o ON o.id = oi.order_id
         AND o.status != 'cancelado'
         AND o.created_at BETWEEN ? AND ?
       WHERE p.ativo = TRUE
       GROUP BY p.id
       ORDER BY p.estoque ASC`,
      [lowStockThreshold, start, end]
    );

    const [ordersByStatus] = await pool.query(
      `SELECT status, COUNT(*) as total
       FROM orders
       WHERE created_at BETWEEN ? AND ?
       GROUP BY status`,
      [start, end]
    );

    const lowStock = inventory.filter(p => p.estoque_baixo);

    res.json({
      tipo: "logistica",
      periodo: { start, end },
      resumo: {
        total_produtos: inventory.length,
        produtos_estoque_baixo: lowStock.length,
        valor_total_estoque: inventory.reduce((acc, p) => acc + parseFloat(p.valor_em_estoque), 0).toFixed(2)
      },
      status_pedidos: ordersByStatus,
      estoque_baixo: lowStock,
      inventario: inventory
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar relatorio de logistica", details: err.message });
  }
};

exports.productsReport = async (req, res) => {
  try {
    const { start, end } = getDateRange(req);
    const limit = parseInt(req.query.limit) || 20;

    const [products] = await pool.query(
      `SELECT
        p.id, p.nome, p.sku, p.preco, p.estoque,
        COALESCE(SUM(oi.quantidade), 0) as unidades_vendidas,
        COALESCE(SUM(oi.quantidade * oi.preco_unitario), 0) as receita_gerada,
        COUNT(DISTINCT o.customer_id) as clientes_distintos
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o ON o.id = oi.order_id
         AND o.status != 'cancelado'
         AND o.created_at BETWEEN ? AND ?
       GROUP BY p.id
       ORDER BY receita_gerada DESC
       LIMIT ?`,
      [start, end, limit]
    );

    res.json({
      tipo: "produtos",
      periodo: { start, end },
      resumo: {
        total_produtos: products.length,
        receita_total: products.reduce((acc, p) => acc + parseFloat(p.receita_gerada), 0).toFixed(2),
        mais_vendido: products[0] || null
      },
      produtos: products
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar relatorio de produtos", details: err.message });
  }
};

exports.marketplacesReport = async (req, res) => {
  try {
    const { start, end } = getDateRange(req);

    const [mlData] = await pool.query(
      `SELECT
        marketplace,
        COUNT(*) as total_pedidos,
        COALESCE(SUM(total), 0) as receita_total,
        ROUND(AVG(total), 2) as ticket_medio,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as pagos,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelados
       FROM marketplace_orders
       WHERE synced_at BETWEEN ? AND ?
       GROUP BY marketplace`,
      [start, end]
    );

    const [internalData] = await pool.query(
      `SELECT
        'ecomflow' as marketplace,
        COUNT(*) as total_pedidos,
        COALESCE(SUM(total), 0) as receita_total,
        ROUND(AVG(total), 2) as ticket_medio
       FROM orders
       WHERE created_at BETWEEN ? AND ?
         AND status != 'cancelado'`,
      [start, end]
    );

    res.json({
      tipo: "marketplaces",
      periodo: { start, end },
      canais: [...internalData, ...mlData]
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar relatorio de marketplaces", details: err.message });
  }
};