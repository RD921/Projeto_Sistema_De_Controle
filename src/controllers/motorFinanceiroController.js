const pool = require("../config/db");

exports.getConfiguracoes = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM financial_settings WHERE tenant_id = ?", [req.tenant_id]);
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar configurações", details: err.message });
  }
};

exports.salvarConfiguracoes = async (req, res) => {
  try {
    const { imposto_padrao_pct, comissao_marketplace_pct, taxa_gateway_pct, frete_medio_pct } = req.body;
    await pool.query(
      `INSERT INTO financial_settings (tenant_id, imposto_padrao_pct, comissao_marketplace_pct, taxa_gateway_pct, frete_medio_pct)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         imposto_padrao_pct = VALUES(imposto_padrao_pct),
         comissao_marketplace_pct = VALUES(comissao_marketplace_pct),
         taxa_gateway_pct = VALUES(taxa_gateway_pct),
         frete_medio_pct = VALUES(frete_medio_pct)`,
      [req.tenant_id, imposto_padrao_pct, comissao_marketplace_pct, taxa_gateway_pct, frete_medio_pct]
    );
    res.json({ message: "Configurações salvas" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar configurações", details: err.message });
  }
};

// Calcula e grava (ou recalcula) o raio-X financeiro de um pedido específico
async function processarPedidoInterno(tenantId, orderId) {
  const [[order]] = await pool.query(
    "SELECT id, total, status FROM orders WHERE id = ? AND tenant_id = ?",
    [orderId, tenantId]
  );
  if (!order) throw new Error("Pedido não encontrado");
  if (order.status !== "pago") throw new Error("Só é possível processar pedidos pagos");

  const [itens] = await pool.query(
    `SELECT oi.quantidade, p.custo_unitario
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`,
    [orderId]
  );
  const custoProdutos = itens.reduce((a, i) => a + (Number(i.custo_unitario) * i.quantidade), 0);

  const [[config]] = await pool.query(
    "SELECT * FROM financial_settings WHERE tenant_id = ?",
    [tenantId]
  );
  const cfg = config || { imposto_padrao_pct: 11.5, comissao_marketplace_pct: 15, taxa_gateway_pct: 3.5, frete_medio_pct: 8 };

  const receitaBruta = Number(order.total);
  const comissao = receitaBruta * (Number(cfg.comissao_marketplace_pct) / 100);
  const gateway = receitaBruta * (Number(cfg.taxa_gateway_pct) / 100);
  const frete = receitaBruta * (Number(cfg.frete_medio_pct) / 100);
  const impostos = receitaBruta * (Number(cfg.imposto_padrao_pct) / 100);
  const lucroLiquido = receitaBruta - custoProdutos - comissao - gateway - frete - impostos;
  const margem = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;

  await pool.query(
    `INSERT INTO order_financial_breakdown
      (tenant_id, order_id, receita_bruta, custo_produtos, comissao_marketplace, taxa_gateway, frete, impostos, lucro_liquido, margem_percentual)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       receita_bruta = VALUES(receita_bruta), custo_produtos = VALUES(custo_produtos),
       comissao_marketplace = VALUES(comissao_marketplace), taxa_gateway = VALUES(taxa_gateway),
       frete = VALUES(frete), impostos = VALUES(impostos),
       lucro_liquido = VALUES(lucro_liquido), margem_percentual = VALUES(margem_percentual),
       processado_em = NOW()`,
    [tenantId, orderId, receitaBruta, custoProdutos, comissao, gateway, frete, impostos, lucroLiquido, margem]
  );

  return { order_id: orderId, receita_bruta: receitaBruta, custo_produtos: custoProdutos, lucro_liquido: lucroLiquido, margem_percentual: margem.toFixed(1) };
}

exports.processarPedido = async (req, res) => {
  try {
    const resultado = await processarPedidoInterno(req.tenant_id, req.params.orderId);
    res.json({ message: "Pedido processado", ...resultado });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.processarPendentes = async (req, res) => {
  try {
    const [pedidosPagos] = await pool.query(
      `SELECT o.id FROM orders o
       LEFT JOIN order_financial_breakdown ofb ON ofb.order_id = o.id AND ofb.tenant_id = o.tenant_id
       WHERE o.tenant_id = ? AND o.status = 'pago' AND ofb.id IS NULL`,
      [req.tenant_id]
    );

    let processados = 0;
    for (const p of pedidosPagos) {
      try {
        await processarPedidoInterno(req.tenant_id, p.id);
        processados++;
      } catch { /* pula pedido com erro individual, ex: sem itens cadastrados */ }
    }

    res.json({ message: `${processados} pedido(s) processado(s)`, total_encontrados: pedidosPagos.length, processados });
  } catch (err) {
    res.status(500).json({ error: "Erro ao processar pedidos pendentes", details: err.message });
  }
};

exports.listarBreakdowns = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ofb.*, o.created_at AS data_pedido
       FROM order_financial_breakdown ofb
       JOIN orders o ON o.id = ofb.order_id
       WHERE ofb.tenant_id = ?
       ORDER BY ofb.processado_em DESC
       LIMIT 200`,
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar breakdowns", details: err.message });
  }
};

exports.resumo = async (req, res) => {
  try {
    const [[row]] = await pool.query(
      `SELECT
         COUNT(*) AS qtd_pedidos_processados,
         COALESCE(SUM(receita_bruta), 0) AS receita_total,
         COALESCE(SUM(custo_produtos), 0) AS custo_total,
         COALESCE(SUM(comissao_marketplace), 0) AS comissao_total,
         COALESCE(SUM(taxa_gateway), 0) AS gateway_total,
         COALESCE(SUM(frete), 0) AS frete_total,
         COALESCE(SUM(impostos), 0) AS impostos_total,
         COALESCE(SUM(lucro_liquido), 0) AS lucro_total,
         COALESCE(AVG(margem_percentual), 0) AS margem_media
       FROM order_financial_breakdown
       WHERE tenant_id = ?`,
      [req.tenant_id]
    );

    const [[pendentesRow]] = await pool.query(
      `SELECT COUNT(*) AS qtd FROM orders o
       LEFT JOIN order_financial_breakdown ofb ON ofb.order_id = o.id AND ofb.tenant_id = o.tenant_id
       WHERE o.tenant_id = ? AND o.status = 'pago' AND ofb.id IS NULL`,
      [req.tenant_id]
    );

    res.json({
      qtd_pedidos_processados: row.qtd_pedidos_processados,
      qtd_pedidos_pendentes: pendentesRow.qtd,
      receita_total: Number(row.receita_total).toFixed(2),
      custo_total: Number(row.custo_total).toFixed(2),
      comissao_total: Number(row.comissao_total).toFixed(2),
      gateway_total: Number(row.gateway_total).toFixed(2),
      frete_total: Number(row.frete_total).toFixed(2),
      impostos_total: Number(row.impostos_total).toFixed(2),
      lucro_total: Number(row.lucro_total).toFixed(2),
      margem_media: Number(row.margem_media).toFixed(1),
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar resumo", details: err.message });
  }
};