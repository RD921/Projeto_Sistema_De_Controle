const pool = require("../config/db");
const { registrar } = require("../services/auditoriaService");
const svc = require("../services/marketing/leadService");
const { explicarLead, calcularTemperatura } = require("../services/marketingScoringService");
const { leadsPrioritarios } = require("../services/marketing/analyticsService");
const { prepararTenant } = require("../services/marketingSchema");
const { responderErro } = require("../services/marketing/http");

exports.listar = async (req, res) => {
  try {
    await prepararTenant(req.tenant_id);
    const { status, temperatura, campaign_id, origem, q, stage_id } = req.query;
    const limite = Math.min(Number(req.query.limite) || 100, 300);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    let where = "WHERE l.tenant_id = ?";
    const params = [req.tenant_id];
    if (status) { where += " AND l.status = ?"; params.push(status); }
    if (temperatura) { where += " AND l.temperatura = ?"; params.push(temperatura); }
    if (campaign_id) { where += " AND l.campaign_id = ?"; params.push(Number(campaign_id)); }
    if (stage_id) { where += " AND l.funnel_stage_id = ?"; params.push(Number(stage_id)); }
    if (origem) { where += " AND (l.origem = ? OR l.canal = ?)"; params.push(origem, origem); }
    if (q) { where += " AND (l.nome LIKE ? OR l.email LIKE ? OR l.empresa LIKE ?)"; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    const [rows] = await pool.query(
      `SELECT l.*, c.nome AS campanha_nome, s.nome AS etapa_nome FROM marketing_leads l
       LEFT JOIN marketing_campaigns c ON c.id = l.campaign_id LEFT JOIN marketing_funnel_stages s ON s.id = l.funnel_stage_id
       ${where} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`, [...params, limite, offset]);
    const [[tot]] = await pool.query(`SELECT COUNT(*) AS n FROM marketing_leads l ${where}`, params);
    res.set("X-Total-Count", String(tot.n));
    res.json(rows);
  } catch (err) { responderErro(res, err, "Erro ao listar leads"); }
};

exports.prioritarios = async (req, res) => {
  try {
    await prepararTenant(req.tenant_id);
    res.json(await leadsPrioritarios(req.tenant_id, req.query.limite));
  } catch (err) { responderErro(res, err, "Erro ao listar leads prioritários"); }
};

exports.obter = async (req, res) => {
  try {
    const [[lead]] = await pool.query(
      `SELECT l.*, c.nome AS campanha_nome, s.nome AS etapa_nome FROM marketing_leads l
       LEFT JOIN marketing_campaigns c ON c.id = l.campaign_id LEFT JOIN marketing_funnel_stages s ON s.id = l.funnel_stage_id
       WHERE l.id = ? AND l.tenant_id = ?`, [req.params.id, req.tenant_id]);
    if (!lead) return res.status(404).json({ error: "Lead não encontrado" });
    const [eventos] = await pool.query("SELECT id, tipo, descricao, created_at FROM marketing_lead_events WHERE lead_id = ? ORDER BY created_at DESC, id DESC LIMIT 100", [lead.id]);
    const [historico] = await pool.query("SELECT pontos_aplicados, score_resultante, motivo, created_at FROM marketing_lead_score_history WHERE lead_id = ? ORDER BY created_at DESC, id DESC LIMIT 100", [lead.id]);
    const [tarefas] = await pool.query("SELECT id, titulo, status, prazo, prioridade FROM marketing_tasks WHERE tenant_id = ? AND lead_id = ? ORDER BY id DESC LIMIT 20", [req.tenant_id, lead.id]);
    let deal = null;
    if (lead.deal_id) [[deal]] = await pool.query("SELECT id, titulo, valor, estagio FROM crm_deals WHERE id = ? AND tenant_id = ?", [lead.deal_id, req.tenant_id]);
    res.json({ ...lead, ...(await explicarLead(lead, historico)), eventos, historico_score: historico, tarefas, deal });
  } catch (err) { responderErro(res, err, "Erro ao buscar lead"); }
};

exports.criar = async (req, res) => {
  try {
    const r = await svc.criarLead(req.tenant_id, req.body || {}, { userId: req.user?.id, origemPadrao: "manual", canalPadrao: "manual" });
    await registrar(req.tenant_id, req.user, "criar_lead", "marketing_lead", r.id, `${r.duplicado ? "Lead já existia" : "Criou lead"} "${req.body?.nome}"`);
    res.status(r.duplicado ? 200 : 201).json({ id: r.id, duplicado: r.duplicado, message: r.duplicado ? "Já existia um lead com esse contato; os dados foram completados" : "Lead criado" });
  } catch (err) { responderErro(res, err, "Erro ao criar lead"); }
};

exports.editar = async (req, res) => {
  try {
    const r = await svc.editarLead(req.tenant_id, req.params.id, req.body || {}, req.user?.id);
    if (!r) return res.status(404).json({ error: "Lead não encontrado" });
    res.json({ message: "Lead atualizado" });
  } catch (err) { responderErro(res, err, "Erro ao atualizar lead"); }
};

exports.atualizarStatus = async (req, res) => {
  try {
    const r = await svc.mudarStatus(req.tenant_id, req.params.id, req.body?.status, { userId: req.user?.id, motivo: req.body?.motivo });
    if (!r) return res.status(404).json({ error: "Lead não encontrado" });
    if (r.mudou) await registrar(req.tenant_id, req.user, "atualizar_status_lead", "marketing_lead", req.params.id, `"${r.lead.nome}": ${r.de} -> ${req.body.status}`);
    res.json({ message: "Status atualizado" });
  } catch (err) { responderErro(res, err, "Erro ao atualizar status"); }
};

exports.moverEtapa = async (req, res) => {
  try {
    const r = await svc.moverEtapa(req.tenant_id, req.params.id, req.body?.stage_id, { userId: req.user?.id, motivo: req.body?.motivo });
    if (!r) return res.status(404).json({ error: "Lead não encontrado" });
    res.json({ message: "Lead movido", etapa: r.stage.nome });
  } catch (err) { responderErro(res, err, "Erro ao mover lead"); }
};

exports.ajustarScore = async (req, res) => {
  try {
    const delta = req.body?.delta;
    if (typeof delta !== "number" || !Number.isFinite(delta) || Math.abs(delta) > 100) return res.status(400).json({ error: "delta deve ser numérico (entre -100 e 100)" });
    const [[lead]] = await pool.query("SELECT score FROM marketing_leads WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!lead) return res.status(404).json({ error: "Lead não encontrado" });
    const novo = Math.max(0, lead.score + delta);
    await pool.query("UPDATE marketing_leads SET score = ?, temperatura = ? WHERE id = ?", [novo, calcularTemperatura(novo), req.params.id]);
    await pool.query("INSERT INTO marketing_lead_score_history (lead_id, tenant_id, rule_id, pontos_aplicados, score_resultante, motivo) VALUES (?, ?, NULL, ?, ?, ?)",
      [req.params.id, req.tenant_id, delta, novo, `Ajuste manual${req.body?.motivo ? `: ${String(req.body.motivo).slice(0, 150)}` : ""}`]);
    await registrar(req.tenant_id, req.user, "ajustar_score_lead", "marketing_lead", req.params.id, `Ajustou score em ${delta > 0 ? "+" : ""}${delta}`);
    res.json({ message: "Score ajustado" });
  } catch (err) { responderErro(res, err, "Erro ao ajustar score"); }
};

exports.registrarInteracao = async (req, res) => {
  try {
    const r = await svc.registrarInteracao(req.tenant_id, req.params.id, req.body?.tipo, req.body?.descricao, req.user?.id);
    if (!r) return res.status(404).json({ error: "Lead não encontrado" });
    res.status(201).json({ message: "Interação registrada" });
  } catch (err) { responderErro(res, err, "Erro ao registrar interação"); }
};

exports.enviarCRM = async (req, res) => {
  try {
    const r = await svc.enviarParaCRM(req.tenant_id, req.params.id, { userId: req.user?.id });
    if (!r) return res.status(404).json({ error: "Lead não encontrado" });
    await registrar(req.tenant_id, req.user, "enviar_lead_crm", "marketing_lead", req.params.id, `Enviou lead ao CRM (oportunidade #${r.deal_id})`);
    res.status(201).json({ message: "Lead enviado ao CRM", ...r });
  } catch (err) { responderErro(res, err, "Erro ao enviar lead ao CRM"); }
};

// Vincula o lead a um cliente existente e marca como cliente.
exports.vincularCliente = async (req, res) => {
  try {
    const { customer_id } = req.body || {};
    if (!customer_id) return res.status(400).json({ error: "customer_id é obrigatório" });
    const [[customer]] = await pool.query("SELECT id FROM customers WHERE id = ? AND tenant_id = ?", [customer_id, req.tenant_id]);
    if (!customer) return res.status(400).json({ error: "customer_id inválido para este tenant" });
    const [r] = await pool.query("UPDATE marketing_leads SET customer_id = ? WHERE id = ? AND tenant_id = ?", [customer_id, req.params.id, req.tenant_id]);
    if (!r.affectedRows) return res.status(404).json({ error: "Lead não encontrado" });
    await svc.mudarStatus(req.tenant_id, req.params.id, "cliente", { userId: req.user?.id });
    await registrar(req.tenant_id, req.user, "vincular_cliente_lead", "marketing_lead", req.params.id, `Vinculou lead ao cliente #${customer_id}`);
    res.json({ message: "Lead vinculado ao cliente" });
  } catch (err) { responderErro(res, err, "Erro ao vincular cliente"); }
};

exports.excluir = async (req, res) => {
  try {
    const [[lead]] = await pool.query("SELECT nome FROM marketing_leads WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    const [r] = await pool.query("DELETE FROM marketing_leads WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!r.affectedRows) return res.status(404).json({ error: "Lead não encontrado" });
    await registrar(req.tenant_id, req.user, "excluir_lead", "marketing_lead", req.params.id, lead ? `Excluiu lead "${lead.nome}"` : "Excluiu lead");
    res.json({ message: "Lead excluído" });
  } catch (err) { responderErro(res, err, "Erro ao excluir lead"); }
};
