const pool = require("../config/db");

async function avaliarFechamento(tenantId, competencia) {
  const [ano, mes] = competencia.split("-");
  const dataInicio = `${competencia}-01`;
  const dataFim = new Date(ano, mes, 0).toISOString().slice(0, 10); // último dia do mês

  const checklist = [];

  // 1. Lançamentos financeiros pendentes de aprovação no mês
  const [[pendentesAprovacao]] = await pool.query(
    `SELECT COUNT(*) AS qtd FROM financial_entries
     WHERE tenant_id = ? AND aprovacao_status = 'pendente'
       AND data_vencimento BETWEEN ? AND ?`,
    [tenantId, dataInicio, dataFim]
  );
  checklist.push({
    item: "Lançamentos aguardando aprovação",
    ok: pendentesAprovacao.qtd === 0,
    detalhe: pendentesAprovacao.qtd > 0 ? `${pendentesAprovacao.qtd} lançamento(s) pendente(s)` : "Nenhuma pendência",
    qtd_pendente: pendentesAprovacao.qtd,
  });

  // 2. Contas a pagar vencidas e não pagas dentro do mês
  const [[contasVencidas]] = await pool.query(
    `SELECT COUNT(*) AS qtd FROM financial_entries
     WHERE tenant_id = ? AND tipo = 'despesa' AND status != 'pago'
       AND data_vencimento BETWEEN ? AND ?`,
    [tenantId, dataInicio, dataFim]
  );
  checklist.push({
    item: "Contas a pagar do mês quitadas",
    ok: contasVencidas.qtd === 0,
    detalhe: contasVencidas.qtd > 0 ? `${contasVencidas.qtd} conta(s) ainda em aberto` : "Todas quitadas",
    qtd_pendente: contasVencidas.qtd,
  });

  // 3. Contas a receber vencidas e não recebidas dentro do mês
  const [[receberVencidas]] = await pool.query(
    `SELECT COUNT(*) AS qtd FROM financial_entries
     WHERE tenant_id = ? AND tipo = 'receita' AND status != 'pago'
       AND data_vencimento BETWEEN ? AND ?`,
    [tenantId, dataInicio, dataFim]
  );
  checklist.push({
    item: "Contas a receber do mês recebidas",
    ok: receberVencidas.qtd === 0,
    detalhe: receberVencidas.qtd > 0 ? `${receberVencidas.qtd} recebível(is) ainda em aberto` : "Todos recebidos",
    qtd_pendente: receberVencidas.qtd,
  });

  // 4. Movimentações bancárias não conciliadas no mês
  const [[naoConciliadas]] = await pool.query(
    `SELECT COUNT(*) AS qtd FROM bank_transactions
     WHERE tenant_id = ? AND conciliado = FALSE AND data BETWEEN ? AND ?`,
    [tenantId, dataInicio, dataFim]
  );
  checklist.push({
    item: "Movimentações bancárias conciliadas",
    ok: naoConciliadas.qtd === 0,
    detalhe: naoConciliadas.qtd > 0 ? `${naoConciliadas.qtd} movimentação(ões) sem conciliar` : "Tudo conciliado",
    qtd_pendente: naoConciliadas.qtd,
  });

  // 5. Lançamentos contábeis do mês existem (indício de que a contabilização foi feita)
  const [[lancamentosContabeis]] = await pool.query(
    `SELECT COUNT(*) AS qtd FROM accounting_entries WHERE tenant_id = ? AND data BETWEEN ? AND ?`,
    [tenantId, dataInicio, dataFim]
  );
  checklist.push({
    item: "Lançamentos contábeis registrados",
    ok: lancamentosContabeis.qtd > 0,
    detalhe: lancamentosContabeis.qtd > 0 ? `${lancamentosContabeis.qtd} lançamento(s) registrado(s)` : "Nenhum lançamento contábil neste mês",
    qtd_pendente: lancamentosContabeis.qtd > 0 ? 0 : 1,
  });

  // 6. Balancete fechado (débito = crédito) — reaproveita a mesma lógica do balancete
  const [movimentosBalancete] = await pool.query(
    `SELECT SUM(CASE WHEN l.tipo = 'debito' THEN l.valor ELSE 0 END) AS total_debito,
            SUM(CASE WHEN l.tipo = 'credito' THEN l.valor ELSE 0 END) AS total_credito
     FROM accounting_entry_lines l
     JOIN accounting_entries e ON e.id = l.entry_id
     WHERE e.tenant_id = ? AND e.data BETWEEN ? AND ?`,
    [tenantId, dataInicio, dataFim]
  );
  const totalDebito = Number(movimentosBalancete[0].total_debito) || 0;
  const totalCredito = Number(movimentosBalancete[0].total_credito) || 0;
  const balanceteFechado = Math.abs(totalDebito - totalCredito) < 0.01;
  checklist.push({
    item: "Balancete fechado (débito = crédito)",
    ok: lancamentosContabeis.qtd === 0 ? true : balanceteFechado,
    detalhe: balanceteFechado ? "Balanceado" : `Diferença de R$ ${Math.abs(totalDebito - totalCredito).toFixed(2)}`,
    qtd_pendente: balanceteFechado ? 0 : 1,
  });

  // 7. Obrigações fiscais da competência transmitidas
  const [[obrigacoesAbertas]] = await pool.query(
    `SELECT COUNT(*) AS qtd FROM fiscal_obligations
     WHERE tenant_id = ? AND competencia = ? AND status NOT IN ('transmitido','recebido')`,
    [tenantId, competencia]
  );
  checklist.push({
    item: "Obrigações fiscais da competência transmitidas",
    ok: obrigacoesAbertas.qtd === 0,
    detalhe: obrigacoesAbertas.qtd > 0 ? `${obrigacoesAbertas.qtd} obrigação(ões) pendente(s)` : "Todas transmitidas (ou nenhuma cadastrada)",
    qtd_pendente: obrigacoesAbertas.qtd,
  });

  const totalItens = checklist.length;
  const itensOk = checklist.filter(c => c.ok).length;
  const percentualPronto = ((itensOk / totalItens) * 100).toFixed(0);
  const totalPendencias = checklist.reduce((a, c) => a + c.qtd_pendente, 0);

  let status;
  if (percentualPronto == 100) status = "pronto";
  else if (percentualPronto >= 70) status = "quase_pronto";
  else status = "nao_pronto";

  return { competencia, checklist, percentual_pronto: Number(percentualPronto), total_pendencias: totalPendencias, status };
}

module.exports = { avaliarFechamento };