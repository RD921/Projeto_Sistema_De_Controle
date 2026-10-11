const cron = require("node-cron");
const pool = require("../../config/db");
const leadSvc = require("../../services/marketing/leadService");
const analytics = require("../../services/marketing/analyticsService");
const recovery = require("../../services/marketing/recoveryService");
const aria = require("../../services/marketing/ariaMarketingService");

// Rotina diária do Marketing para cada empresa que já usa o módulo:
// 1) traz conversões do CRM/pedidos, 2) atribui receita às campanhas,
// 3) roda as regras de recuperação (cria tarefas), 4) atualiza os alertas da Aria.
async function rodarTodos() {
  const [tenants] = await pool.query("SELECT tenant_id FROM marketing_tenant_setup");
  let ok = 0;
  for (const { tenant_id: tenantId } of tenants) {
    try {
      await leadSvc.sincronizarConversoes(tenantId);
      await analytics.atribuirReceita(tenantId);
      await recovery.executar(tenantId);
      await aria.gerarRecomendacoes(tenantId);
      ok++;
    } catch (err) {
      console.error(`[MARKETING_CRON] Erro na empresa ${tenantId}:`, err.message);
    }
  }
  return ok;
}

function init() {
  cron.schedule("30 7 * * *", async () => {
    try {
      const total = await rodarTodos();
      console.log(`[MARKETING_CRON] Rotina diária concluída para ${total} empresa(s)`);
    } catch (err) {
      console.error("[MARKETING_CRON] Erro na rotina diária:", err.message);
    }
  });
  console.log("[MARKETING_CRON] Rotina diária do Marketing agendada (07:30)");
}

module.exports = { init, rodarTodos };
