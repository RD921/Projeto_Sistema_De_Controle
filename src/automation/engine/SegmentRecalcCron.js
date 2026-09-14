const cron = require("node-cron");
const { recalcularTodosDinamicos } = require("../../services/marketingSegmentEngine");

function init() {
  // Recalcula todos os segmentos dinamicos a cada 15 minutos
  cron.schedule("*/15 * * * *", async () => {
    try {
      const total = await recalcularTodosDinamicos();
      console.log(`[SEGMENT_RECALC] ${total} segmento(s) dinamico(s) recalculado(s)`);
    } catch (err) {
      console.error("[SEGMENT_RECALC] Erro na varredura:", err.message);
    }
  });
  console.log("[SEGMENT_RECALC] Cron de recalculo de segmentos agendado (a cada 15 minutos)");
}

module.exports = { init };