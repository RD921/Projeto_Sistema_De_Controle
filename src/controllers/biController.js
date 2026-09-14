const pool = require("../config/db");

const LIMITE_ESTOQUE_BAIXO = 10;

// Dashboard executivo: cruza Vendas, Financeiro, CRM, Estoque e Marketing numa
// unica resposta. Vendas e Financeiro aceitam periodo customizado (dataInicio/
// dataFim); CRM, Estoque e Marketing sao fotografias do estado atual, porque
// os controllers de origem (crmDashboardController, stockController,
// marketingDashboardController) tambem nao filtram por periodo hoje - nao
// inventamos filtro novo que a fonte original nao suporta.
exports.executivo = async (req, res) => {
  try {
    const tenantId = req.tenant_id;
    const dataInicio = req.query.data_inicio || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const dataFim = req.query.data_fim || new Date().toISOString().slice(0, 10);

    const [[vendasRow]] = await pool.query(
      `SELECT COUNT(*) AS total_pedidos, COALESCE(SUM(total), 0) AS receita_total,
              ROUND(AVG(total), 2) AS ticket_medio
       FROM orders WHERE tenant_id = ? AND created_at BETWEEN ? AND ? AND status != 'cancelado'`,
      [tenantId, dataInicio, dataFim + " 23:59:59"]
    );

    const [[pedidosPagosRow]] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS receita_pedidos
       FROM orders WHERE tenant_id = ? AND status = 'pago' AND DATE(created_at) BETWEEN ? AND ?`,
      [tenantId, dataInicio, dataFim]
    );
    const [[manualRow]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'receita' AND status = 'pago' THEN valor ELSE 0 END), 0) AS receita_manual,
         COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status = 'pago' THEN valor ELSE 0 END), 0) AS despesas_pagas,
         COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status != 'pago' THEN valor ELSE 0 END), 0) AS despesas_pendentes
       FROM financial_entries WHERE tenant_id = ? AND data_vencimento BETWEEN ? AND ?`,
      [tenantId, dataInicio, dataFim]
    );
    const receitaFinanceiraTotal = Number(pedidosPagosRow.receita_pedidos) + Number(manualRow.receita_manual);
    const despesasTotal = Number(manualRow.despesas_pagas);

    const [[crmFechados]] = await pool.query(
      `SELECT
         SUM(CASE WHEN estagio = 'ganho' THEN 1 ELSE 0 END) AS ganhos,
         SUM(CASE WHEN estagio = 'perdido' THEN 1 ELSE 0 END) AS perdidos,
         COALESCE(SUM(CASE WHEN estagio = 'ganho' THEN valor ELSE 0 END), 0) AS receita_ganha
       FROM crm_deals WHERE tenant_id = ? AND estagio IN ('ganho','perdido')`,
      [tenantId]
    );
    const crmTotalFechados = Number(crmFechados.ganhos) + Number(crmFechados.perdidos);
    const crmTaxaConversao = crmTotalFechados > 0 ? Number(((crmFechados.ganhos / crmTotalFechados) * 100).toFixed(1)) : null;

    const [[crmPipelineAberto]] = await pool.query(
      `SELECT COUNT(*) AS total_deals, COALESCE(SUM(valor), 0) AS valor_total
       FROM crm_deals WHERE tenant_id = ? AND estagio NOT IN ('ganho','perdido')`,
      [tenantId]
    );

    const [[crmTarefasVencidas]] = await pool.query(
      "SELECT COUNT(*) AS total FROM crm_tasks WHERE tenant_id = ? AND concluida = FALSE AND prazo < NOW()",
      [tenantId]
    );

    const [[estoqueBaixoRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM products WHERE tenant_id = ? AND ativo = TRUE AND estoque <= ?",
      [tenantId, LIMITE_ESTOQUE_BAIXO]
    );

    const [[marketingLeads]] = await pool.query(
      "SELECT COUNT(*) AS total FROM marketing_leads WHERE tenant_id = ?",
      [tenantId]
    );
    const [[marketingConversoes]] = await pool.query(
      "SELECT COUNT(*) AS total, COALESCE(SUM(valor), 0) AS receita_atribuida FROM marketing_conversions WHERE tenant_id = ?",
      [tenantId]
    );

    res.json({
      periodo: { data_inicio: dataInicio, data_fim: dataFim },
      vendas: {
        total_pedidos: vendasRow.total_pedidos,
        receita_total: Number(vendasRow.receita_total).toFixed(2),
        ticket_medio: vendasRow.ticket_medio != null ? Number(vendasRow.ticket_medio).toFixed(2) : "0.00",
      },
      financeiro: {
        receita_total: receitaFinanceiraTotal.toFixed(2),
        despesas_pagas: despesasTotal.toFixed(2),
        despesas_pendentes: Number(manualRow.despesas_pendentes).toFixed(2),
        saldo: (receitaFinanceiraTotal - despesasTotal).toFixed(2),
      },
      crm: {
        taxa_conversao: crmTaxaConversao,
        receita_ganha: Number(crmFechados.receita_ganha).toFixed(2),
        pipeline_aberto: {
          total_deals: crmPipelineAberto.total_deals,
          valor_total: Number(crmPipelineAberto.valor_total).toFixed(2),
        },
        tarefas_vencidas: crmTarefasVencidas.total,
        observacao: "CRM reflete o estado atual (sem filtro de periodo, mesma limitacao do dashboard original)",
      },
      estoque: {
        produtos_estoque_baixo: estoqueBaixoRow.total,
        observacao: "Estoque reflete o estado atual (sem filtro de periodo)",
      },
      marketing: {
        total_leads: marketingLeads.total,
        total_conversoes: marketingConversoes.total,
        receita_atribuida: Number(marketingConversoes.receita_atribuida).toFixed(2),
        observacao: "Marketing reflete o estado atual (sem filtro de periodo)",
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar dashboard executivo", details: err.message });
  }
};