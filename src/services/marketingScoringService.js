const pool = require("../config/db");

function calcularTemperatura(score) {
  if (score >= 70) return "quente";
  if (score >= 30) return "morno";
  return "frio";
}

// Campos do lead que podem ser usados em regras de pontuação por atributo.
const CAMPOS_ATRIBUTO = ["origem", "canal", "interesse", "empresa", "email", "telefone", "valor_estimado", "utm_source", "utm_medium", "utm_campaign", "campaign_id"];
const OPERADORES_ATRIBUTO = ["igual", "diferente", "maior_igual", "menor_igual", "contem", "preenchido", "vazio"];

function normalizar(v) {
  return String(v ?? "").trim().toLowerCase();
}

function atendeRegra(lead, regra) {
  const bruto = lead[regra.campo];
  const vazio = bruto === null || bruto === undefined || String(bruto).trim() === "";
  switch (regra.operador) {
    case "preenchido": return !vazio;
    case "vazio": return vazio;
    case "igual": return !vazio && normalizar(bruto) === normalizar(regra.valor);
    case "diferente": return vazio || normalizar(bruto) !== normalizar(regra.valor);
    case "contem": return !vazio && normalizar(bruto).includes(normalizar(regra.valor));
    case "maior_igual": return !vazio && Number(bruto) >= Number(regra.valor);
    case "menor_igual": return !vazio && Number(bruto) <= Number(regra.valor);
    default: return false;
  }
}

function descreverRegra(regra) {
  if (regra.descricao) return regra.descricao;
  const op = { igual: "=", diferente: "≠", maior_igual: "≥", menor_igual: "≤", contem: "contém", preenchido: "preenchido", vazio: "vazio" }[regra.operador] || regra.operador;
  return `${regra.campo} ${op}${["preenchido", "vazio"].includes(regra.operador) ? "" : " " + regra.valor}`;
}

async function gravarScore(tenantId, leadId, scoreFinal) {
  const temperatura = calcularTemperatura(scoreFinal);
  await pool.query("UPDATE marketing_leads SET score = ?, temperatura = ? WHERE id = ? AND tenant_id = ?", [scoreFinal, temperatura, leadId, tenantId]);
  return temperatura;
}

// Aplica as regras de EVENTO ativas de um tenant (ex: lead_created, interacao_resposta)
// sobre um lead, atualiza score/temperatura e registra o histórico (o "porquê" do score).
async function aplicarRegras(tenantId, leadId, eventType) {
  const [regras] = await pool.query(
    "SELECT * FROM marketing_scoring_rules WHERE tenant_id = ? AND event_type = ? AND tipo = 'evento' AND ativa = TRUE",
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
  const temperatura = await gravarScore(tenantId, leadId, scoreAtual);
  return { aplicado: true, score_final: scoreAtual, temperatura, regras_aplicadas: regras.length };
}

// Aplica as regras de ATRIBUTO (perfil/origem/interesse/valor) que o lead atende e que
// ainda não foram aplicadas a ele. Cada regra pontua no máximo uma vez por lead.
async function aplicarAtributos(tenantId, leadId) {
  const [[lead]] = await pool.query("SELECT * FROM marketing_leads WHERE id = ? AND tenant_id = ?", [leadId, tenantId]);
  if (!lead) return { aplicado: false, motivo: "lead nao encontrado" };

  const [regras] = await pool.query(
    "SELECT * FROM marketing_scoring_rules WHERE tenant_id = ? AND tipo = 'atributo' AND ativa = TRUE", [tenantId]);
  if (regras.length === 0) return { aplicado: false, motivo: "nenhuma regra de atributo ativa" };

  const [jaAplicadas] = await pool.query(
    "SELECT DISTINCT rule_id FROM marketing_lead_score_history WHERE lead_id = ? AND rule_id IS NOT NULL", [leadId]);
  const aplicadas = new Set(jaAplicadas.map(r => r.rule_id));

  let scoreAtual = lead.score;
  let n = 0;
  for (const regra of regras) {
    if (aplicadas.has(regra.id) || !CAMPOS_ATRIBUTO.includes(regra.campo)) continue;
    if (!atendeRegra(lead, regra)) continue;
    scoreAtual = Math.max(0, scoreAtual + regra.pontos);
    await pool.query(
      "INSERT INTO marketing_lead_score_history (lead_id, tenant_id, rule_id, pontos_aplicados, score_resultante, motivo) VALUES (?, ?, ?, ?, ?, ?)",
      [leadId, tenantId, regra.id, regra.pontos, scoreAtual, descreverRegra(regra)]
    );
    n++;
  }
  if (n === 0) return { aplicado: false, motivo: "nenhuma regra nova atendida" };
  const temperatura = await gravarScore(tenantId, leadId, scoreAtual);
  return { aplicado: true, score_final: scoreAtual, temperatura, regras_aplicadas: n };
}

// Explica em linguagem simples por que o lead tem o score que tem e o que fazer agora.
async function explicarLead(lead, historico = null) {
  const hist = historico || (await pool.query(
    "SELECT pontos_aplicados, motivo FROM marketing_lead_score_history WHERE lead_id = ? ORDER BY created_at DESC LIMIT 50", [lead.id]))[0];
  const agregados = new Map();
  for (const h of hist) agregados.set(h.motivo, (agregados.get(h.motivo) || 0) + h.pontos_aplicados);
  const principais = [...agregados.entries()]
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 4)
    .map(([motivo, pontos]) => `${pontos > 0 ? "+" : ""}${pontos} ${motivo}`);

  const diasSemContato = lead.ultimo_contato_em
    ? Math.floor((Date.now() - new Date(lead.ultimo_contato_em).getTime()) / 86400000)
    : Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000);

  let proximaAcao = lead.proxima_acao || null;
  if (!proximaAcao) {
    if (["cliente", "perdido", "inativo"].includes(lead.status)) proximaAcao = null;
    else if (!lead.deal_id && ["qualificado", "oportunidade"].includes(lead.status)) proximaAcao = "Enviar ao CRM e abrir uma oportunidade";
    else if (!lead.ultimo_contato_em && lead.status === "novo") proximaAcao = "Fazer o primeiro contato";
    else if (diasSemContato >= 3) proximaAcao = `Retomar o contato (${diasSemContato} dias sem interação)`;
    else proximaAcao = "Acompanhar e registrar a próxima interação";
  }

  const partes = [`Score ${lead.score} (${lead.temperatura})`];
  if (principais.length) partes.push("Composição: " + principais.join(", "));
  if (!["cliente", "perdido", "inativo"].includes(lead.status)) partes.push(`${diasSemContato} dia(s) desde o último contato`);
  return { motivos: principais, dias_sem_contato: diasSemContato, proxima_acao: proximaAcao, explicacao: partes.join(". ") + "." };
}

module.exports = { aplicarRegras, aplicarAtributos, explicarLead, calcularTemperatura, CAMPOS_ATRIBUTO, OPERADORES_ATRIBUTO };
