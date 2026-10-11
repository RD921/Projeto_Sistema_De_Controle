// Números da Central de Marketing. Toda métrica sai com um "tipo" para o usuário saber
// de onde ela vem:
//   observado  = contagem direta de dados do sistema
//   calculado  = conta feita sobre dados observados + investimento informado pelo usuário
//   atribuido  = receita ligada a campanha por regra explícita (ver REGRA_ATRIBUICAO)
//   estimado   = projeção (nunca é garantia)
const pool = require("../../config/db");
const { prepararTenant } = require("../marketingSchema");
const { explicarLead } = require("../marketingScoringService");

const REGRA_ATRIBUICAO =
  "Pedidos pagos do cliente vinculado ao lead, feitos depois da criação do lead, contam para a campanha que captou o lead.";

const num = v => Number(v || 0);
const arred = (v, d = 2) => (v === null || v === undefined ? null : Number(Number(v).toFixed(d)));
const variacao = (atual, anterior) => (anterior > 0 ? arred(((atual - anterior) / anterior) * 100, 1) : null);
const divide = (a, b, d = 2) => (b > 0 ? arred(a / b, d) : null);

function janela(dias) {
  const d = Math.min(Math.max(Number(dias) || 30, 1), 365);
  const fim = new Date();
  const ini = new Date(fim.getTime() - d * 86400000);
  const iniAnt = new Date(ini.getTime() - d * 86400000);
  return { dias: d, fim, ini, iniAnt };
}

async function funilPadrao(tenantId) {
  await prepararTenant(tenantId);
  const [[f]] = await pool.query("SELECT id FROM marketing_funnels WHERE tenant_id = ? AND padrao = TRUE LIMIT 1", [tenantId]);
  return f.id;
}

// Liga pedidos pagos às campanhas pela regra acima e remove vínculos antigos que não a respeitam.
async function atribuirReceita(tenantId) {
  await pool.query(
    `DELETE mc FROM marketing_conversions mc JOIN orders o ON o.id = mc.order_id
     WHERE mc.tenant_id = ? AND o.customer_id <> mc.customer_id`, [tenantId]);
  const [r] = await pool.query(
    `INSERT IGNORE INTO marketing_conversions (tenant_id, campaign_id, lead_id, customer_id, order_id, valor)
     SELECT l.tenant_id, l.campaign_id, l.id, l.customer_id, o.id, o.total
     FROM marketing_leads l JOIN orders o ON o.customer_id = l.customer_id AND o.tenant_id = l.tenant_id AND o.status = 'pago' AND o.created_at >= l.created_at
     WHERE l.tenant_id = ? AND l.campaign_id IS NOT NULL AND l.customer_id IS NOT NULL`, [tenantId]);
  return r.affectedRows;
}

function filtroCampanha(campaignId, coluna = "campaign_id") {
  return campaignId ? { sql: ` AND ${coluna} = ?`, params: [Number(campaignId)] } : { sql: "", params: [] };
}

