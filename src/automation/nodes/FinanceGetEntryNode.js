const pool = require("../../config/db");
const { resolverTemplate } = require("../engine/TemplateResolver");

module.exports = async (node, context) => {
  const cfg = node.config || {};
  if (!context.tenantId) throw new Error("Contexto sem tenant_id");

  const entryId = resolverTemplate(String(cfg.entry_id), context);
  if (!entryId) throw new Error("finance_get_entry exige entry_id");

  const [[row]] = await pool.query(
    "SELECT * FROM financial_entries WHERE id = ? AND tenant_id = ?",
    [entryId, context.tenantId]
  );
  if (!row) throw new Error(`Lancamento ${entryId} nao encontrado neste tenant`);

  return { output: row, log: `Lancamento ${entryId} consultado (status: ${row.status})` };
};