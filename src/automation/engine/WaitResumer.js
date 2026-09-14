const cron = require("node-cron");
const pool = require("../../config/db");
const engine = require("./AutomationEngine");

function init() {
  cron.schedule("*/1 * * * *", async () => {
    try {
      const [pendentes] = await pool.query(
        "SELECT execution_id FROM automation_execution_state WHERE wait_reason = 'delay' AND resume_at IS NOT NULL AND resume_at <= NOW()"
      );
      for (const p of pendentes) {
        try {
          await engine.resume(p.execution_id);
          console.log(`[WAIT_RESUMER] Execucao ${p.execution_id} retomada`);
        } catch (err) {
          console.error(`[WAIT_RESUMER] Erro ao retomar execucao ${p.execution_id}:`, err.message);
        }
      }
    } catch (err) {
      console.error("[WAIT_RESUMER] Erro na varredura:", err.message);
    }
  });
  console.log("[WAIT_RESUMER] Cron de retomada agendado (a cada 1 minuto)");
}

module.exports = { init };