async function metricasPeriodo(tenantId, de, ate, campaignId, ordemQualificado) {
  const fc = filtroCampanha(campaignId, "l.campaign_id");
  const [[leads]] = await pool.query(
    `SELECT COUNT(*) AS captados,
            SUM(CASE WHEN COALESCE(l.funnel_max_ordem, 1) >= ? THEN 1 ELSE 0 END) AS qualificados,
            SUM(CASE WHEN l.status = 'cliente' THEN 1 ELSE 0 END) AS convertidos_da_coorte
     FROM marketing_leads l WHERE l.tenant_id = ? AND l.created_at >= ? AND l.created_at < ?${fc.sql}`,
    [ordemQualificado, tenantId, de, ate, ...fc.params]);
  const [[adq]] = await pool.query(
    `SELECT COUNT(*) AS n FROM marketing_leads l WHERE l.tenant_id = ? AND l.convertido_em >= ? AND l.convertido_em < ?${fc.sql}`,
    [tenantId, de, ate, ...fc.params]);
  const fs = filtroCampanha(campaignId, "campaign_id");
  const [[inv]] = await pool.query(
    "SELECT COALESCE(SUM(valor), 0) AS total FROM marketing_spend WHERE tenant_id = ? AND data >= DATE(?) AND data < DATE(?)" + fs.sql,
    [tenantId, de, ate, ...fs.params]);
  const fm = filtroCampanha(campaignId, "mc.campaign_id");
  const [[rec]] = await pool.query(
    `SELECT COALESCE(SUM(mc.valor), 0) AS total, COUNT(*) AS pedidos FROM marketing_conversions mc JOIN orders o ON o.id = mc.order_id
     WHERE mc.tenant_id = ? AND o.created_at >= ? AND o.created_at < ?${fm.sql}`, [tenantId, de, ate, ...fm.params]);
  const fl = campaignId ? " AND l.campaign_id = ?" : "";
  const [[cliques]] = await pool.query(
    `SELECT COUNT(*) AS n FROM marketing_link_clicks c JOIN marketing_tracking_links l ON l.id = c.link_id
     WHERE c.tenant_id = ? AND c.created_at >= ? AND c.created_at < ?${fl}`, [tenantId, de, ate, ...(campaignId ? [Number(campaignId)] : [])]);
  return {
    leads: num(leads.captados), qualificados: num(leads.qualificados), convertidos_coorte: num(leads.convertidos_da_coorte),
    clientes: num(adq.n), investimento: num(inv.total), receita: num(rec.total), pedidos_atribuidos: num(rec.pedidos), cliques: num(cliques.n),
  };
}

function montarKpis(a, b) {
  const taxa = m => (m.leads > 0 ? arred((m.convertidos_coorte / m.leads) * 100, 1) : null);
  const taxaQual = m => (m.leads > 0 ? arred((m.qualificados / m.leads) * 100, 1) : null);
  const cac = m => divide(m.investimento, m.clientes);
  const cpl = m => divide(m.investimento, m.leads);
  const roas = m => divide(m.receita, m.investimento);
  const roi = m => (m.investimento > 0 ? arred(((m.receita - m.investimento) / m.investimento) * 100, 1) : null);
  const k = (valor, anterior, tipo, extra = {}) => ({ valor, anterior, variacao_pct: valor !== null && anterior !== null ? variacao(valor, anterior) : null, tipo, ...extra });
  return {
    leads_captados: k(a.leads, b.leads, "observado"),
    leads_qualificados: k(a.qualificados, b.qualificados, "observado", { taxa_sobre_leads_pct: taxaQual(a) }),
    taxa_conversao: k(taxa(a), taxa(b), "observado", { base: "leads captados no período que já viraram cliente" }),
    clientes_adquiridos: k(a.clientes, b.clientes, "observado"),
    investimento: k(arred(a.investimento), arred(b.investimento), "informado", { nota: a.investimento > 0 ? null : "Nenhum investimento informado no período" }),
    custo_por_lead: k(cpl(a), cpl(b), "calculado"),
    cac: k(cac(a), cac(b), "calculado", { nota: a.investimento > 0 ? null : "Informe o investimento para calcular o CAC" }),
    receita_atribuida: k(arred(a.receita), arred(b.receita), "atribuido", { regra: REGRA_ATRIBUICAO, pedidos: a.pedidos_atribuidos }),
    roas: k(roas(a), roas(b), "calculado"),
    roi_pct: k(roi(a), roi(b), "calculado"),
  };
}

