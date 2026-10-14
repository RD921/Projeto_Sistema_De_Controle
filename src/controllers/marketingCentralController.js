// Visão geral, análises e a Aria no Marketing.
const analytics = require("../services/marketing/analyticsService");
const aria = require("../services/marketing/ariaMarketingService");
const leadSvc = require("../services/marketing/leadService");
const taskSvc = require("../services/marketing/taskService");
const { prepararTenant } = require("../services/marketingSchema");
const { responderErro } = require("../services/marketing/http");

exports.visaoGeral = async (req, res) => {
  try {
    await prepararTenant(req.tenant_id);
    const dias = Number(req.query.dias) || 30;
    const campaignId = req.query.campaign_id || null;
    // Traz de volta o que aconteceu no CRM/pedidos antes de calcular os números
    await leadSvc.sincronizarConversoes(req.tenant_id).catch(err => console.error("[MARKETING] sincronizar:", err.message));
    const [resumo, recomendacoes, tarefas] = await Promise.all([
      analytics.resumo(req.tenant_id, { dias, campaignId }),
      aria.listarRecomendacoes(req.tenant_id),
      taskSvc.resumoTarefas(req.tenant_id),
    ]);
    res.json({ ...resumo, recomendacoes: recomendacoes.slice(0, 5), tarefas });
  } catch (err) { responderErro(res, err, "Erro ao montar a visão geral"); }
};

exports.desempenhoCampanha = async (req, res) => {
  try {
    const r = await analytics.desempenhoCampanha(req.tenant_id, req.params.id, Number(req.query.dias) || 90);
    if (!r) return res.status(404).json({ error: "Campanha não encontrada" });
    res.json(r);
  } catch (err) { responderErro(res, err, "Erro ao calcular desempenho"); }
};

exports.analiseCanais = async (req, res) => {
  try {
    await prepararTenant(req.tenant_id);
    const w = analytics.janela(req.query.dias);
    res.json({ periodo: { dias: w.dias }, canais: await analytics.porCanal(req.tenant_id, w.ini, w.fim, req.query.campaign_id || null) });
  } catch (err) { responderErro(res, err, "Erro ao analisar canais"); }
};

exports.sincronizar = async (req, res) => {
  try {
    await prepararTenant(req.tenant_id);
    const conv = await leadSvc.sincronizarConversoes(req.tenant_id);
    const novas = await analytics.atribuirReceita(req.tenant_id);
    res.json({ ...conv, conversoes_atribuidas: novas });
  } catch (err) { responderErro(res, err, "Erro ao sincronizar"); }
};

// ---------- Aria ----------
exports.recomendacoes = async (req, res) => {
  try {
    await prepararTenant(req.tenant_id);
    const lista = req.query.atualizar === "1" ? await aria.gerarRecomendacoes(req.tenant_id) : await aria.listarRecomendacoes(req.tenant_id);
    res.json(lista);
  } catch (err) { responderErro(res, err, "Erro ao gerar recomendações"); }
};

exports.aceitarRecomendacao = async (req, res) => {
  try {
    const r = await aria.aceitarRecomendacao(req.tenant_id, req.params.id, { userId: req.user?.id });
    if (!r) return res.status(404).json({ error: "Recomendação não encontrada" });
    res.json(r);
  } catch (err) { responderErro(res, err, "Erro ao aceitar recomendação"); }
};

exports.descartarRecomendacao = async (req, res) => {
  try {
    const ok = await aria.descartarRecomendacao(req.tenant_id, req.params.id);
    if (!ok) return res.status(404).json({ error: "Recomendação não encontrada" });
    res.json({ message: "Recomendação descartada" });
  } catch (err) { responderErro(res, err, "Erro ao descartar recomendação"); }
};

exports.contexto = async (req, res) => {
  try { res.json(await aria.contexto(req.tenant_id, Number(req.query.dias) || 90)); } catch (err) { responderErro(res, err, "Erro ao montar o contexto"); }
};

exports.estrategias = async (req, res) => {
  try { await prepararTenant(req.tenant_id); res.json(await aria.listarEstrategias(req.tenant_id)); } catch (err) { responderErro(res, err, "Erro ao listar estratégias"); }
};

exports.criarEstrategia = async (req, res) => {
  try { res.status(201).json(await aria.gerarEstrategia(req.tenant_id, req.body?.pedido, { userId: req.user?.id })); }
  catch (err) { responderErro(res, err, "Erro ao gerar estratégia"); }
};

exports.aplicarEstrategia = async (req, res) => {
  try {
    const r = await aria.aplicarEstrategia(req.tenant_id, req.params.id, { userId: req.user?.id });
    if (!r) return res.status(404).json({ error: "Estratégia não encontrada" });
    res.json(r);
  } catch (err) { responderErro(res, err, "Erro ao aplicar estratégia"); }
};

exports.descartarEstrategia = async (req, res) => {
  try {
    const ok = await aria.descartarEstrategia(req.tenant_id, req.params.id);
    if (!ok) return res.status(404).json({ error: "Estratégia não encontrada ou já aplicada" });
    res.json({ message: "Estratégia descartada" });
  } catch (err) { responderErro(res, err, "Erro ao descartar estratégia"); }
};

exports.planejarAquisicao = async (req, res) => {
  try { res.json(await aria.planejarAquisicao(req.tenant_id, req.body || {})); } catch (err) { responderErro(res, err, "Erro ao planejar aquisição"); }
};
