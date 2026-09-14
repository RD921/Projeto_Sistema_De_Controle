const pool = require("../config/db");

// ── RENTABILIDADE POR PRODUTO ──
exports.porProduto = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.nome, p.sku,
         SUM(oi.quantidade) AS unidades_vendidas,
         SUM(oi.quantidade * oi.preco_unitario) AS receita,
         SUM(oi.quantidade * p.custo_unitario) AS custo,
         SUM(
           (oi.quantidade * oi.preco_unitario / NULLIF(ofb.receita_bruta, 0)) *
           (ofb.comissao_marketplace + ofb.taxa_gateway + ofb.frete + ofb.impostos)
         ) AS taxas_alocadas
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       JOIN order_financial_breakdown ofb ON ofb.order_id = oi.order_id AND ofb.tenant_id = ?
       WHERE p.tenant_id = ?
       GROUP BY p.id, p.nome, p.sku
       ORDER BY (receita - custo - taxas_alocadas) DESC`,
      [req.tenant_id, req.tenant_id]
    );

    const resultado = rows.map(r => {
      const receita = Number(r.receita);
      const custo = Number(r.custo);
      const taxas = Number(r.taxas_alocadas) || 0;
      const lucro = receita - custo - taxas;
      return {
        id: r.id, nome: r.nome, sku: r.sku,
        unidades_vendidas: r.unidades_vendidas,
        receita: receita.toFixed(2), custo: custo.toFixed(2), taxas_alocadas: taxas.toFixed(2),
        lucro: lucro.toFixed(2),
        margem_percentual: receita > 0 ? ((lucro / receita) * 100).toFixed(1) : "0.0",
      };
    });

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular rentabilidade por produto", details: err.message });
  }
};

// ── RENTABILIDADE POR CLIENTE ──
exports.porCliente = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.nome, c.email,
         COUNT(DISTINCT o.id) AS qtd_pedidos,
         SUM(ofb.receita_bruta) AS receita,
         SUM(ofb.custo_produtos) AS custo,
         SUM(ofb.comissao_marketplace + ofb.taxa_gateway + ofb.frete + ofb.impostos) AS taxas,
         SUM(ofb.lucro_liquido) AS lucro
       FROM order_financial_breakdown ofb
       JOIN orders o ON o.id = ofb.order_id
       JOIN customers c ON c.id = o.customer_id
       WHERE ofb.tenant_id = ?
       GROUP BY c.id, c.nome, c.email
       ORDER BY lucro DESC`,
      [req.tenant_id]
    );

    const resultado = rows.map(r => {
      const receita = Number(r.receita);
      const lucro = Number(r.lucro);
      return {
        id: r.id, nome: r.nome, email: r.email, qtd_pedidos: r.qtd_pedidos,
        receita: receita.toFixed(2), custo: Number(r.custo).toFixed(2), taxas: Number(r.taxas).toFixed(2),
        lucro: lucro.toFixed(2),
        margem_percentual: receita > 0 ? ((lucro / receita) * 100).toFixed(1) : "0.0",
      };
    });

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular rentabilidade por cliente", details: err.message });
  }
};

// ── RENTABILIDADE POR CANAL/MARKETPLACE ──
exports.porCanal = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.canal,
         COUNT(DISTINCT o.id) AS qtd_pedidos,
         SUM(ofb.receita_bruta) AS receita,
         SUM(ofb.custo_produtos) AS custo,
         SUM(ofb.comissao_marketplace + ofb.taxa_gateway + ofb.frete + ofb.impostos) AS taxas,
         SUM(ofb.lucro_liquido) AS lucro
       FROM order_financial_breakdown ofb
       JOIN orders o ON o.id = ofb.order_id
       WHERE ofb.tenant_id = ?
       GROUP BY o.canal
       ORDER BY lucro DESC`,
      [req.tenant_id]
    );

    const resultado = rows.map(r => {
      const receita = Number(r.receita);
      const lucro = Number(r.lucro);
      return {
        canal: r.canal, qtd_pedidos: r.qtd_pedidos,
        receita: receita.toFixed(2), custo: Number(r.custo).toFixed(2), taxas: Number(r.taxas).toFixed(2),
        lucro: lucro.toFixed(2),
        margem_percentual: receita > 0 ? ((lucro / receita) * 100).toFixed(1) : "0.0",
      };
    });

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular rentabilidade por canal", details: err.message });
  }
};

// ── RENTABILIDADE POR PERÍODO (mês) ──
exports.porPeriodo = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(o.created_at, '%Y-%m') AS mes,
         COUNT(DISTINCT o.id) AS qtd_pedidos,
         SUM(ofb.receita_bruta) AS receita,
         SUM(ofb.custo_produtos) AS custo,
         SUM(ofb.comissao_marketplace + ofb.taxa_gateway + ofb.frete + ofb.impostos) AS taxas,
         SUM(ofb.lucro_liquido) AS lucro
       FROM order_financial_breakdown ofb
       JOIN orders o ON o.id = ofb.order_id
       WHERE ofb.tenant_id = ?
       GROUP BY mes
       ORDER BY mes DESC`,
      [req.tenant_id]
    );

    const resultado = rows.map(r => {
      const receita = Number(r.receita);
      const lucro = Number(r.lucro);
      return {
        mes: r.mes, qtd_pedidos: r.qtd_pedidos,
        receita: receita.toFixed(2), custo: Number(r.custo).toFixed(2), taxas: Number(r.taxas).toFixed(2),
        lucro: lucro.toFixed(2),
        margem_percentual: receita > 0 ? ((lucro / receita) * 100).toFixed(1) : "0.0",
      };
    });

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular rentabilidade por período", details: err.message });
  }
};