const crypto = require("crypto");
const pool = require("../config/db");
const leadSvc = require("../services/marketing/leadService");
const { prepararTenant } = require("../services/marketingSchema");
const { responderErro, ErroValidacao } = require("../services/marketing/http");

const txt = (v, max) => { const s = String(v ?? "").trim(); return s ? s.slice(0, max) : null; };

// Limite simples por IP e formulário (20 envios por hora) contra robôs.
const envios = new Map();
function limiteExcedido(chave) {
  const agora = Date.now();
  const lista = (envios.get(chave) || []).filter(t => agora - t < 3600000);
  if (lista.length >= 20) { envios.set(chave, lista); return true; }
  lista.push(agora);
  envios.set(chave, lista);
  if (envios.size > 5000) for (const [k, v] of envios) if (!v.some(t => agora - t < 3600000)) envios.delete(k);
  return false;
}

exports.listar = async (req, res) => {
  try {
    await prepararTenant(req.tenant_id);
    const [rows] = await pool.query(
      `SELECT f.*, (SELECT COUNT(*) FROM marketing_form_submissions s WHERE s.form_id = f.id) AS total_submissoes
       FROM marketing_forms f WHERE f.tenant_id = ? ORDER BY f.created_at DESC`, [req.tenant_id]);
    res.json(rows);
  } catch (err) { responderErro(res, err, "Erro ao listar formulários"); }
};

async function validarCampanha(tenantId, id) {
  if (!id) return null;
  const [[c]] = await pool.query("SELECT id FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!c) throw new ErroValidacao("campaign_id inválido para este tenant");
  return c.id;
}

exports.criar = async (req, res) => {
  try {
    const { nome, campos, origem_padrao, canal_padrao, campaign_id } = req.body || {};
    if (!txt(nome, 255)) throw new ErroValidacao("nome é obrigatório");
    if (!Array.isArray(campos) || campos.length === 0) throw new ErroValidacao("campos deve ser uma lista não vazia");
    const camp = await validarCampanha(req.tenant_id, campaign_id);
    const token = crypto.randomBytes(20).toString("hex");
    const [r] = await pool.query(
      "INSERT INTO marketing_forms (tenant_id, nome, token, campos, origem_padrao, canal_padrao, campaign_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [req.tenant_id, txt(nome, 255), token, JSON.stringify(campos), txt(origem_padrao, 100), txt(canal_padrao, 100), camp]);
    res.status(201).json({ id: r.insertId, token, url_publica: `/api/marketing/forms/public/${token}` });
  } catch (err) { responderErro(res, err, "Erro ao criar formulário"); }
};

exports.atualizar = async (req, res) => {
  try {
    const [[f]] = await pool.query("SELECT * FROM marketing_forms WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!f) return res.status(404).json({ error: "Formulário não encontrado" });
    const b = req.body || {};
    const camp = b.campaign_id === undefined ? f.campaign_id : await validarCampanha(req.tenant_id, b.campaign_id);
    await pool.query(
      "UPDATE marketing_forms SET nome = ?, origem_padrao = ?, canal_padrao = ?, campaign_id = ?, ativo = ? WHERE id = ?",
      [txt(b.nome, 255) || f.nome, b.origem_padrao === undefined ? f.origem_padrao : txt(b.origem_padrao, 100),
        b.canal_padrao === undefined ? f.canal_padrao : txt(b.canal_padrao, 100), camp, b.ativo === undefined ? f.ativo : (b.ativo ? 1 : 0), f.id]);
    res.json({ message: "Formulário atualizado" });
  } catch (err) { responderErro(res, err, "Erro ao atualizar formulário"); }
};

exports.listarSubmissoes = async (req, res) => {
  try {
    const [[form]] = await pool.query("SELECT id FROM marketing_forms WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!form) return res.status(404).json({ error: "Formulário não encontrado" });
    const [rows] = await pool.query(
      "SELECT s.*, l.nome AS lead_nome, l.status AS lead_status FROM marketing_form_submissions s LEFT JOIN marketing_leads l ON l.id = s.lead_id WHERE s.form_id = ? ORDER BY s.created_at DESC LIMIT 500", [req.params.id]);
    res.json(rows);
  } catch (err) { responderErro(res, err, "Erro ao listar submissões"); }
};

exports.excluir = async (req, res) => {
  try {
    const [r] = await pool.query("DELETE FROM marketing_forms WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!r.affectedRows) return res.status(404).json({ error: "Formulário não encontrado" });
    res.json({ message: "Formulário excluído" });
  } catch (err) { responderErro(res, err, "Erro ao excluir formulário"); }
};

// Endpoint PÚBLICO (sem login): o token do formulário é a única proteção.
// Qualquer página externa pode enviar um POST para captar um lead. Aceita UTMs e o código do link rastreável (mkt).
exports.submeter = async (req, res) => {
  try {
    await require("../services/marketingSchema").garantirEsquema();
    const [[form]] = await pool.query("SELECT * FROM marketing_forms WHERE token = ? AND ativo = TRUE", [String(req.params.token).slice(0, 64)]);
    if (!form) return res.status(404).json({ error: "Formulário não encontrado ou inativo" });

    const dados = req.body && typeof req.body === "object" ? req.body : {};
    // Campo-isca invisível: se um robô preencher, finge sucesso e descarta.
    if (dados.website) return res.status(201).json({ message: "Cadastro recebido com sucesso" });
    if (limiteExcedido(`${req.ip}:${form.id}`)) return res.status(429).json({ error: "Muitos envios. Tente novamente mais tarde." });

    const definidos = typeof form.campos === "string" ? JSON.parse(form.campos) : form.campos;
    for (const campo of definidos.filter(c => c.obrigatorio).map(c => c.nome)) {
      if (!dados[campo]) return res.status(400).json({ error: `Campo obrigatório ausente: ${campo}` });
    }

    const resultado = await leadSvc.criarLead(form.tenant_id, {
      nome: dados.nome || "Sem nome", email: dados.email, telefone: dados.telefone, empresa: dados.empresa, interesse: dados.interesse,
      origem: form.origem_padrao || "formulario", canal: form.canal_padrao || "site", campaign_id: form.campaign_id || dados.campaign_id,
      utm_source: dados.utm_source, utm_medium: dados.utm_medium, utm_campaign: dados.utm_campaign, utm_content: dados.utm_content, utm_term: dados.utm_term,
      mkt: dados.mkt, consentimento: dados.consentimento,
    }, { origemPadrao: "formulario", canalPadrao: "site", ip: req.ip, formId: form.id });

    await pool.query(
      "INSERT INTO marketing_form_submissions (form_id, tenant_id, lead_id, dados, ip_origem) VALUES (?, ?, ?, ?, ?)",
      [form.id, form.tenant_id, resultado.id, JSON.stringify(Object.fromEntries(Object.entries(dados).slice(0, 40).map(([k, v]) => [String(k).slice(0, 60), String(v).slice(0, 1000)]))), req.ip ? String(req.ip).slice(0, 45) : null]);

    res.status(201).json({ message: "Cadastro recebido com sucesso" });
  } catch (err) {
    if (err instanceof ErroValidacao) return res.status(400).json({ error: err.message });
    console.error("[MARKETING] formulário público:", err.message);
    res.status(500).json({ error: "Erro ao processar formulário" });
  }
};
