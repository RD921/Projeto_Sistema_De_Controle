const svc = require("../services/marketing/taskService");
const recovery = require("../services/marketing/recoveryService");
const { prepararTenant } = require("../services/marketingSchema");
const { responderErro } = require("../services/marketing/http");

exports.listar = async (req, res) => {
  try {
    await prepararTenant(req.tenant_id);
    const [itens, resumo] = await Promise.all([
      svc.listarTarefas(req.tenant_id, { status: req.query.status, origem: req.query.origem, responsavelId: req.query.responsavel_id }),
      svc.resumoTarefas(req.tenant_id),
    ]);
    res.json({ resumo, itens });
  } catch (err) { responderErro(res, err, "Erro ao listar tarefas"); }
};

exports.criar = async (req, res) => {
  try {
    const r = await svc.criarTarefa(req.tenant_id, { ...(req.body || {}), origem: "manual", requer_aprovacao: false }, { userId: req.user?.id });
    res.status(201).json(r);
  } catch (err) { responderErro(res, err, "Erro ao criar tarefa"); }
};

exports.atualizar = async (req, res) => {
  try {
    const r = await svc.atualizarTarefa(req.tenant_id, req.params.id, req.body || {}, req.user?.id);
    if (!r) return res.status(404).json({ error: "Tarefa não encontrada" });
    res.json({ message: "Tarefa atualizada" });
  } catch (err) { responderErro(res, err, "Erro ao atualizar tarefa"); }
};

exports.aprovar = async (req, res) => {
  try {
    const ok = await svc.aprovarTarefa(req.tenant_id, req.params.id);
    if (!ok) return res.status(409).json({ error: "Tarefa não encontrada ou não está aguardando aprovação" });
    res.json({ message: "Tarefa aprovada" });
  } catch (err) { responderErro(res, err, "Erro ao aprovar tarefa"); }
};

// ---------- Recuperação de oportunidades ----------
exports.recuperacaoRegras = async (req, res) => {
  try { res.json(await recovery.regras(req.tenant_id)); } catch (err) { responderErro(res, err, "Erro ao listar regras"); }
};

exports.recuperacaoAtualizarRegra = async (req, res) => {
  try {
    const r = await recovery.atualizarRegra(req.tenant_id, req.params.id, req.body || {});
    if (r.erro) return res.status(400).json({ error: r.erro });
    if (r.naoEncontrada) return res.status(404).json({ error: "Regra não encontrada" });
    res.json({ message: "Regra atualizada" });
  } catch (err) { responderErro(res, err, "Erro ao atualizar regra"); }
};

exports.recuperacaoOportunidades = async (req, res) => {
  try { res.json(await recovery.oportunidades(req.tenant_id)); } catch (err) { responderErro(res, err, "Erro ao buscar oportunidades"); }
};

exports.recuperacaoExecutar = async (req, res) => {
  try { res.json(await recovery.executar(req.tenant_id, { userId: req.user?.id })); } catch (err) { responderErro(res, err, "Erro ao executar recuperação"); }
};
