// Regras de negócio dos leads de marketing, usadas por formulários, landing pages,
// telas do painel, automações e pela Aria. Fica tudo aqui para ter UM jeito só de
// criar lead, mudar status e enviar ao CRM.
const pool = require("../../config/db");
const eventDispatcher = require("../../automation/engine/EventDispatcher");
const { aplicarRegras, aplicarAtributos } = require("../marketingScoringService");
const { prepararTenant } = require("../marketingSchema");

const STATUS_VALIDOS = ["novo", "contactado", "engajado", "qualificado", "oportunidade", "cliente", "perdido", "inativo"];
const STATUS_FINAIS = ["cliente", "perdido", "inativo"];

const texto = (v, max) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};
const soDigitos = v => (v ? String(v).replace(/\D/g, "").slice(-11) : "");
const emailValido = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

class ErroValidacao extends Error {}

async function registrarEvento(tenantId, leadId, tipo, descricao = null, dados = null, userId = null) {
  await pool.query(
    "INSERT INTO marketing_lead_events (tenant_id, lead_id, tipo, descricao, dados, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    [tenantId, leadId, tipo, descricao ? String(descricao).slice(0, 500) : null, dados ? JSON.stringify(dados) : null, userId]);
}

async function dispararEvento(nome, tenantId, payload) {
  try { await eventDispatcher.dispatch(nome, tenantId, payload); } catch { /* automação não pode travar o lead */ }
}

// Descobre a campanha/UTM a partir do link rastreável (?mkt=slug) ou do formulário.
async function resolverOrigem(tenantId, dados) {
  const out = {
    campaign_id: null, tracking_link_id: null, utm_source: texto(dados.utm_source, 150), utm_medium: texto(dados.utm_medium, 150),
    utm_campaign: texto(dados.utm_campaign, 150), utm_content: texto(dados.utm_content, 150), utm_term: texto(dados.utm_term, 150),
  };
  const slug = texto(dados.mkt, 40);
  if (slug) {
    const [[link]] = await pool.query("SELECT * FROM marketing_tracking_links WHERE slug = ? AND tenant_id = ?", [slug, tenantId]);
    if (link) {
      out.campaign_id = link.campaign_id || null;
      out.tracking_link_id = link.id;
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) out[k] = out[k] || link[k];
    }
  }
  const cid = Number(dados.campaign_id);
  if (!out.campaign_id && cid) {
    const [[c]] = await pool.query("SELECT id FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [cid, tenantId]);
    if (c) out.campaign_id = c.id;
  }
  return out;
}

async function etapaInicial(tenantId) {
  const funnelId = await prepararTenant(tenantId).then(async () => {
    const [[f]] = await pool.query("SELECT id FROM marketing_funnels WHERE tenant_id = ? AND padrao = TRUE LIMIT 1", [tenantId]);
    return f.id;
  });
  const [[stage]] = await pool.query(
    "SELECT id, ordem FROM marketing_funnel_stages WHERE funnel_id = ? AND tipo = 'etapa' ORDER BY ordem LIMIT 1", [funnelId]);
  return stage;
}

// Cria um lead (ou atualiza o existente se o e-mail/telefone já estiver na base).
// opts: { userId, origemPadrao, canalPadrao, ip }
async function criarLead(tenantId, dados, opts = {}) {
  await prepararTenant(tenantId);
  const nome = texto(dados.nome, 255);
  if (!nome) throw new ErroValidacao("nome é obrigatório");
  const email = texto(dados.email, 255)?.toLowerCase() || null;
  if (email && !emailValido(email)) throw new ErroValidacao("e-mail inválido");
  const telefone = texto(dados.telefone, 50);
  const tel = soDigitos(telefone);
  if (telefone && tel.length < 8) throw new ErroValidacao("telefone inválido");
  if (!email && !telefone) throw new ErroValidacao("informe e-mail ou telefone para contato");
  const valor = dados.valor_estimado === undefined || dados.valor_estimado === "" || dados.valor_estimado === null ? null : Number(dados.valor_estimado);
  if (valor !== null && (Number.isNaN(valor) || valor < 0)) throw new ErroValidacao("valor estimado inválido");

  const origemInfo = await resolverOrigem(tenantId, dados);
  const origem = texto(dados.origem, 100) || opts.origemPadrao || origemInfo.utm_source || null;
  const canal = texto(dados.canal, 100) || opts.canalPadrao || origemInfo.utm_medium || null;
  const consentimento = dados.consentimento === undefined ? null : (["1", "true", "on", "sim", true, 1].includes(dados.consentimento) ? 1 : 0);

  // Já existe? Atualiza o que estava vazio e registra a reentrada em vez de duplicar.
  const [existentes] = await pool.query(
    `SELECT * FROM marketing_leads WHERE tenant_id = ? AND ((? IS NOT NULL AND email = ?) OR (? <> '' AND telefone_normalizado = ?)) ORDER BY id LIMIT 1`,
    [tenantId, email, email, tel, tel]);
  if (existentes.length) {
    const l = existentes[0];
    await pool.query(
      `UPDATE marketing_leads SET
         telefone = COALESCE(telefone, ?), telefone_normalizado = COALESCE(telefone_normalizado, ?), empresa = COALESCE(empresa, ?),
         interesse = COALESCE(interesse, ?), valor_estimado = COALESCE(valor_estimado, ?), campaign_id = COALESCE(campaign_id, ?), tracking_link_id = COALESCE(tracking_link_id, ?),
         utm_source = COALESCE(utm_source, ?), utm_medium = COALESCE(utm_medium, ?), utm_campaign = COALESCE(utm_campaign, ?),
         consentimento = COALESCE(?, consentimento)
       WHERE id = ?`,
      [telefone, tel || null, texto(dados.empresa, 255), texto(dados.interesse, 255), valor, origemInfo.campaign_id, origemInfo.tracking_link_id,
        origemInfo.utm_source, origemInfo.utm_medium, origemInfo.utm_campaign, consentimento, l.id]);
    await registrarEvento(tenantId, l.id, "reentrada", `Voltou a se cadastrar${origem ? ` via ${origem}` : ""}`, { origem, canal, campaign_id: origemInfo.campaign_id }, opts.userId);
    await aplicarRegras(tenantId, l.id, "reentrada").catch(() => {});
    await aplicarAtributos(tenantId, l.id).catch(() => {});
    return { id: l.id, duplicado: true };
  }

  const etapa = await etapaInicial(tenantId);
  const [r] = await pool.query(
    `INSERT INTO marketing_leads
       (tenant_id, nome, email, telefone, telefone_normalizado, empresa, origem, canal, interesse, valor_estimado,
        campaign_id, tracking_link_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, consentimento,
        responsavel_id, funnel_stage_id, funnel_max_ordem)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, nome, email, telefone, tel || null, texto(dados.empresa, 255), origem, canal, texto(dados.interesse, 255), valor,
      origemInfo.campaign_id, origemInfo.tracking_link_id, origemInfo.utm_source, origemInfo.utm_medium, origemInfo.utm_campaign, origemInfo.utm_content, origemInfo.utm_term,
      consentimento, Number(dados.responsavel_id) || null, etapa.id, etapa.ordem]);
  const leadId = r.insertId;

  await registrarEvento(tenantId, leadId, "criado", `Lead captado${origem ? ` via ${origem}` : ""}${canal ? ` / ${canal}` : ""}`,
    { origem, canal, campaign_id: origemInfo.campaign_id, ip: opts.ip || null }, opts.userId);
  await dispararEvento("lead_created", tenantId, { lead_id: leadId, nome, email, origem, canal, campaign_id: origemInfo.campaign_id, form_id: opts.formId || null });
  await aplicarRegras(tenantId, leadId, "lead_created").catch(() => {});
  await aplicarAtributos(tenantId, leadId).catch(() => {});
  return { id: leadId, duplicado: false };
}

// Atualiza dados cadastrais e reaplica regras de atributo (ex: lead passou a informar telefone).
async function editarLead(tenantId, leadId, dados, userId) {
  const [[lead]] = await pool.query("SELECT * FROM marketing_leads WHERE id = ? AND tenant_id = ?", [leadId, tenantId]);
  if (!lead) return null;
  const campos = {};
  const set = (k, v) => { if (dados[k] !== undefined) campos[k] = v; };
  set("nome", texto(dados.nome, 255) || lead.nome);
  set("email", texto(dados.email, 255)?.toLowerCase() || null);
  set("telefone", texto(dados.telefone, 50));
  set("empresa", texto(dados.empresa, 255));
  set("interesse", texto(dados.interesse, 255));
  set("proxima_acao", texto(dados.proxima_acao, 255));
  set("origem", texto(dados.origem, 100));
  set("canal", texto(dados.canal, 100));
  if (dados.valor_estimado !== undefined) {
    const v = dados.valor_estimado === "" || dados.valor_estimado === null ? null : Number(dados.valor_estimado);
    if (v !== null && (Number.isNaN(v) || v < 0)) throw new ErroValidacao("valor estimado inválido");
    campos.valor_estimado = v;
  }
  if (dados.responsavel_id !== undefined) campos.responsavel_id = Number(dados.responsavel_id) || null;
  if (campos.email && !emailValido(campos.email)) throw new ErroValidacao("e-mail inválido");
  if (campos.telefone !== undefined) campos.telefone_normalizado = soDigitos(campos.telefone) || null;
  const chaves = Object.keys(campos);
  if (!chaves.length) return lead;
  await pool.query(`UPDATE marketing_leads SET ${chaves.map(k => `${k} = ?`).join(", ")} WHERE id = ? AND tenant_id = ?`,
    [...chaves.map(k => campos[k]), leadId, tenantId]);
  await registrarEvento(tenantId, leadId, "editado", `Dados atualizados: ${chaves.filter(k => k !== "telefone_normalizado").join(", ")}`, null, userId);
  await aplicarAtributos(tenantId, leadId).catch(() => {});
  return true;
}

// Troca o status do lead mantendo funil, histórico, pontuação e automações coerentes.
async function mudarStatus(tenantId, leadId, novoStatus, { userId = null, motivo = null } = {}) {
  if (!STATUS_VALIDOS.includes(novoStatus)) throw new ErroValidacao("status inválido");
  await prepararTenant(tenantId);
  const [[lead]] = await pool.query("SELECT * FROM marketing_leads WHERE id = ? AND tenant_id = ?", [leadId, tenantId]);
  if (!lead) return null;
  if (lead.status === novoStatus) return { lead, mudou: false };

  // Etapa correspondente: no funil atual do lead; se não houver, no funil padrão
  let stage = null;
  if (lead.funnel_stage_id) {
    [[stage]] = await pool.query(
      `SELECT s2.* FROM marketing_funnel_stages s1 JOIN marketing_funnel_stages s2 ON s2.funnel_id = s1.funnel_id AND s2.status_lead = ?
       WHERE s1.id = ? LIMIT 1`, [novoStatus, lead.funnel_stage_id]);
  }
  if (!stage) {
    [[stage]] = await pool.query(
      `SELECT s.* FROM marketing_funnel_stages s JOIN marketing_funnels f ON f.id = s.funnel_id AND f.padrao = TRUE
       WHERE s.tenant_id = ? AND s.status_lead = ? LIMIT 1`, [tenantId, novoStatus]);
  }

  const sets = ["status = ?"], params = [novoStatus];
  if (stage) {
    sets.push("funnel_stage_id = ?"); params.push(stage.id);
    if (stage.tipo !== "perdido") { sets.push("funnel_max_ordem = GREATEST(COALESCE(funnel_max_ordem, 0), ?)"); params.push(stage.ordem); }
  }
  if (novoStatus === "cliente") sets.push("convertido_em = COALESCE(convertido_em, NOW())");
  if (novoStatus === "perdido") { sets.push("motivo_perda = ?"); params.push(texto(motivo, 255)); }
  if (["contactado", "engajado"].includes(novoStatus)) sets.push("ultimo_contato_em = NOW()");
  await pool.query(`UPDATE marketing_leads SET ${sets.join(", ")} WHERE id = ? AND tenant_id = ?`, [...params, leadId, tenantId]);

  await registrarEvento(tenantId, leadId, "mudanca_status", `${lead.status} → ${novoStatus}`, { de: lead.status, para: novoStatus, motivo }, userId);
  await dispararEvento("lead_status_changed", tenantId, { lead_id: Number(leadId), status_anterior: lead.status, novo_status: novoStatus });
  await aplicarRegras(tenantId, Number(leadId), `lead_${novoStatus}`).catch(() => {});
  return { lead: { ...lead, status: novoStatus }, mudou: true, de: lead.status };
}

// Move o lead para uma etapa específica de um funil (o status acompanha, se a etapa tiver um).
async function moverEtapa(tenantId, leadId, stageId, { userId = null, motivo = null } = {}) {
  const [[stage]] = await pool.query("SELECT * FROM marketing_funnel_stages WHERE id = ? AND tenant_id = ?", [stageId, tenantId]);
  if (!stage) throw new ErroValidacao("etapa inválida");
  const [[lead]] = await pool.query("SELECT * FROM marketing_leads WHERE id = ? AND tenant_id = ?", [leadId, tenantId]);
  if (!lead) return null;

  const statusAlvo = stage.tipo === "ganho" ? "cliente" : stage.tipo === "perdido" ? "perdido" : stage.status_lead || null;
  if (statusAlvo && statusAlvo !== lead.status) {
    // mudarStatus escolhe a etapa do mesmo funil quando houver; garantimos a etapa pedida em seguida
    await mudarStatus(tenantId, leadId, statusAlvo, { userId, motivo });
  }
  const sets = ["funnel_stage_id = ?"], params = [stage.id];
  if (stage.tipo !== "perdido") { sets.push("funnel_max_ordem = GREATEST(COALESCE(funnel_max_ordem, 0), ?)"); params.push(stage.ordem); }
  await pool.query(`UPDATE marketing_leads SET ${sets.join(", ")} WHERE id = ? AND tenant_id = ?`, [...params, leadId, tenantId]);
  await registrarEvento(tenantId, leadId, "mudanca_etapa", `Movido para "${stage.nome}"`, { stage_id: stage.id }, userId);
  return { stage };
}

// Registra uma interação (ligação, reunião, resposta...) e pontua o lead por ela.
const INTERACOES = {
  ligacao: "interacao_ligacao", reuniao: "interacao_reuniao", resposta: "interacao_resposta",
  proposta: "interacao_proposta", email: "interacao_email", whatsapp: "interacao_whatsapp", visita: "visita_pagina", clique: "clique_link", nota: null,
};
async function registrarInteracao(tenantId, leadId, tipo, descricao, userId) {
  if (!(tipo in INTERACOES)) throw new ErroValidacao("tipo de interação inválido");
  const [[lead]] = await pool.query("SELECT id FROM marketing_leads WHERE id = ? AND tenant_id = ?", [leadId, tenantId]);
  if (!lead) return null;
  await registrarEvento(tenantId, leadId, `interacao_${tipo}`, texto(descricao, 500) || tipo, null, userId);
  if (tipo !== "nota" && tipo !== "clique" && tipo !== "visita") {
    await pool.query("UPDATE marketing_leads SET ultimo_contato_em = NOW() WHERE id = ?", [leadId]);
  }
  if (INTERACOES[tipo]) await aplicarRegras(tenantId, leadId, INTERACOES[tipo]).catch(() => {});
  return true;
}

// Entrega o lead ao CRM: cria/reaproveita o cliente, abre a oportunidade, registra o contexto
// (origem, pontuação, interesse) e agenda o primeiro contato. Tudo numa transação.
async function enviarParaCRM(tenantId, leadId, { userId = null } = {}) {
  await prepararTenant(tenantId);
  const [[lead]] = await pool.query("SELECT * FROM marketing_leads WHERE id = ? AND tenant_id = ?", [leadId, tenantId]);
  if (!lead) return null;
  if (lead.deal_id) throw new ErroValidacao("Este lead já foi enviado ao CRM");
  if (STATUS_FINAIS.includes(lead.status)) throw new ErroValidacao("Lead já finalizado (cliente, perdido ou inativo) não pode ir ao CRM");

  const [hist] = await pool.query(
    "SELECT pontos_aplicados, motivo FROM marketing_lead_score_history WHERE lead_id = ? ORDER BY created_at DESC LIMIT 5", [leadId]);
  let campanhaNome = null;
  if (lead.campaign_id) {
    const [[c]] = await pool.query("SELECT nome FROM marketing_campaigns WHERE id = ?", [lead.campaign_id]);
    campanhaNome = c?.nome || null;
  }

  const conn = await pool.getConnection();
  let dealId, customerId;
  try {
    await conn.beginTransaction();
    customerId = lead.customer_id;
    if (!customerId && lead.email) {
      const [[c]] = await conn.query("SELECT id FROM customers WHERE tenant_id = ? AND LOWER(email) = ? LIMIT 1", [tenantId, lead.email.toLowerCase()]);
      customerId = c?.id || null;
    }
    if (!customerId) {
      const [c] = await conn.query(
        "INSERT INTO customers (tenant_id, nome, email, telefone) VALUES (?, ?, ?, ?)",
        [tenantId, lead.nome, lead.email || `${lead.telefone_normalizado || lead.id}@sem-email.local`, lead.telefone || null]);
      customerId = c.insertId;
    }
    const responsavel = lead.responsavel_id || userId || null;
    const [d] = await conn.query(
      "INSERT INTO crm_deals (tenant_id, customer_id, titulo, valor, estagio, responsavel_id) VALUES (?, ?, ?, ?, ?, ?)",
      [tenantId, customerId, `${lead.nome} — ${lead.interesse || "Oportunidade de marketing"}`.slice(0, 255), lead.valor_estimado,
        ["qualificado", "oportunidade"].includes(lead.status) ? "qualificacao" : "prospeccao", responsavel]);
    dealId = d.insertId;

    const resumo = [
      `Lead vindo do Marketing. Origem: ${lead.origem || "não informada"}${lead.canal ? ` / ${lead.canal}` : ""}${campanhaNome ? ` / campanha "${campanhaNome}"` : ""}.`,
      `Pontuação ${lead.score} (${lead.temperatura}).`,
      lead.interesse ? `Interesse: ${lead.interesse}.` : null,
      lead.utm_source || lead.utm_campaign ? `UTM: ${[lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ")}.` : null,
      hist.length ? `Principais sinais: ${hist.map(h => `${h.pontos_aplicados > 0 ? "+" : ""}${h.pontos_aplicados} ${h.motivo}`).join("; ")}.` : null,
    ].filter(Boolean).join(" ");
    await conn.query("INSERT INTO crm_interactions (tenant_id, customer_id, deal_id, tipo, descricao, user_id) VALUES (?, ?, ?, 'nota', ?, ?)",
      [tenantId, customerId, dealId, resumo, userId]);
    await conn.query("INSERT INTO crm_tasks (tenant_id, customer_id, deal_id, titulo, prazo, responsavel_id) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), ?)",
      [tenantId, customerId, dealId, lead.proxima_acao || `Primeiro contato com ${lead.nome}`, responsavel]);
    await conn.query("UPDATE marketing_leads SET deal_id = ?, customer_id = ? WHERE id = ?", [dealId, customerId, leadId]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await mudarStatus(tenantId, leadId, "oportunidade", { userId });
  await registrarEvento(tenantId, leadId, "enviado_crm", `Enviado ao CRM (oportunidade #${dealId})`, { deal_id: dealId, customer_id: customerId }, userId);
  await dispararEvento("lead_enviado_crm", tenantId, { lead_id: Number(leadId), deal_id: dealId, customer_id: customerId });
  return { deal_id: dealId, customer_id: customerId };
}

// Traz de volta para o Marketing o que aconteceu no CRM e nos pedidos:
// oportunidade ganha/perdida e primeira compra paga viram status do lead.
async function sincronizarConversoes(tenantId) {
  let ganhos = 0, perdidos = 0;
  const [vendas] = await pool.query(
    `SELECT l.id FROM marketing_leads l JOIN crm_deals d ON d.id = l.deal_id AND d.tenant_id = l.tenant_id
     WHERE l.tenant_id = ? AND d.estagio = 'ganho' AND l.status <> 'cliente'`, [tenantId]);
  for (const l of vendas) { await mudarStatus(tenantId, l.id, "cliente"); ganhos++; }

  const [pagos] = await pool.query(
    `SELECT DISTINCT l.id FROM marketing_leads l JOIN orders o ON o.customer_id = l.customer_id AND o.tenant_id = l.tenant_id
     WHERE l.tenant_id = ? AND l.customer_id IS NOT NULL AND o.status = 'pago' AND o.created_at >= l.created_at AND l.status NOT IN ('cliente')`, [tenantId]);
  for (const l of pagos) { await mudarStatus(tenantId, l.id, "cliente"); ganhos++; }

  const [perdas] = await pool.query(
    `SELECT l.id, d.motivo_perda FROM marketing_leads l JOIN crm_deals d ON d.id = l.deal_id AND d.tenant_id = l.tenant_id
     WHERE l.tenant_id = ? AND d.estagio = 'perdido' AND l.status NOT IN ('perdido', 'cliente')`, [tenantId]);
  for (const l of perdas) { await mudarStatus(tenantId, l.id, "perdido", { motivo: l.motivo_perda || "Oportunidade perdida no CRM" }); perdidos++; }
  return { convertidos: ganhos, perdidos };
}

module.exports = {
  STATUS_VALIDOS, STATUS_FINAIS, ErroValidacao, criarLead, editarLead, mudarStatus, moverEtapa,
  registrarInteracao, registrarEvento, enviarParaCRM, sincronizarConversoes,
};
