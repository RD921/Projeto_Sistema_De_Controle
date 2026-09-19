const cron = require("node-cron");
const { verificarTodosTenants } = require("../../services/sacSlaService");

function init() {
  // Verifica SLA de todos os tickets abertos, de todas as empresas, a cada 15 minutos.
  // Antes disso, so disparava quando alguem chamava POST /sac/sla/verificar manualmente.
  cron.schedule("*/15 * * * *", async () => {
    try {
      const total = await verificarTodosTenants();
      console.log(`[SAC_SLA] Verificacao concluida - ${total} evento(s) de SLA disparado(s)`);
    } catch (err) {
      console.error("[SAC_SLA] Erro na verificacao:", err.message);
    }
  });
  console.log("[SAC_SLA] Cron de verificacao de SLA agendado (a cada 15 minutos)");
}

module.exports = { init };