async function analiseFunil(tenantId, funnelId, { de, ate, campaignId } = {}) {
  await prepararTenant(tenantId);
  const [[funil]] = await pool.query("SELECT * FROM marketing_funnels WHERE id = ? AND tenant_id = ?", [funnelId, tenantId]);
  if (!funil) return null;
  const [etapas] = await pool.query("SELECT * FROM marketing_funnel_stages WHERE funnel_id = ? ORDER BY ordem", [funnelId]);
  const fc = campaignId ? " AND l.campaign_id = ?" : "";
  const p = [tenantId, funnelId, de, ate, ...(campaignId ? [Number(campaignId)] : [])];
  const [coorte] = await pool.query(
    `SELECT l.status, l.funnel_stage_id, COALESCE(l.funnel_max_ordem, 1) AS max_ordem
     FROM marketing_leads l JOIN marketing_funnel_stages s ON s.id = l.funnel_stage_id
     WHERE l.tenant_id = ? AND s.funnel_id = ? AND l.created_at >= ? AND l.created_at < ?${fc}`, p);

  const caminho = etapas.filter(e => e.tipo !== "perdido");
  const total = coorte.length;
  const linhas = caminho.map((e, i) => {
    const alcancaram = coorte.filter(l => l.max_ordem >= e.ordem).length;
    const prox = caminho[i + 1];
    const alcProx = prox ? coorte.filter(l => l.max_ordem >= prox.ordem).length : null;
    const perdidosAqui = coorte.filter(l => l.status === "perdido" && l.max_ordem === e.ordem).length;
    return {
      id: e.id, nome: e.nome, ordem: e.ordem, tipo: e.tipo, alcancaram,
      pct_do_topo: divide(alcancaram * 100, total, 1),
      desistencias: alcProx === null ? null : alcancaram - alcProx,
      pct_desistencia: alcProx === null || alcancaram === 0 ? null : arred(((alcancaram - alcProx) / alcancaram) * 100, 1),
      perdidos_na_etapa: perdidosAqui,
      parados_na_etapa: coorte.filter(l => !["perdido", "cliente", "inativo"].includes(l.status) && l.max_ordem === e.ordem).length,
    };
  });
  linhas.forEach((l, i) => { l.pct_da_etapa_anterior = i === 0 ? null : divide(l.alcancaram * 100, linhas[i - 1].alcancaram, 1); });

  const MIN_AMOSTRA = 20;
  let gargalo = null;
  if (total >= MIN_AMOSTRA) {
    const candidatas = linhas.filter(l => l.pct_desistencia !== null && l.alcancaram >= 10);
    if (candidatas.length) {
      const pior = candidatas.reduce((a, b) => (b.pct_desistencia > a.pct_desistencia ? b : a));
      if (pior.pct_desistencia > 0) gargalo = { etapa: pior.nome, etapa_id: pior.id, pct_desistencia: pior.pct_desistencia, desistencias: pior.desistencias };
    }
  }
  return { funil: { id: funil.id, nome: funil.nome, padrao: !!funil.padrao }, total_leads: total, etapas: linhas, gargalo, amostra_suficiente: total >= MIN_AMOSTRA, amostra_minima: MIN_AMOSTRA };
}

async function porCanal(tenantId, de, ate, campaignId) {
  const fc = campaignId ? " AND l.campaign_id = ?" : "";
  const params = [tenantId, de, ate, ...(campaignId ? [Number(campaignId)] : [])];
  const chave = "COALESCE(NULLIF(l.canal, ''), NULLIF(l.origem, ''), 'Não informado')";
  const [rows] = await pool.query(
    `SELECT ${chave} AS canal, COUNT(*) AS leads, SUM(l.status = 'cliente') AS clientes
     FROM marketing_leads l WHERE l.tenant_id = ? AND l.created_at >= ? AND l.created_at < ?${fc}
     GROUP BY canal ORDER BY leads DESC LIMIT 15`, params);
  const [receitas] = await pool.query(
    `SELECT ${chave} AS canal, SUM(o.total) AS receita
     FROM marketing_leads l JOIN orders o ON o.customer_id = l.customer_id AND o.tenant_id = l.tenant_id AND o.status = 'pago' AND o.created_at >= l.created_at
     WHERE l.tenant_id = ? AND l.created_at >= ? AND l.created_at < ?${fc} GROUP BY canal`, params);
  const rec = new Map(receitas.map(r => [r.canal, num(r.receita)]));
  return rows.map(r => ({
    canal: r.canal, leads: num(r.leads), clientes: num(r.clientes),
    taxa_conversao_pct: divide(num(r.clientes) * 100, num(r.leads), 1), receita: arred(rec.get(r.canal) || 0), tipo: "observado",
  }));
}

