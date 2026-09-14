const pool = require("../../config/db");
const engine = require("./AutomationEngine");

async function dispatch(eventType, tenantId, payload = {}) {
  const [automacoesComTrigger] = await pool.query(
    `SELECT DISTINCT a.id, a.name
     FROM automations a
     JOIN automation_nodes n ON n.automation_id = a.id
     WHERE a.tenant_id = ?
       AND a.status = "active"
       AND n.type = "event_trigger"
       AND JSON_UNQUOTE(JSON_EXTRACT(n.config, "$.event_type")) = ?`,
    [tenantId, eventType]
  );

  for (const automacao of automacoesComTrigger) {
    try {
      const resultado = await engine.execute(automacao.id, tenantId, payload);
      console.log(`[EVENT] ${eventType} disparou automacao "${automacao.name}" (id ${automacao.id})`);

      // Se essa automacao esta vinculada a uma campanha de marketing e o payload
      // do evento traz um lead_id, matricula o lead na jornada (visibilidade
      // de "em qual etapa cada lead esta" sem duplicar o motor de automacao).
      if (resultado?.executionId) {
        try {
          const [[campanha]] = await pool.query(
            "SELECT id FROM marketing_campaigns WHERE automation_id = ? AND tenant_id = ?",
            [automacao.id, tenantId]
          );
          if (campanha && payload.lead_id) {
            await pool.query(
              "INSERT INTO marketing_journey_enrollments (tenant_id, campaign_id, lead_id, execution_id) VALUES (?, ?, ?, ?)",
              [tenantId, campanha.id, payload.lead_id, resultado.executionId]
            );
          }
        } catch (errEnroll) {
          console.error(`[EVENT] Erro ao matricular lead na jornada:`, errEnroll.message);
        }
      }
    } catch (err) {
      console.error(`[EVENT] Erro ao executar automacao ${automacao.id}:`, err.message);
    }
  }

  await pool.query(
    "INSERT INTO automation_events (tenant_id, event_type, payload, automations_disparadas) VALUES (?, ?, ?, ?)",
    [tenantId, eventType, JSON.stringify(payload), automacoesComTrigger.length]
  );

  return { evento: eventType, automacoesDisparadas: automacoesComTrigger.length };
}

module.exports = { dispatch };