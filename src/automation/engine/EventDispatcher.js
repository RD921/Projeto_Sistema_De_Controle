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
      await engine.execute(automacao.id, tenantId, payload);
      console.log(`[EVENT] ${eventType} disparou automacao "${automacao.name}" (id ${automacao.id})`);
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
