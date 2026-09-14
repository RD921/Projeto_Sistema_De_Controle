const pool = require("../config/db");
const eventDispatcher = require("../automation/engine/EventDispatcher");

// Mesmo padrao idempotente ja validado em financialEventsService.js: varre tarefas
// vencidas e nao notificadas, dispara o evento uma unica vez por tarefa.
async function checarTarefasVencidas(tenantId) {
  const [tarefas] = await pool.query(
    `SELECT t.id, t.titulo, t.prazo, t.customer_id, t.deal_id, c.nome AS customer_nome
     FROM crm_tasks t
     LEFT JOIN customers c ON c.id = t.customer_id
     WHERE t.tenant_id = ? AND t.concluida = FALSE
       AND t.prazo < NOW() AND t.overdue_notified_at IS NULL`,
    [tenantId]
  );

  for (const tarefa of tarefas) {
    try {
      await eventDispatcher.dispatch("crm_task_overdue", tenantId, {
        task_id: tarefa.id, titulo: tarefa.titulo, prazo: tarefa.prazo,
        customer_id: tarefa.customer_id, customer_nome: tarefa.customer_nome, deal_id: tarefa.deal_id,
      });
      await pool.query("UPDATE crm_tasks SET overdue_notified_at = NOW() WHERE id = ?", [tarefa.id]);
    } catch (err) {
      console.error(`[CRM_TASKS] Erro ao notificar tarefa ${tarefa.id}:`, err.message);
    }
  }
  return tarefas.length;
}

async function checarTodosTenants() {
  const [tenants] = await pool.query("SELECT id FROM tenants WHERE ativo = 1");
  let total = 0;
  for (const t of tenants) {
    total += await checarTarefasVencidas(t.id);
  }
  return total;
}

module.exports = { checarTarefasVencidas, checarTodosTenants };