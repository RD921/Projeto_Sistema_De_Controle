const pool = require("../config/db");
const eventDispatcher = require("../automation/engine/EventDispatcher");

async function checarContasReceberVencidas(tenantId) {
  const [contas] = await pool.query(
    `SELECT id, descricao, valor, data_vencimento, entidade_nome
     FROM financial_entries
     WHERE tenant_id = ? AND tipo = 'receita' AND status != 'pago'
       AND data_vencimento < CURDATE() AND overdue_notified_at IS NULL`,
    [tenantId]
  );

  for (const conta of contas) {
    const diasAtraso = Math.floor((Date.now() - new Date(conta.data_vencimento).getTime()) / 86400000);
    try {
      await eventDispatcher.dispatch("financial.account_receivable.overdue", tenantId, {
        entry_id: conta.id, descricao: conta.descricao, cliente: conta.entidade_nome || null,
        valor: Number(conta.valor), data_vencimento: conta.data_vencimento, dias_atraso: diasAtraso,
      });
      await pool.query("UPDATE financial_entries SET overdue_notified_at = NOW() WHERE id = ?", [conta.id]);
    } catch (err) {
      console.error(`[FINANCIAL_EVENTS] Erro ao notificar receber ${conta.id}:`, err.message);
    }
  }
  return contas.length;
}

// Mesmo padrao da funcao acima, mas para contas a pagar (despesas) vencidas.
async function checarContasPagarVencidas(tenantId) {
  const [contas] = await pool.query(
    `SELECT id, descricao, valor, data_vencimento, entidade_nome
     FROM financial_entries
     WHERE tenant_id = ? AND tipo = 'despesa' AND status != 'pago'
       AND data_vencimento < CURDATE() AND overdue_notified_at IS NULL`,
    [tenantId]
  );

  for (const conta of contas) {
    const diasAtraso = Math.floor((Date.now() - new Date(conta.data_vencimento).getTime()) / 86400000);
    try {
      await eventDispatcher.dispatch("financial.account_payable.overdue", tenantId, {
        entry_id: conta.id, descricao: conta.descricao, fornecedor: conta.entidade_nome || null,
        valor: Number(conta.valor), data_vencimento: conta.data_vencimento, dias_atraso: diasAtraso,
      });
      await pool.query("UPDATE financial_entries SET overdue_notified_at = NOW() WHERE id = ?", [conta.id]);
    } catch (err) {
      console.error(`[FINANCIAL_EVENTS] Erro ao notificar pagar ${conta.id}:`, err.message);
    }
  }
  return contas.length;
}

async function checarTodosTenants() {
  const [tenants] = await pool.query("SELECT id FROM tenants WHERE ativo = 1");
  let total = 0;
  for (const t of tenants) {
    total += await checarContasReceberVencidas(t.id);
    total += await checarContasPagarVencidas(t.id);
  }
  return total;
}

module.exports = { checarContasReceberVencidas, checarContasPagarVencidas, checarTodosTenants };