const pool = require("../../config/db");
const { avaliarLancamento } = require("../../services/automacaoFinanceiraService");
const { resolverTemplate } = require("../engine/TemplateResolver");

module.exports = async (node, context) => {
  const cfg = node.config || {};
  if (!context.tenantId) throw new Error("Contexto sem tenant_id");

  const tipo = resolverTemplate(cfg.tipo, context);
  const descricao = resolverTemplate(cfg.descricao, context);
  const valor = resolverTemplate(String(cfg.valor), context);
  const dataVencimento = resolverTemplate(cfg.data_vencimento, context);
  const costCenterId = resolverTemplate(String(cfg.cost_center_id), context);

  if (!["receita", "despesa"].includes(tipo)) throw new Error(`Tipo invalido para lancamento financeiro: ${tipo}`);
  if (!descricao || !valor || !dataVencimento || !costCenterId) {
    throw new Error("finance_create_entry exige: tipo, descricao, valor, data_vencimento, cost_center_id");
  }

  const [result] = await pool.query(
    `INSERT INTO financial_entries
      (tenant_id, tipo, categoria, cost_center_id, descricao, entidade_nome, entidade_documento,
       valor, data_vencimento, parcela_atual, total_parcelas, forma_pagamento, status, aprovacao_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, 'pendente', ?)`,
    [
      context.tenantId, tipo, cfg.categoria || "outros", costCenterId, descricao,
      cfg.entidade_nome ? resolverTemplate(cfg.entidade_nome, context) : null,
      cfg.entidade_documento || null, valor, dataVencimento,
      cfg.forma_pagamento || null, cfg.requer_aprovacao ? "pendente" : "nao_requer",
    ]
  );

  // Reaproveita o MESMO motor de regras que a criacao manual pela tela usa
  try { await avaliarLancamento(context.tenantId, result.insertId); } catch { /* nao bloqueia por erro de automacao */ }

  return { output: { entry_id: result.insertId }, log: `Lancamento financeiro ${result.insertId} criado (${tipo}, R$ ${valor})` };
};