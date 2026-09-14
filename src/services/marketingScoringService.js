const pool = require("../config/db");

function calcularTemperatura(score) {
  if (score >= 70) return "quente";
  if (score >= 30) return "morno";
  return "frio";
}

// Aplica todas as regras ativas de um tenant para um determinado event_type
// sobre um lead especifico, atualiza score/temperatura e registra historico.
async function aplicarRegras(tenantId, leadId, eventType) {
  const [regras] = await pool.query(
    "SELECT * FROM marketing_scoring_rules WHERE tenant_id = ? AND event_type = ? AND ativa = TRUE",
    [tenantId, eventType]
  );
  if (regras.length === 0) return { aplicado: false, motivo: "nenhuma regra ativa para este evento" };

  const [[leadAtual]] = await pool.query("SELECT score FROM marketing_leads WHERE id = ? AND tenant_id = ?", [leadId, tenantId]);
  if (!leadAtual) return { aplicado: false, motivo: "lead nao encontrado" };

  let scoreAtual = leadAtual.score;

  for (const regra of regras) {
    scoreAtual = Math.max(0, scoreAtual + regra.pontos);
    await pool.query(
      "INSERT INTO marketing_lead_score_history (lead_id, tenant_id, rule_id, pontos_aplicados, score_resultante, motivo) VALUES (?, ?, ?, ?, ?, ?)",
      [leadId, tenantId, regra.id, regra.pontos, scoreAtual, regra.descricao || eventType]
    );
  }

  const temperatura = calcularTemperatura(scoreAtual);
  await pool.query("UPDATE marketing_leads SET score = ?, temperatura = ? WHERE id = ?", [scoreAtual, temperatura, leadId]);

  return { aplicado: true, score_final: scoreAtual, temperatura, regras_aplicadas: regras.length };
}

module.exports = { aplicarRegras, calcularTemperatura };