// src/automation/engine/FinancialEventsCron.js
const cron = require("node-cron");
const { checarTodosTenants } = require("../../services/financialEventsService");

function init() {
  // Roda todo dia as 06:00 - varre contas a receber vencidas de todos os tenants ativos
  cron.schedule("0 6 * * *", async () => {
    try {
      const qtd = await checarTodosTenants();
      console.log(`[FINANCIAL_EVENTS] Varredura concluida - ${qtd} evento(s) disparado(s)`);
    } catch (err) {
      console.error("[FINANCIAL_EVENTS] Erro na varredura:", err.message);
    }
  });
  console.log("[FINANCIAL_EVENTS] Cron de eventos financeiros agendado (06:00 diario)");
}

module.exports = { init };