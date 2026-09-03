const pool = require("../../config/db");

// Declaração das ferramentas no formato que a API do Gemini espera.
const toolDeclarations = [
  {
    name: "consultar_estoque",
    description: "Consulta o estoque atual dos produtos cadastrados. Use para responder perguntas sobre estoque baixo, produtos parados, ou nível de estoque de um produto específico.",
    parameters: {
      type: "OBJECT",
      properties: {
        apenas_baixo: { type: "BOOLEAN", description: "Se true, retorna apenas produtos com estoque igual ou abaixo de 10 unidades." },
        nome_produto: { type: "STRING", description: "Filtra por nome do produto (busca parcial). Deixe vazio para listar todos." },
      },
    },
  },
  {
    name: "consultar_pedidos",
    description: "Consulta pedidos da loja, com filtro opcional por status e período. Use para responder sobre volume de vendas, pedidos pendentes, cancelados, etc.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", description: "Filtra por status: pendente, pago, cancelado, enviado, finalizado. Deixe vazio para todos." },
        dias: { type: "NUMBER", description: "Considera apenas pedidos dos últimos N dias. Deixe vazio para todo o histórico." },
      },
    },
  },
  {
    name: "consultar_financeiro",
    description: "Consulta o resumo financeiro: receita de pedidos pagos, receita manual, despesas pagas e pendentes, saldo. Use para perguntas sobre faturamento, lucro, despesas ou saúde financeira.",
    parameters: {
      type: "OBJECT",
      properties: {
        dias: { type: "NUMBER", description: "Considera apenas o período dos últimos N dias. Deixe vazio para todo o histórico." },
      },
    },
  },
  {
    name: "consultar_clientes",
    description: "Consulta a base de clientes cadastrados. Use para perguntas sobre quantidade de clientes, clientes recentes, ou buscar um cliente específico pelo nome.",
    parameters: {
      type: "OBJECT",
      properties: {
        nome: { type: "STRING", description: "Filtra por nome do cliente (busca parcial). Deixe vazio para listar todos." },
        apenas_recentes: { type: "BOOLEAN", description: "Se true, retorna apenas clientes cadastrados nos últimos 7 dias." },
      },
    },
  },
  {
    name: "consultar_produtos_mais_vendidos",
    description: "Consulta o ranking de produtos mais vendidos, com base na quantidade vendida em itens de pedido. Use para perguntas sobre quais produtos vendem mais ou menos.",
    parameters: {
      type: "OBJECT",
      properties: {
        limite: { type: "NUMBER", description: "Quantidade de produtos a retornar no ranking. Padrão: 5." },
      },
    },
  },
];

async function consultar_estoque(args, tenantId) {
  let sql = "SELECT id, nome, sku, preco, estoque FROM products WHERE tenant_id = ? AND ativo = TRUE";
  const params = [tenantId];
  if (args.nome_produto) {
    sql += " AND nome LIKE ?";
    params.push(`%${args.nome_produto}%`);
  }
  if (args.apenas_baixo) {
    sql += " AND estoque <= 10";
  }
  sql += " ORDER BY estoque ASC LIMIT 30";
  const [rows] = await pool.query(sql, params);
  return { produtos: rows, total_encontrado: rows.length };
}

async function consultar_pedidos(args, tenantId) {
  let sql = "SELECT id, status, total, created_at FROM orders WHERE tenant_id = ?";
  const params = [tenantId];
  if (args.status) {
    sql += " AND status = ?";
    params.push(args.status);
  }
  if (args.dias) {
    sql += " AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)";
    params.push(args.dias);
  }
  sql += " ORDER BY created_at DESC LIMIT 50";
  const [rows] = await pool.query(sql, params);
  const totalValor = rows.reduce((acc, o) => acc + Number(o.total || 0), 0);
  return { pedidos: rows, total_encontrado: rows.length, valor_total: totalValor.toFixed(2) };
}

async function consultar_financeiro(args, tenantId) {
  const dias = args.dias || 3650;
  const dataDe = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
  const dataAte = "2999-12-31";

  const [[pedidosRow]] = await pool.query(
    `SELECT COALESCE(SUM(total), 0) AS receita_pedidos, COUNT(*) AS qtd_pedidos
     FROM orders WHERE tenant_id = ? AND status = 'pago' AND DATE(created_at) BETWEEN ? AND ?`,
    [tenantId, dataDe, dataAte]
  );

  const [[manualRow]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'receita' AND status = 'pago' THEN valor ELSE 0 END), 0) AS receita_manual,
       COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status = 'pago' THEN valor ELSE 0 END), 0) AS despesas_pagas,
       COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status != 'pago' THEN valor ELSE 0 END), 0) AS despesas_pendentes
     FROM financial_entries WHERE tenant_id = ? AND data_vencimento BETWEEN ? AND ?`,
    [tenantId, dataDe, dataAte]
  );

  const receitaTotal = Number(pedidosRow.receita_pedidos) + Number(manualRow.receita_manual);
  const despesasTotal = Number(manualRow.despesas_pagas);

  return {
    receita_pedidos: Number(pedidosRow.receita_pedidos).toFixed(2),
    qtd_pedidos_pagos: pedidosRow.qtd_pedidos,
    receita_manual: Number(manualRow.receita_manual).toFixed(2),
    receita_total: receitaTotal.toFixed(2),
    despesas_pagas: despesasTotal.toFixed(2),
    despesas_pendentes: Number(manualRow.despesas_pendentes).toFixed(2),
    saldo: (receitaTotal - despesasTotal).toFixed(2),
  };
}

async function consultar_clientes(args, tenantId) {
  let sql = "SELECT id, nome, email, telefone, created_at FROM customers WHERE tenant_id = ? AND ativo = TRUE";
  const params = [tenantId];
  if (args.nome) {
    sql += " AND nome LIKE ?";
    params.push(`%${args.nome}%`);
  }
  if (args.apenas_recentes) {
    sql += " AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
  }
  sql += " ORDER BY created_at DESC LIMIT 30";
  const [rows] = await pool.query(sql, params);
  return { clientes: rows, total_encontrado: rows.length };
}

async function consultar_produtos_mais_vendidos(args, tenantId) {
  const limite = args.limite || 5;
  const [rows] = await pool.query(
    `SELECT p.id, p.nome, p.sku, COALESCE(SUM(oi.quantidade), 0) AS total_vendido
     FROM products p
     LEFT JOIN order_items oi ON oi.product_id = p.id
     LEFT JOIN orders o ON o.id = oi.order_id AND o.tenant_id = ?
     WHERE p.tenant_id = ?
     GROUP BY p.id, p.nome, p.sku
     ORDER BY total_vendido DESC
     LIMIT ?`,
    [tenantId, tenantId, limite]
  );
  return { ranking: rows };
}

const executores = {
  consultar_estoque,
  consultar_pedidos,
  consultar_financeiro,
  consultar_clientes,
  consultar_produtos_mais_vendidos,
};

async function executarFerramenta(nome, args, tenantId) {
  const fn = executores[nome];
  if (!fn) return { erro: `Ferramenta '${nome}' não existe.` };
  try {
    return await fn(args || {}, tenantId);
  } catch (err) {
    return { erro: `Falha ao consultar dados: ${err.message}` };
  }
}

module.exports = { toolDeclarations, executarFerramenta };