async function campanhasDesempenho(tenantId, de, ate) {
  const [rows] = await pool.query(
    `SELECT c.id, c.nome, c.tipo, c.canal, c.status, c.etapa_funil, c.orcamento, c.data_inicio, c.data_fim, c.meta_leads, c.meta_clientes, c.meta_receita,
       (SELECT COUNT(*) FROM marketing_leads l WHERE l.campaign_id = c.id AND l.created_at >= ? AND l.created_at < ?) AS leads,
       (SELECT COUNT(*) FROM marketing_leads l WHERE l.campaign_id = c.id AND l.convertido_em >= ? AND l.convertido_em < ?) AS clientes,
       (SELECT COALESCE(SUM(s.valor), 0) FROM marketing_spend s WHERE s.campaign_id = c.id AND s.data >= DATE(?) AND s.data < DATE(?)) AS investimento,
       (SELECT COALESCE(SUM(mc.valor), 0) FROM marketing_conversions mc JOIN orders o ON o.id = mc.order_id WHERE mc.campaign_id = c.id AND o.created_at >= ? AND o.created_at < ?) AS receita
     FROM marketing_campaigns c WHERE c.tenant_id = ?
     ORDER BY (c.status = 'ativa') DESC, c.created_at DESC LIMIT 50`,
    [de, ate, de, ate, de, ate, de, ate, tenantId]);
  return rows.map(r => {
    const inv = num(r.investimento), rec = num(r.receita), cli = num(r.clientes), ld = num(r.leads);
    return {
      id: r.id, nome: r.nome, tipo: r.tipo, canal: r.canal, status: r.status, etapa_funil: r.etapa_funil,
      orcamento: r.orcamento === null ? null : num(r.orcamento), data_inicio: r.data_inicio, data_fim: r.data_fim,
      metas: { leads: r.meta_leads, clientes: r.meta_clientes, receita: r.meta_receita === null ? null : num(r.meta_receita) },
      leads: ld, clientes: cli, investimento: arred(inv), receita_atribuida: arred(rec),
      custo_por_lead: divide(inv, ld), custo_por_cliente: divide(inv, cli), roas: divide(rec, inv),
      roi_pct: inv > 0 ? arred(((rec - inv) / inv) * 100, 1) : null,
    };
  });
}

async function leadsPrioritarios(tenantId, limite = 10) {
  const [leads] = await pool.query(
    `SELECT l.*, c.nome AS campanha_nome FROM marketing_leads l LEFT JOIN marketing_campaigns c ON c.id = l.campaign_id
     WHERE l.tenant_id = ? AND l.status NOT IN ('cliente', 'perdido', 'inativo')
     ORDER BY l.score DESC, l.created_at DESC LIMIT ?`, [tenantId, Math.min(Number(limite) || 10, 50)]);
  const out = [];
  for (const l of leads) {
    const ex = await explicarLead(l);
    out.push({
      id: l.id, nome: l.nome, empresa: l.empresa, email: l.email, telefone: l.telefone, origem: l.origem, canal: l.canal,
      campanha: l.campanha_nome, status: l.status, score: l.score, temperatura: l.temperatura, valor_estimado: l.valor_estimado === null ? null : num(l.valor_estimado),
      deal_id: l.deal_id, ...ex,
    });
  }
  return out;
}

