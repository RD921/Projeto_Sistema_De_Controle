const pool = require("../config/db");
const scheduler = require("../automation/engine/Scheduler");
const { registrar } = require("../services/auditoriaService");
const { prepararTenant } = require("../services/marketingSchema");
const { responderErro, ErroValidacao } = require("../services/marketing/http");

const TIPOS = ["email", "sms", "whatsapp", "push", "ads", "social", "outro"];
const ETAPAS_FUNIL = ["aquisicao", "nutricao", "conversao", "recompra"];
const txt = (v, max) => { const s = String(v ?? "").trim(); return s ? s.slice(0, max) : null; };
const numOuNull = (v, nome) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) throw new ErroValidacao(`${nome} inválido`);
  return n;
};
const dataOuNull = (v, nome) => {
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(v)) || Number.isNaN(Date.parse(v))) throw new ErroValidacao(`${nome} inválida (use AAAA-MM-DD)`);
  return String(v).slice(0, 10);
};

async function validarRelacionados(tenantId, b) {
  if (b.segment_id) {
    const [[s]] = await pool.query("SELECT id FROM marketing_segments WHERE id = ? AND tenant_id = ?", [b.segment_id, tenantId]);
    if (!s) throw new ErroValidacao("segment_id inválido para este tenant");
  }
  if (b.automation_id) {
    const [[a]] = await pool.query("SELECT id FROM automations WHERE id = ? AND tenant_id = ?", [b.automation_id, tenantId]);
    if (!a) throw new ErroValidacao("automation_id inválido para este tenant");
  }
  if (b.responsavel_id) {
    const [[u]] = await pool.query("SELECT id FROM users WHERE id = ? AND tenant_id = ?", [b.responsavel_id, tenantId]);
    if (!u) throw new ErroValidacao("responsável inválido para este tenant");
  }
}

function camposDe(b) {
  const data_inicio = dataOuNull(b.data_inicio, "data_inicio"), data_fim = dataOuNull(b.data_fim, "data_fim");
  if (data_inicio && data_fim && data_fim < data_inicio) throw new ErroValidacao("data_fim não pode ser antes de data_inicio");
  if (b.tipo !== undefined && b.tipo !== null && b.tipo !== "" && !TIPOS.includes(b.tipo)) throw new ErroValidacao("tipo inválido");
  if (b.etapa_funil && !ETAPAS_FUNIL.includes(b.etapa_funil)) throw new ErroValidacao("etapa_funil inválida");
  return {
    objetivo: txt(b.objetivo, 255), tipo: TIPOS.includes(b.tipo) ? b.tipo : "outro", canal: txt(b.canal, 100), etapa_funil: b.etapa_funil || null,
    segment_id: Number(b.segment_id) || null, automation_id: Number(b.automation_id) || null, responsavel_id: Number(b.responsavel_id) || null,
    orcamento: numOuNull(b.orcamento, "orçamento"), meta_leads: numOuNull(b.meta_leads, "meta de leads"), meta_clientes: numOuNull(b.meta_clientes, "meta de clientes"),
    meta_receita: numOuNull(b.meta_receita, "meta de receita"), conteudo: txt(b.conteudo, 8000), criativos: txt(b.criativos, 4000), data_inicio, data_fim,
  };
}

// Usada pela Aria (ação confirmada com PIN): cria a campanha sempre como RASCUNHO.
exports.criarRascunho = async (tenantId, b, userId = null) => {
  const nome = txt(b.nome, 255);
  if (!nome) throw new ErroValidacao("nome é obrigatório");
  await validarRelacionados(tenantId, b);
  const c = camposDe(b);
  const [r] = await pool.query(
    `INSERT INTO marketing_campaigns (tenant_id, nome, objetivo, tipo, canal, etapa_funil, segment_id, automation_id, responsavel_id, orcamento,
       meta_leads, meta_clientes, meta_receita, conteudo, criativos, data_inicio, data_fim, created_by, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'rascunho')`,
    [tenantId, nome, c.objetivo, c.tipo, c.canal, c.etapa_funil, c.segment_id, c.automation_id, c.responsavel_id, c.orcamento,
      c.meta_leads, c.meta_clientes, c.meta_receita, c.conteudo, c.criativos, c.data_inicio, c.data_fim, userId]);
  return { id: r.insertId, nome };
};

exports.listar = async (req, res) => {
  try {
    await prepararTenant(req.tenant_id);
    const [rows] = await pool.query(
      `SELECT c.*, s.nome AS segmento_nome, a.name AS automacao_nome, u.nome AS responsavel_nome
       FROM marketing_campaigns c
       LEFT JOIN marketing_segments s ON s.id = c.segment_id
       LEFT JOIN automations a ON a.id = c.automation_id
       LEFT JOIN users u ON u.id = c.responsavel_id
       WHERE c.tenant_id = ? ORDER BY c.created_at DESC`, [req.tenant_id]);
    res.json(rows);
  } catch (err) { responderErro(res, err, "Erro ao listar campanhas"); }
};

