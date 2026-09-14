const pool = require("../config/db");

// Varre os dados do tenant e gera/atualiza alertas. Roda sob demanda (botão) ou pode ser agendado depois.
async function gerarAlertas(tenantId) {
  const alertasGerados = [];

  // ── 1. Risco de caixa (usa a mesma lógica do fluxo preditivo) ──
  const [[saldoRow]] = await pool.query(
    `SELECT COALESCE(SUM(
       saldo_inicial + (SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 0) FROM bank_transactions bt WHERE bt.bank_account_id = ba.id)
     ), 0) AS saldo_atual
     FROM bank_accounts ba WHERE ba.tenant_id = ? AND ba.ativo = TRUE`,
    [tenantId]
  );
  let saldoProjetado = Number(saldoRow.saldo_atual);

  const [movimentosFuturos] = await pool.query(
    `SELECT data_vencimento AS data, tipo, SUM(valor) AS valor
     FROM financial_entries
     WHERE tenant_id = ? AND status != 'pago' AND data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY)
     GROUP BY data_vencimento, tipo ORDER BY data_vencimento ASC`,
    [tenantId]
  );
  let diaCritico = null;
  for (const m of movimentosFuturos) {
    saldoProjetado += m.tipo === "receita" ? Number(m.valor) : -Number(m.valor);
    if (saldoProjetado < 0 && !diaCritico) diaCritico = m.data;
  }
  if (diaCritico) {
    const dias = Math.round((new Date(diaCritico) - new Date()) / 86400000);
    alertasGerados.push({
      tipo: "risco_caixa", severidade: dias <= 7 ? "critico" : dias <= 20 ? "importante" : "atencao",
      titulo: `Risco de caixa em ${dias} dia(s)`,
      descricao: `O saldo projetado fica negativo a partir de ${new Date(diaCritico).toLocaleDateString("pt-BR")}.`,
    });
  }

  // ── 2. Obrigações fiscais próximas (7 dias) ou atrasadas ──
  const [obrigacoes] = await pool.query(
    `SELECT id, nome, prazo, DATEDIFF(prazo, CURDATE()) AS dias
     FROM fiscal_obligations
     WHERE tenant_id = ? AND status NOT IN ('transmitido','recebido') AND prazo <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)`,
    [tenantId]
  );
  obrigacoes.forEach(o => {
    const atrasado = o.dias < 0;
    alertasGerados.push({
      tipo: "obrigacao_proxima",
      severidade: atrasado ? "critico" : o.dias <= 2 ? "importante" : "atencao",
      titulo: atrasado ? `Obrigação atrasada: ${o.nome}` : `Obrigação vence em ${o.dias} dia(s): ${o.nome}`,
      descricao: `Prazo: ${new Date(o.prazo).toLocaleDateString("pt-BR")}`,
      referencia_tipo: "fiscal_obligation", referencia_id: o.id,
    });
  });

  // ── 3. Despesas acima do orçamento no mês atual (desvio > 15%) ──
  const mesAtual = new Date().toISOString().slice(0, 7);
  const [orcamentos] = await pool.query(
    `SELECT b.id, b.categoria, b.valor_planejado, cc.nome AS cost_center_nome,
       COALESCE((SELECT SUM(valor) FROM financial_entries fe
                 WHERE fe.tenant_id = b.tenant_id AND fe.tipo = b.tipo AND fe.categoria = b.categoria
                   AND fe.cost_center_id = b.cost_center_id AND fe.status = 'pago'
                   AND DATE_FORMAT(fe.data_vencimento, '%Y-%m') = ?), 0) AS realizado
     FROM budgets b
     JOIN cost_centers cc ON cc.id = b.cost_center_id
     WHERE b.tenant_id = ? AND b.competencia = ? AND b.tipo = 'despesa'`,
    [mesAtual, tenantId, mesAtual]
  );
  orcamentos.forEach(o => {
    const planejado = Number(o.valor_planejado);
    const realizado = Number(o.realizado);
    if (planejado > 0 && realizado > planejado * 1.15) {
      const desvioPct = (((realizado - planejado) / planejado) * 100).toFixed(0);
      alertasGerados.push({
        tipo: "despesa_acima_orcamento",
        severidade: desvioPct > 50 ? "critico" : desvioPct > 25 ? "importante" : "atencao",
        titulo: `${o.categoria} (${o.cost_center_nome}) ${desvioPct}% acima do orçado`,
        descricao: `Planejado ${planejado.toFixed(2)}, realizado ${realizado.toFixed(2)} em ${mesAtual}.`,
      });
    }
  });

  // ── 4. Contas a receber vencidas há mais de 15 dias (inadimplência) ──
  const [inadimplentes] = await pool.query(
    `SELECT COUNT(*) AS qtd, COALESCE(SUM(valor), 0) AS total
     FROM financial_entries
     WHERE tenant_id = ? AND tipo = 'receita' AND status != 'pago' AND DATEDIFF(CURDATE(), data_vencimento) > 15`,
    [tenantId]
  );
  if (inadimplentes[0].qtd > 0) {
    alertasGerados.push({
      tipo: "inadimplencia",
      severidade: Number(inadimplentes[0].total) > 10000 ? "critico" : "importante",
      titulo: `${inadimplentes[0].qtd} recebível(is) em atraso há mais de 15 dias`,
      descricao: `Total em atraso: R$ ${Number(inadimplentes[0].total).toFixed(2)}.`,
    });
  }

  // Limpa alertas antigos não resolvidos manualmente e insere os novos (evita acúmulo de duplicatas)
  await pool.query("DELETE FROM financial_alerts WHERE tenant_id = ? AND resolvido = FALSE", [tenantId]);
  for (const a of alertasGerados) {
    await pool.query(
      `INSERT INTO financial_alerts (tenant_id, tipo, severidade, titulo, descricao, referencia_tipo, referencia_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, a.tipo, a.severidade, a.titulo, a.descricao || null, a.referencia_tipo || null, a.referencia_id || null]
    );
  }

  return alertasGerados.length;
}

module.exports = { gerarAlertas };