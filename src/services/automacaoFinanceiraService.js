const pool = require("../config/db");

// Avalia todas as regras ativas contra um lançamento e executa a primeira que bater.
// Retorna { acao, regra_id } ou null se nenhuma regra bateu.
async function avaliarLancamento(tenantId, entryId) {
  const [[entry]] = await pool.query(
    "SELECT * FROM financial_entries WHERE id = ? AND tenant_id = ?",
    [entryId, tenantId]
  );
  if (!entry) return null;

  const [regras] = await pool.query(
    "SELECT * FROM financial_automation_rules WHERE tenant_id = ? AND ativo = TRUE ORDER BY ordem ASC",
    [tenantId]
  );

  for (const regra of regras) {
    if (regra.condicao_tipo && regra.condicao_tipo !== entry.tipo) continue;
    if (regra.condicao_categoria && regra.condicao_categoria !== entry.categoria) continue;
    if (regra.condicao_cost_center_id && regra.condicao_cost_center_id !== entry.cost_center_id) continue;

    if (regra.condicao_valor_operador) {
      const valor = Number(entry.valor);
      const min = Number(regra.condicao_valor_min);
      const max = Number(regra.condicao_valor_max);
      let bateValor = false;
      if (regra.condicao_valor_operador === "maior_que") bateValor = valor > min;
      else if (regra.condicao_valor_operador === "menor_que") bateValor = valor < min;
      else if (regra.condicao_valor_operador === "igual") bateValor = valor === min;
      else if (regra.condicao_valor_operador === "entre") bateValor = valor >= min && valor <= max;
      if (!bateValor) continue;
    }

    // Regra bateu — executa a ação
    await executarAcao(tenantId, entry, regra);
    return { acao: regra.acao, regra_id: regra.id };
  }

  return null;
}

async function executarAcao(tenantId, entry, regra) {
  let detalhes = `Regra "${regra.nome}" aplicada`;

  if (regra.acao === "aprovar_automatico") {
    await pool.query(
      "UPDATE financial_entries SET aprovacao_status = 'aprovado' WHERE id = ?",
      [entry.id]
    );
  } else if (regra.acao === "exigir_aprovacao") {
    await pool.query(
      "UPDATE financial_entries SET aprovacao_status = 'pendente' WHERE id = ?",
      [entry.id]
    );
  } else if (regra.acao === "marcar_pago_automatico") {
    await pool.query(
      "UPDATE financial_entries SET status = 'pago', data_pagamento = CURDATE(), aprovacao_status = 'aprovado' WHERE id = ?",
      [entry.id]
    );
  } else if (regra.acao === "rejeitar") {
    await pool.query(
      "UPDATE financial_entries SET aprovacao_status = 'rejeitado' WHERE id = ?",
      [entry.id]
    );
  }

  await pool.query(
    `INSERT INTO financial_automation_logs (tenant_id, rule_id, financial_entry_id, acao_executada, detalhes)
     VALUES (?, ?, ?, ?, ?)`,
    [tenantId, regra.id, entry.id, regra.acao, detalhes]
  );
}

module.exports = { avaliarLancamento };