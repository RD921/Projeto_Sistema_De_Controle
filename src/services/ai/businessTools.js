const pool = require("../../config/db");

// DeclaraÃ§Ã£o das ferramentas no formato que a API do Gemini espera.
const toolDeclarations = [
  {
    name: "consultar_estoque",
    description: "Consulta o estoque atual dos produtos cadastrados. Use para responder perguntas sobre estoque baixo, produtos parados, ou nÃ­vel de estoque de um produto especÃ­fico.",
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
    description: "Consulta pedidos da loja, com filtro opcional por status e perÃ­odo. Use para responder sobre volume de vendas, pedidos pendentes, cancelados, etc.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", description: "Filtra por status: pendente, pago, cancelado, enviado, finalizado. Deixe vazio para todos." },
        dias: { type: "NUMBER", description: "Considera apenas pedidos dos Ãºltimos N dias. Deixe vazio para todo o histÃ³rico." },
      },
    },
  },
  {
    name: "consultar_financeiro",
    description: "Consulta o resumo financeiro: receita de pedidos pagos, receita manual, despesas pagas e pendentes, saldo. Use para perguntas sobre faturamento, lucro, despesas ou saÃºde financeira.",
    parameters: {
      type: "OBJECT",
      properties: {
        dias: { type: "NUMBER", description: "Considera apenas o perÃ­odo dos Ãºltimos N dias. Deixe vazio para todo o histÃ³rico." },
      },
    },
  },
  {
    name: "consultar_clientes",
    description: "Consulta a base de clientes cadastrados. Use para perguntas sobre quantidade de clientes, clientes recentes, ou buscar um cliente especÃ­fico pelo nome.",
    parameters: {
      type: "OBJECT",
      properties: {
        nome: { type: "STRING", description: "Filtra por nome do cliente (busca parcial). Deixe vazio para listar todos." },
        apenas_recentes: { type: "BOOLEAN", description: "Se true, retorna apenas clientes cadastrados nos Ãºltimos 7 dias." },
      },
    },
  },
  {
    name: "consultar_produtos_mais_vendidos",
    description: "Consulta o ranking de produtos mais vendidos, com base na quantidade vendida em itens de pedido. Use para perguntas sobre quais produtos vendem mais ou menos.",
    parameters: {
      type: "OBJECT",
      properties: {
        limite: { type: "NUMBER", description: "Quantidade de produtos a retornar no ranking. PadrÃ£o: 5." },
      },
    },
  },
  {
    name: "consultar_leads",
    description: "Consulta os leads de marketing cadastrados, com filtros opcionais por status e temperatura. Use para perguntas sobre quantidade de leads, leads quentes/mornos/frios, leads qualificados, leads perdidos, etc.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", description: "Filtra por status: novo, contactado, engajado, qualificado, oportunidade, cliente, perdido, inativo. Deixe vazio para todos." },
        temperatura: { type: "STRING", description: "Filtra por temperatura: frio, morno, quente. Deixe vazio para todas." },
        limite: { type: "NUMBER", description: "Quantidade maxima de leads a retornar. PadrÃ£o: 20." },
      },
    },
  },
  {
    name: "consultar_campanhas",
    description: "Consulta as campanhas de marketing cadastradas, com filtro opcional por status. Use para perguntas sobre campanhas ativas, pausadas, ou o total de campanhas cadastradas.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", description: "Filtra por status: rascunho, agendada, ativa, pausada, finalizada, cancelada. Deixe vazio para todas." },
      },
    },
  },
  {
    name: "consultar_historico_score_lead",
    description: "Consulta o historico detalhado de pontuacao (score) de um lead especifico, mostrando cada evento que alterou o score dele e por que. Use quando o usuario perguntar por que um lead tem determinado score ou pedir o historico de um lead pelo id.",
    parameters: {
      type: "OBJECT",
      properties: {
        lead_id: { type: "NUMBER", description: "ID do lead a consultar o historico de score." },
      },
      required: ["lead_id"],
    },
  },
  {
    name: "consultar_evolucao_vendas",
    description: "Consulta a evolucao de vendas (numero de pedidos e receita) agrupada por dia, semana ou mes, dentro de um intervalo de datas especifico. Use quando o usuario perguntar como as vendas evoluiram ao longo do tempo, comparar periodos, ou pedir um relatorio de vendas com datas especificas (diferente de 'ultimos N dias').",
    parameters: {
      type: "OBJECT",
      properties: {
        data_inicio: { type: "STRING", description: "Data inicial no formato AAAA-MM-DD. Deixe vazio para usar os ultimos 30 dias." },
        data_fim: { type: "STRING", description: "Data final no formato AAAA-MM-DD. Deixe vazio para usar hoje." },
        agrupar_por: { type: "STRING", description: "Como agrupar os resultados: 'day', 'week' ou 'month'. Padrao: 'day'." },
      },
    },
  },
  {
    name: "consultar_vendas_por_canal",
    description: "Consulta as vendas separadas por canal/marketplace (loja propria, Mercado Livre, Shopee, etc), com total de pedidos, receita e ticket medio de cada canal. Use quando o usuario perguntar qual canal vende mais, comparar marketplaces, ou pedir desempenho por canal de venda.",
    parameters: {
      type: "OBJECT",
      properties: {
        dias: { type: "NUMBER", description: "Considera apenas os ultimos N dias. Deixe vazio para os ultimos 30 dias (padrao)." },
      },
    },
  },
  {
    name: "consultar_pipeline",
    description: "Consulta o pipeline ATIVO de oportunidades comerciais do modulo CRM (deals em prospeccao, qualificacao, proposta ou negociacao - exclui ganhas e perdidas). Isso e DIFERENTE de leads de marketing: pipeline de CRM sao oportunidades de venda vinculadas a um cliente, ja em negociacao comercial. Use para perguntas sobre quantas oportunidades comerciais estao em aberto, quais deals estao parados em qual estagio, ou o valor total do pipeline de vendas.",
    parameters: {
      type: "OBJECT",
      properties: {
        estagio: { type: "STRING", description: "Filtra por um estagio especifico: prospeccao, qualificacao, proposta ou negociacao. Deixe vazio para ver todos os estagios ativos." },
      },
    },
  },
  {
    name: "consultar_dashboard_crm",
    description: "Consulta o dashboard executivo do modulo CRM: taxa de conversao de OPORTUNIDADES COMERCIAIS (deals ganhos vs perdidos - diferente da taxa de conversao de leads de marketing), receita ganha em vendas fechadas, ciclo medio de venda em dias, contagem de tarefas de follow-up vencidas/pendentes/concluidas, e motivos de perda mais comuns. Use para perguntas sobre desempenho de vendas do time comercial, taxa de fechamento de negocios, ou por que oportunidades estao sendo perdidas.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "consultar_tarefas_vencidas",
    description: "Consulta as tarefas de follow-up do modulo CRM que estao vencidas (prazo passado e ainda nao concluidas), com o cliente e a oportunidade comercial vinculados a cada uma. Use quando o usuario perguntar sobre follow-ups atrasados, tarefas pendentes, agenda comercial, ou o que precisa de atencao urgente no CRM/vendas.",
    parameters: {
      type: "OBJECT",
      properties: {
        limite: { type: "NUMBER", description: "Quantidade maxima de tarefas a retornar. Padrao: 20." },
      },
    },
  },

    {
    name: "consultar_dashboard_logistica",
    description: "Consulta o dashboard geral da logistica: total de envios, taxa de entrega no prazo, quantidade de envios atrasados, frete medio e total, e envios agrupados por status. Use para perguntas sobre como esta a logistica de forma geral.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "consultar_envios",
    description: "Consulta a lista de envios logisticos, com filtro opcional por status (aguardando_separacao, em_separacao, despachado, em_transito, entregue, extraviado, etc). Use para perguntas sobre pedidos especificos em transporte, quantos envios estao em cada estagio, ou detalhes de entregas.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", description: "Filtra por um status especifico. Deixe vazio para ver todos os envios recentes." },
      },
    },
  },
  {
    name: "consultar_score_transportadoras",
    description: "Consulta o desempenho real de cada transportadora cadastrada: pontualidade, taxa de ocorrencias (extravio/devolucao/problema), frete medio real cobrado, e um score consolidado de 0 a 100. Use para perguntas sobre qual transportadora e melhor, ou desempenho comparado entre elas.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "consultar_alertas_logisticos",
    description: "Consulta os alertas criticos abertos na logistica: envios atrasados, produtos com estoque critico, e envios extraviados. Use quando o usuario perguntar o que precisa de atencao urgente na logistica, ou quais problemas existem agora.",
    parameters: { type: "OBJECT", properties: {} },
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

async function consultar_leads(args, tenantId) {
  let sql = "SELECT id, nome, email, status, score, temperatura, origem, canal, created_at FROM marketing_leads WHERE tenant_id = ?";
  const params = [tenantId];
  if (args.status) {
    sql += " AND status = ?";
    params.push(args.status);
  }
  if (args.temperatura) {
    sql += " AND temperatura = ?";
    params.push(args.temperatura);
  }
  const limite = args.limite || 20;
  sql += " ORDER BY score DESC, created_at DESC LIMIT ?";
  params.push(limite);
  const [rows] = await pool.query(sql, params);
  return { leads: rows, total_encontrado: rows.length };
}

async function consultar_campanhas(args, tenantId) {
  let sql = `SELECT c.id, c.nome, c.objetivo, c.tipo, c.status, c.orcamento, c.data_inicio, c.data_fim,
                    s.nome AS segmento_nome, a.name AS automacao_nome, a.status AS automacao_status
             FROM marketing_campaigns c
             LEFT JOIN marketing_segments s ON s.id = c.segment_id
             LEFT JOIN automations a ON a.id = c.automation_id
             WHERE c.tenant_id = ?`;
  const params = [tenantId];
  if (args.status) {
    sql += " AND c.status = ?";
    params.push(args.status);
  }
  sql += " ORDER BY c.created_at DESC LIMIT 30";
  const [rows] = await pool.query(sql, params);
  return { campanhas: rows, total_encontrado: rows.length };
}

async function consultar_historico_score_lead(args, tenantId) {
  if (!args.lead_id) return { erro: "lead_id e obrigatorio" };

  const [[lead]] = await pool.query("SELECT id, nome, score, temperatura FROM marketing_leads WHERE id = ? AND tenant_id = ?", [args.lead_id, tenantId]);
  if (!lead) return { erro: `Lead ${args.lead_id} nao encontrado` };

  const [historico] = await pool.query(
    "SELECT pontos_aplicados, score_resultante, motivo, created_at FROM marketing_lead_score_history WHERE lead_id = ? ORDER BY created_at ASC",
    [args.lead_id]
  );
  return { lead, historico };
}

async function consultar_evolucao_vendas(args, tenantId) {
  const fim = args.data_fim ? new Date(args.data_fim) : new Date();
  const inicio = args.data_inicio ? new Date(args.data_inicio) : new Date(Date.now() - 30 * 86400000);
  fim.setHours(23, 59, 59, 999);

  const agrupamentosValidos = ["day", "week", "month"];
  const agruparPor = agrupamentosValidos.includes(args.agrupar_por) ? args.agrupar_por : "day";
  const groupExpr = {
    day: "DATE(created_at)",
    week: "YEARWEEK(created_at, 1)",
    month: "DATE_FORMAT(created_at, '%Y-%m')",
  }[agruparPor];

  const [rows] = await pool.query(
    `SELECT ${groupExpr} AS periodo, COUNT(*) AS total_pedidos, COALESCE(SUM(total), 0) AS receita_total
     FROM orders
     WHERE tenant_id = ? AND created_at BETWEEN ? AND ? AND status != 'cancelado'
     GROUP BY ${groupExpr}
     ORDER BY periodo`,
    [tenantId, inicio, fim]
  );

  const receitaPeriodo = rows.reduce((acc, r) => acc + Number(r.receita_total), 0);
  return { agrupado_por: agruparPor, evolucao: rows, receita_total_periodo: receitaPeriodo.toFixed(2) };
}

async function consultar_vendas_por_canal(args, tenantId) {
  const dias = args.dias || 30;
  const inicio = new Date(Date.now() - dias * 86400000);
  const fim = new Date();

  const [internos] = await pool.query(
    `SELECT 'ecomflow' AS canal, COUNT(*) AS total_pedidos, COALESCE(SUM(total), 0) AS receita_total,
            ROUND(AVG(total), 2) AS ticket_medio
     FROM orders WHERE tenant_id = ? AND created_at BETWEEN ? AND ? AND status != 'cancelado'`,
    [tenantId, inicio, fim]
  );

  const [marketplaces] = await pool.query(
    `SELECT marketplace AS canal, COUNT(*) AS total_pedidos, COALESCE(SUM(total), 0) AS receita_total,
            ROUND(AVG(total), 2) AS ticket_medio
     FROM marketplace_orders WHERE tenant_id = ? AND synced_at BETWEEN ? AND ?
     GROUP BY marketplace`,
    [tenantId, inicio, fim]
  );

  return { canais: [...internos, ...marketplaces] };
}

async function consultar_pipeline(args, tenantId) {
  const [rows] = await pool.query(
    `SELECT d.id, d.titulo, d.valor, d.estagio, d.created_at, c.nome AS customer_nome
     FROM crm_deals d
     JOIN customers c ON c.id = d.customer_id
     WHERE d.tenant_id = ? AND d.estagio NOT IN ('ganho','perdido')
     ORDER BY d.updated_at DESC`,
    [tenantId]
  );

  const estagios = ["prospeccao", "qualificacao", "proposta", "negociacao"];
  const agrupado = {};
  for (const e of estagios) agrupado[e] = [];
  for (const deal of rows) {
    if (agrupado[deal.estagio]) agrupado[deal.estagio].push(deal);
  }

  if (args.estagio && estagios.includes(args.estagio)) {
    const deals = agrupado[args.estagio];
    const valorTotal = deals.reduce((acc, d) => acc + Number(d.valor || 0), 0);
    return { estagio: args.estagio, deals, valor_total: valorTotal.toFixed(2) };
  }

  const resumoPorEstagio = estagios.map((e) => ({
    estagio: e,
    total_deals: agrupado[e].length,
    valor_total: agrupado[e].reduce((acc, d) => acc + Number(d.valor || 0), 0).toFixed(2),
  }));
  return { resumo_por_estagio: resumoPorEstagio, pipeline_completo: agrupado };
}

async function consultar_dashboard_crm(args, tenantId) {
  const [[fechados]] = await pool.query(
    `SELECT
       SUM(CASE WHEN estagio = 'ganho' THEN 1 ELSE 0 END) AS ganhos,
       SUM(CASE WHEN estagio = 'perdido' THEN 1 ELSE 0 END) AS perdidos,
       COALESCE(SUM(CASE WHEN estagio = 'ganho' THEN valor ELSE 0 END), 0) AS receita_ganha
     FROM crm_deals WHERE tenant_id = ? AND estagio IN ('ganho','perdido')`,
    [tenantId]
  );

  const totalFechados = Number(fechados.ganhos) + Number(fechados.perdidos);
  const taxaConversao = totalFechados > 0 ? Number(((fechados.ganhos / totalFechados) * 100).toFixed(1)) : null;

  const [[cicloMedio]] = await pool.query(
    `SELECT AVG(TIMESTAMPDIFF(DAY, created_at, closed_at)) AS dias_medio
     FROM crm_deals WHERE tenant_id = ? AND estagio = 'ganho' AND closed_at IS NOT NULL`,
    [tenantId]
  );

  const [[tarefasResumo]] = await pool.query(
    `SELECT
       SUM(CASE WHEN concluida = FALSE AND prazo < NOW() THEN 1 ELSE 0 END) AS vencidas,
       SUM(CASE WHEN concluida = FALSE AND prazo >= NOW() THEN 1 ELSE 0 END) AS pendentes,
       SUM(CASE WHEN concluida = TRUE THEN 1 ELSE 0 END) AS concluidas
     FROM crm_tasks WHERE tenant_id = ?`,
    [tenantId]
  );

  const [motivosPerda] = await pool.query(
    `SELECT motivo_perda, COUNT(*) AS total FROM crm_deals
     WHERE tenant_id = ? AND estagio = 'perdido' AND motivo_perda IS NOT NULL
     GROUP BY motivo_perda ORDER BY total DESC`,
    [tenantId]
  );

  return {
    fechamentos: {
      ganhos: Number(fechados.ganhos) || 0,
      perdidos: Number(fechados.perdidos) || 0,
      taxa_conversao: taxaConversao,
      receita_ganha: Number(fechados.receita_ganha).toFixed(2),
    },
    ciclo_medio_dias: cicloMedio.dias_medio != null ? Number(cicloMedio.dias_medio).toFixed(1) : null,
    tarefas: {
      vencidas: Number(tarefasResumo.vencidas) || 0,
      pendentes: Number(tarefasResumo.pendentes) || 0,
      concluidas: Number(tarefasResumo.concluidas) || 0,
    },
    motivos_perda: motivosPerda,
  };
}

async function consultar_tarefas_vencidas(args, tenantId) {
  const limite = args.limite || 20;
  const [rows] = await pool.query(
    `SELECT t.id, t.titulo, t.prazo, c.nome AS customer_nome, d.titulo AS deal_titulo
     FROM crm_tasks t
     LEFT JOIN customers c ON c.id = t.customer_id
     LEFT JOIN crm_deals d ON d.id = t.deal_id
     WHERE t.tenant_id = ? AND t.concluida = FALSE AND t.prazo < NOW()
     ORDER BY t.prazo ASC
     LIMIT ?`,
    [tenantId, limite]
  );
  return { tarefas_vencidas: rows, total_encontrado: rows.length };
}

async function consultar_dashboard_logistica(args, tenantId) {
  const [porStatus] = await pool.query(
    "SELECT status, COUNT(*) AS total FROM logistics_shipments WHERE tenant_id = ? GROUP BY status",
    [tenantId]
  );
  const [[atrasados]] = await pool.query(
    "SELECT COUNT(*) AS total FROM logistics_shipments WHERE tenant_id = ? AND data_prevista < CURDATE() AND status NOT IN ('entregue','cancelado','devolvido')",
    [tenantId]
  );
  const [[fretes]] = await pool.query(
    "SELECT COALESCE(AVG(frete_valor), 0) AS frete_medio, COALESCE(SUM(frete_valor), 0) AS frete_total FROM logistics_shipments WHERE tenant_id = ?",
    [tenantId]
  );
  const [[entregues]] = await pool.query("SELECT COUNT(*) AS total FROM logistics_shipments WHERE tenant_id = ? AND status = 'entregue'", [tenantId]);
  const [[totalEnvios]] = await pool.query("SELECT COUNT(*) AS total FROM logistics_shipments WHERE tenant_id = ?", [tenantId]);
  const taxaEntrega = totalEnvios.total > 0 ? Number(((entregues.total / totalEnvios.total) * 100).toFixed(1)) : null;

  return {
    por_status: porStatus,
    atrasados: atrasados.total,
    frete_medio: Number(fretes.frete_medio).toFixed(2),
    frete_total: Number(fretes.frete_total).toFixed(2),
    taxa_entrega: taxaEntrega,
    total_envios: totalEnvios.total,
  };
}

async function consultar_envios(args, tenantId) {
  let sql = `SELECT s.id, s.status, s.tracking_code, s.data_prevista, o.total AS pedido_total, c.nome AS customer_nome, cr.nome AS carrier_nome
             FROM logistics_shipments s
             JOIN orders o ON o.id = s.order_id
             LEFT JOIN customers c ON c.id = o.customer_id
             LEFT JOIN logistics_carriers cr ON cr.id = s.carrier_id
             WHERE s.tenant_id = ?`;
  const params = [tenantId];
  if (args.status) { sql += " AND s.status = ?"; params.push(args.status); }
  sql += " ORDER BY s.created_at DESC LIMIT 30";
  const [rows] = await pool.query(sql, params);
  return { envios: rows, total_encontrado: rows.length };
}

async function consultar_score_transportadoras(args, tenantId) {
  const [rows] = await pool.query(
    `SELECT
       cr.id, cr.nome, cr.custo_medio,
       COUNT(s.id) AS total_envios,
       SUM(CASE WHEN s.status = 'entregue' AND s.data_prevista IS NOT NULL AND DATE(s.data_entrega) <= s.data_prevista THEN 1 ELSE 0 END) AS no_prazo,
       SUM(CASE WHEN s.status IN ('extraviado','devolvido','problema_transporte') THEN 1 ELSE 0 END) AS ocorrencias,
       COALESCE(AVG(s.frete_valor), 0) AS frete_medio_real
     FROM logistics_carriers cr
     LEFT JOIN logistics_shipments s ON s.carrier_id = cr.id AND s.tenant_id = cr.tenant_id
     WHERE cr.tenant_id = ? AND cr.ativo = TRUE
     GROUP BY cr.id`,
    [tenantId]
  );

  const resultado = rows.map(r => {
    const totalEnvios = Number(r.total_envios) || 0;
    const pontualidade = totalEnvios > 0 ? (Number(r.no_prazo) / totalEnvios) * 100 : null;
    const taxaOcorrencia = totalEnvios > 0 ? (Number(r.ocorrencias) / totalEnvios) * 100 : null;
    const score = totalEnvios > 0 ? Number((((pontualidade ?? 0) + (100 - (taxaOcorrencia ?? 0))) / 2).toFixed(1)) : null;
    return {
      nome: r.nome, total_envios: totalEnvios,
      pontualidade_pct: pontualidade != null ? Number(pontualidade.toFixed(1)) : null,
      frete_medio_real: Number(r.frete_medio_real).toFixed(2),
      score,
    };
  });
  resultado.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  return { transportadoras: resultado };
}

async function consultar_alertas_logisticos(args, tenantId) {
  const alertas = [];

  const [atrasados] = await pool.query(
    `SELECT s.id, s.data_prevista, c.nome AS customer_nome
     FROM logistics_shipments s
     LEFT JOIN orders o ON o.id = s.order_id
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE s.tenant_id = ? AND s.data_prevista < CURDATE() AND s.status NOT IN ('entregue','cancelado','devolvido')`,
    [tenantId]
  );
  atrasados.forEach(a => alertas.push({ severidade: "critico", tipo: "pedido_atrasado", titulo: `Envio #${a.id} atrasado`, cliente: a.customer_nome }));

  const [rupturaAlta] = await pool.query(
    "SELECT id, nome, estoque FROM products WHERE tenant_id = ? AND ativo = TRUE AND estoque <= 5",
    [tenantId]
  );
  rupturaAlta.forEach(p => alertas.push({ severidade: "critico", tipo: "estoque_critico", titulo: `${p.nome} com estoque critico`, estoque: p.estoque }));

  const [[extraviados]] = await pool.query("SELECT COUNT(*) AS total FROM logistics_shipments WHERE tenant_id = ? AND status = 'extraviado'", [tenantId]);
  if (extraviados.total > 0) alertas.push({ severidade: "critico", tipo: "extravio", titulo: `${extraviados.total} envio(s) extraviado(s)` });

  return { total: alertas.length, alertas };
}

const executores = {
  consultar_estoque,
  consultar_pedidos,
  consultar_financeiro,
  consultar_clientes,
  consultar_produtos_mais_vendidos,
  consultar_leads,
  consultar_campanhas,
  consultar_historico_score_lead,
  consultar_evolucao_vendas,
  consultar_vendas_por_canal,
  consultar_pipeline,
  consultar_dashboard_crm,
  consultar_tarefas_vencidas,
  consultar_dashboard_logistica,
  consultar_envios,
  consultar_score_transportadoras,
  consultar_alertas_logisticos,
};

async function executarFerramenta(nome, args, tenantId) {
  const fn = executores[nome];
  if (!fn) return { erro: `Ferramenta '${nome}' nÃ£o existe.` };
  try {
    return await fn(args || {}, tenantId);
  } catch (err) {
    return { erro: `Falha ao consultar dados: ${err.message}` };
  }
}

module.exports = { toolDeclarations, executarFerramenta };