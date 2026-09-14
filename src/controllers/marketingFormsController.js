const crypto = require("crypto");
const pool = require("../config/db");
const eventDispatcher = require("../automation/engine/EventDispatcher");
const { aplicarRegras } = require("../services/marketingScoringService");

exports.listar = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.*, (SELECT COUNT(*) FROM marketing_form_submissions s WHERE s.form_id = f.id) AS total_submissoes
       FROM marketing_forms f WHERE f.tenant_id = ? ORDER BY f.created_at DESC`,
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar formularios", details: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { nome, campos, origem_padrao, canal_padrao, campaign_id } = req.body;
    if (!nome) return res.status(400).json({ error: "nome e obrigatorio" });
    if (!Array.isArray(campos) || campos.length === 0) return res.status(400).json({ error: "campos deve ser uma lista nao vazia" });

    if (campaign_id) {
      const [[c]] = await pool.query("SELECT id FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [campaign_id, req.tenant_id]);
      if (!c) return res.status(400).json({ error: "campaign_id invalido para este tenant" });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const [result] = await pool.query(
      "INSERT INTO marketing_forms (tenant_id, nome, token, campos, origem_padrao, canal_padrao, campaign_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [req.tenant_id, nome, token, JSON.stringify(campos), origem_padrao || null, canal_padrao || null, campaign_id || null]
    );
    res.status(201).json({ id: result.insertId, token, url_publica: `/api/marketing/forms/public/${token}` });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar formulario", details: err.message });
  }
};

exports.listarSubmissoes = async (req, res) => {
  try {
    const { id } = req.params;
    const [[form]] = await pool.query("SELECT id FROM marketing_forms WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (!form) return res.status(404).json({ error: "Formulario nao encontrado" });

    const [rows] = await pool.query(
      "SELECT s.*, l.nome AS lead_nome, l.status AS lead_status FROM marketing_form_submissions s LEFT JOIN marketing_leads l ON l.id = s.lead_id WHERE s.form_id = ? ORDER BY s.created_at DESC",
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar submissoes", details: err.message });
  }
};

exports.excluir = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM marketing_forms WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Formulario nao encontrado" });
    res.json({ message: "Formulario excluido" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir formulario", details: err.message });
  }
};

// Endpoint PUBLICO (sem autenticacao de usuario) - o token do formulario e a unica
// protecao. Qualquer pagina externa pode fazer POST aqui para capturar um lead.
exports.submeter = async (req, res) => {
  try {
    const { token } = req.params;
    const [[form]] = await pool.query("SELECT * FROM marketing_forms WHERE token = ? AND ativo = TRUE", [token]);
    if (!form) return res.status(404).json({ error: "Formulario nao encontrado ou inativo" });

    const dados = req.body || {};
    const camposDefinidos = typeof form.campos === "string" ? JSON.parse(form.campos) : form.campos;
    const camposObrigatorios = camposDefinidos.filter(c => c.obrigatorio).map(c => c.nome);
    for (const campo of camposObrigatorios) {
      if (!dados[campo]) return res.status(400).json({ error: `Campo obrigatorio ausente: ${campo}` });
    }

    const [resultLead] = await pool.query(
      "INSERT INTO marketing_leads (tenant_id, nome, email, telefone, empresa, origem, canal) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [form.tenant_id, dados.nome || "Sem nome", dados.email || null, dados.telefone || null, dados.empresa || null, form.origem_padrao || "formulario", form.canal_padrao || "site"]
    );
    const leadId = resultLead.insertId;

    await pool.query(
      "INSERT INTO marketing_form_submissions (form_id, tenant_id, lead_id, dados, ip_origem) VALUES (?, ?, ?, ?, ?)",
      [form.id, form.tenant_id, leadId, JSON.stringify(dados), req.ip || null]
    );

    try {
      await eventDispatcher.dispatch("lead_created", form.tenant_id, {
        lead_id: leadId, nome: dados.nome, email: dados.email, origem: form.origem_padrao, canal: form.canal_padrao, form_id: form.id,
      });
    } catch { /* nao bloqueia a submissao por erro de automacao */ }

    try {
      await aplicarRegras(form.tenant_id, leadId, "lead_created");
    } catch { /* nao bloqueia */ }

    res.status(201).json({ message: "Cadastro recebido com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao processar formulario", details: err.message });
  }
};