async function resumo(tenantId, { dias = 30, campaignId = null } = {}) {
  const funnelId = await funilPadrao(tenantId);
  await atribuirReceita(tenantId).catch(err => console.error("[MARKETING] atribuirReceita:", err.message));
  const w = janela(dias);
  const [[q]] = await pool.query("SELECT ordem FROM marketing_funnel_stages WHERE funnel_id = ? AND status_lead = 'qualificado' LIMIT 1", [funnelId]);
  const ordemQ = q?.ordem || 4;
  const [atual, anterior] = await Promise.all([
    metricasPeriodo(tenantId, w.ini, w.fim, campaignId, ordemQ),
    metricasPeriodo(tenantId, w.iniAnt, w.ini, campaignId, ordemQ),
  ]);
  const [funil, canais, campanhas, prioritarios] = await Promise.all([
    analiseFunil(tenantId, funnelId, { de: w.ini, ate: w.fim, campaignId }),
    porCanal(tenantId, w.ini, w.fim, campaignId),
    campanhasDesempenho(tenantId, w.ini, w.fim),
    leadsPrioritarios(tenantId, 5),
  ]);
  const [[base]] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(campaign_id IS NOT NULL) AS com_campanha, SUM(utm_source IS NOT NULL) AS com_utm FROM marketing_leads WHERE tenant_id = ?`, [tenantId]);
  const [[gasto]] = await pool.query("SELECT COUNT(*) AS n FROM marketing_spend WHERE tenant_id = ?", [tenantId]);

  return {
    periodo: { dias: w.dias, de: w.ini, ate: w.fim },
    kpis: montarKpis(atual, anterior),
    cliques_rastreados: atual.cliques,
    funil, canais, campanhas, leads_prioritarios: prioritarios,
    dados: {
      leads_total: num(base.total), leads_com_campanha: num(base.com_campanha), leads_com_utm: num(base.com_utm),
      registros_de_investimento: num(gasto.n),
      sinais_de_pouco_dado: [
        num(gasto.n) === 0 ? "Nenhum investimento informado: CAC, ROAS e ROI ficam indisponíveis." : null,
        num(base.total) > 0 && num(base.com_campanha) / num(base.total) < 0.3 ? "Menos de 30% dos leads têm campanha: use links rastreáveis para atribuir resultado." : null,
        num(base.total) < 30 ? "Poucos leads (menos de 30): taxas e comparações ainda são pouco confiáveis." : null,
      ].filter(Boolean),
    },
    regra_atribuicao: REGRA_ATRIBUICAO,
  };
}

// Desempenho de uma campanha só (tela de detalhe, ROI e Aria)
async function desempenhoCampanha(tenantId, campaignId, dias = 90) {
  await atribuirReceita(tenantId).catch(() => {});
  const w = janela(dias);
  const lista = await campanhasDesempenho(tenantId, w.ini, w.fim);
  const c = lista.find(x => x.id === Number(campaignId));
  if (!c) return null;
  const [[ab]] = await pool.query("SELECT COUNT(*) AS n FROM marketing_form_submissions s JOIN marketing_forms f ON f.id = s.form_id WHERE f.campaign_id = ?", [campaignId]);
  const [[cliques]] = await pool.query(
    `SELECT COUNT(*) AS n FROM marketing_link_clicks c JOIN marketing_tracking_links l ON l.id = c.link_id WHERE l.campaign_id = ? AND c.created_at >= ?`, [campaignId, w.ini]);
  const [gastos] = await pool.query(
    "SELECT data, valor, canal, observacao FROM marketing_spend WHERE tenant_id = ? AND campaign_id = ? ORDER BY data DESC LIMIT 30", [tenantId, campaignId]);
  return { ...c, periodo_dias: w.dias, envios_de_formulario: num(ab.n), cliques_rastreados: num(cliques.n), lancamentos_de_investimento: gastos, regra_atribuicao: REGRA_ATRIBUICAO };
}

module.exports = { resumo, analiseFunil, porCanal, campanhasDesempenho, leadsPrioritarios, desempenhoCampanha, atribuirReceita, metricasPeriodo, janela, funilPadrao, REGRA_ATRIBUICAO, divide, arred };