exports.criar = async (req, res) => {
  try {
    await prepararTenant(req.tenant_id);
    const b = req.body || {};
    const nome = txt(b.nome, 255);
    if (!nome) throw new ErroValidacao("nome é obrigatório");
    await validarRelacionados(req.tenant_id, b);
    const c = camposDe(b);
    const [r] = await pool.query(
      `INSERT INTO marketing_campaigns (tenant_id, nome, objetivo, tipo, canal, etapa_funil, segment_id, automation_id, responsavel_id, orcamento,
         meta_leads, meta_clientes, meta_receita, conteudo, criativos, data_inicio, data_fim, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenant_id, nome, c.objetivo, c.tipo, c.canal, c.etapa_funil, c.segment_id, c.automation_id, c.responsavel_id, c.orcamento,
        c.meta_leads, c.meta_clientes, c.meta_receita, c.conteudo, c.criativos, c.data_inicio, c.data_fim, req.user?.id || null]);
    await registrar(req.tenant_id, req.user, "criar_campanha", "marketing_campaign", r.insertId, `Criou campanha "${nome}"`);
    res.status(201).json({ id: r.insertId });
  } catch (err) { responderErro(res, err, "Erro ao criar campanha"); }
};

exports.atualizar = async (req, res) => {
  try {
    const [[atual]] = await pool.query("SELECT * FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!atual) return res.status(404).json({ error: "Campanha não encontrada" });
    const b = { ...atual, ...(req.body || {}) };
    const nome = txt(b.nome, 255);
    if (!nome) throw new ErroValidacao("nome é obrigatório");
    await validarRelacionados(req.tenant_id, b);
    const c = camposDe(b);
    await pool.query(
      `UPDATE marketing_campaigns SET nome = ?, objetivo = ?, tipo = ?, canal = ?, etapa_funil = ?, segment_id = ?, automation_id = ?, responsavel_id = ?, orcamento = ?,
         meta_leads = ?, meta_clientes = ?, meta_receita = ?, conteudo = ?, criativos = ?, data_inicio = ?, data_fim = ? WHERE id = ? AND tenant_id = ?`,
      [nome, c.objetivo, c.tipo, c.canal, c.etapa_funil, c.segment_id, c.automation_id, c.responsavel_id, c.orcamento, c.meta_leads, c.meta_clientes, c.meta_receita,
        c.conteudo, c.criativos, c.data_inicio, c.data_fim, req.params.id, req.tenant_id]);
    await registrar(req.tenant_id, req.user, "editar_campanha", "marketing_campaign", req.params.id, `Editou campanha "${nome}"`);
    res.json({ message: "Campanha atualizada" });
  } catch (err) { responderErro(res, err, "Erro ao atualizar campanha"); }
};

// Ativar campanha = mudar status + (se tiver automation_id) ativar a automação vinculada,
// reaproveitando o motor existente em vez de criar um disparador próprio.
exports.ativar = async (req, res) => {
  try {
    const [[campanha]] = await pool.query("SELECT * FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!campanha) return res.status(404).json({ error: "Campanha não encontrada" });
    await pool.query("UPDATE marketing_campaigns SET status = 'ativa' WHERE id = ?", [campanha.id]);
    if (campanha.automation_id) {
      await pool.query("UPDATE automations SET status = 'active' WHERE id = ? AND tenant_id = ?", [campanha.automation_id, req.tenant_id]);
      scheduler.reloadAutomation(campanha.automation_id);
    }
    await registrar(req.tenant_id, req.user, "ativar_campanha", "marketing_campaign", campanha.id, `Ativou campanha "${campanha.nome}"`);
    res.json({ message: "Campanha ativada" });
  } catch (err) { responderErro(res, err, "Erro ao ativar campanha"); }
};

exports.pausar = async (req, res) => {
  try {
    const [[campanha]] = await pool.query("SELECT * FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!campanha) return res.status(404).json({ error: "Campanha não encontrada" });
    await pool.query("UPDATE marketing_campaigns SET status = 'pausada' WHERE id = ?", [campanha.id]);
    if (campanha.automation_id) {
      await pool.query("UPDATE automations SET status = 'paused' WHERE id = ? AND tenant_id = ?", [campanha.automation_id, req.tenant_id]);
      scheduler.pararJobs(campanha.automation_id);
    }
    await registrar(req.tenant_id, req.user, "pausar_campanha", "marketing_campaign", campanha.id, `Pausou campanha "${campanha.nome}"`);
    res.json({ message: "Campanha pausada" });
  } catch (err) { responderErro(res, err, "Erro ao pausar campanha"); }
};

exports.finalizar = async (req, res) => {
  try {
    const [[campanha]] = await pool.query("SELECT * FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!campanha) return res.status(404).json({ error: "Campanha não encontrada" });
    await pool.query("UPDATE marketing_campaigns SET status = 'finalizada' WHERE id = ?", [campanha.id]);
    if (campanha.automation_id) {
      await pool.query("UPDATE automations SET status = 'paused' WHERE id = ? AND tenant_id = ?", [campanha.automation_id, req.tenant_id]);
      scheduler.pararJobs(campanha.automation_id);
    }
    await registrar(req.tenant_id, req.user, "finalizar_campanha", "marketing_campaign", campanha.id, `Finalizou campanha "${campanha.nome}"`);
    res.json({ message: "Campanha finalizada" });
  } catch (err) { responderErro(res, err, "Erro ao finalizar campanha"); }
};

exports.excluir = async (req, res) => {
  try {
    const [[campanha]] = await pool.query("SELECT nome FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    const [r] = await pool.query("DELETE FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!r.affectedRows) return res.status(404).json({ error: "Campanha não encontrada" });
    await registrar(req.tenant_id, req.user, "excluir_campanha", "marketing_campaign", req.params.id, campanha ? `Excluiu campanha "${campanha.nome}"` : "Excluiu campanha");
    res.json({ message: "Campanha excluída" });
  } catch (err) { responderErro(res, err, "Erro ao excluir campanha"); }
};
