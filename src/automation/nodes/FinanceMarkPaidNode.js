const pool = require("../../config/db");
const { resolverTemplate } = require("../engine/TemplateResolver");

module.exports = async (node, context) => {
  const cfg = node.config || {};
  if (!context.tenantId) throw new Error("Contexto sem tenant_id");

  const entryId = resolverTemplate(String(cfg.entry_id), context);
  if (!entryId) throw new Error("finance_mark_paid exige entry_id");

  const [result] = await pool.query(
    "UPDATE financial_entries SET status = 'pago', data_pagamento = CURDATE() WHERE id = ? AND tenant_id = ?",
    [entryId, context.tenantId]
  );
  if (result.affectedRows === 0) throw new Error(`Lancamento ${entryId} nao encontrado neste tenant`);

  return { output: { entry_id: Number(entryId) }, log: `Lancamento ${entryId} marcado como pago` };
};