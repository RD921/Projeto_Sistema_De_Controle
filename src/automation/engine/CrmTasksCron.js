const cron = require("node-cron");
const { checarTodosTenants } = require("../../services/crmTasksService");

function init() {
  // Verifica tarefas vencidas a cada hora
  cron.schedule("0 * * * *", async () => {
    try {
      const total = await checarTodosTenants();
      console.log(`[CRM_TASKS] Varredura concluida - ${total} tarefa(s) notificada(s)`);
    } catch (err) {
      console.error("[CRM_TASKS] Erro na varredura:", err.message);
    }
  });
  console.log("[CRM_TASKS] Cron de tarefas vencidas agendado (a cada hora)");
}

module.exports = { init };