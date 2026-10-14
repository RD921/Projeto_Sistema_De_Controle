// Links rastreáveis (UTM) e registro de investimento em marketing.
const crypto = require("crypto");
const pool = require("../config/db");
const { prepararTenant } = require("../services/marketingSchema");
const { responderErro, ErroValidacao } = require("../services/marketing/http");

const UTMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const limpar = (v, max) => { const s = String(v ?? "").trim(); return s ? s.slice(0, max) : null; };

function urlValida(destino) {
  try {
    const u = new URL(destino);
    return ["http:", "https:"].includes(u.protocol);
  } catch { return false; }
}

function gerarSlug() {
  return crypto.randomBytes(5).toString("base64url").replace(/[^a-zA-Z0-9]/g, "x").slice(0, 7).toLowerCase();
}

// Destino final com os parâmetros UTM e o identificador do link (mkt) para os formulários saberem a campanha.
function montarDestino(link) {
  const u = new URL(link.destino);
  for (const k of UTMS) if (link[k]) u.searchParams.set(k, link[k]);
  u.searchParams.set("mkt", link.slug);
  return u.toString();
}

exports.listarLinks = async (req, res) => {
  try {
    await prepararTenant(req.tenant_id);
    const [rows] = await pool.query(
      `SELECT l.*, c.nome AS campanha_nome,
              (SELECT COUNT(*) FROM marketing_link_clicks k WHERE k.link_id = l.id) AS cliques,
              (SELECT COUNT(*) FROM marketing_link_clicks k WHERE k.link_id = l.id AND k.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS cliques_7d,
              (SELECT COUNT(*) FROM marketing_leads ml WHERE ml.tracking_link_id = l.id) AS leads
       FROM marketing_tracking_links l LEFT JOIN marketing_campaigns c ON c.id = l.campaign_id
       WHERE l.tenant_id = ? ORDER BY l.created_at DESC`, [req.tenant_id]);
    res.json(rows.map(r => ({ ...r, url_com_utm: montarDestino(r) })));
  } catch (err) { responderErro(res, err, "Erro ao listar links"); }
};

exports.criarLink = async (req, res) => {
  try {
    await prepararTenant(req.tenant_id);
    const b = req.body || {};
    const nome = limpar(b.nome, 150);
    const destino = limpar(b.destino, 1000);
    if (!nome) throw new ErroValidacao("nome é obrigatório");
    if (!destino || !urlValida(destino)) throw new ErroValidacao("destino deve ser um endereço http:// ou https:// válido");
    let campaignId = null;
    if (b.campaign_id) {
      const [[c]] = await pool.query("SELECT id FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [b.campaign_id, req.tenant_id]);
      if (!c) throw new ErroValidacao("campanha inválida");
      campaignId = c.id;
    }
    const utm = {};
    for (const k of UTMS) utm[k] = limpar(b[k], 150);
    if (!utm.utm_source) throw new ErroValidacao("utm_source é obrigatório (ex: instagram, google, email)");

    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const slug = gerarSlug();
      try {
        const [r] = await pool.query(
          `INSERT INTO marketing_tracking_links (tenant_id, nome, slug, destino, utm_source, utm_medium, utm_campaign, utm_content, utm_term, campaign_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.tenant_id, nome, slug, destino, utm.utm_source, utm.utm_medium, utm.utm_campaign, utm.utm_content, utm.utm_term, campaignId]);
        return res.status(201).json({ id: r.insertId, slug, caminho_curto: `/api/marketing/r/${slug}` });
      } catch (e) { if (e.code !== "ER_DUP_ENTRY") throw e; }
    }
    throw new Error("não foi possível gerar um código único");
  } catch (err) { responderErro(res, err, "Erro ao criar link"); }
};

exports.alternarLink = async (req, res) => {
  try {
    const [r] = await pool.query("UPDATE marketing_tracking_links SET ativo = ? WHERE id = ? AND tenant_id = ?", [req.body?.ativo ? 1 : 0, req.params.id, req.tenant_id]);
    if (!r.affectedRows) return res.status(404).json({ error: "Link não encontrado" });
    res.json({ message: "Link atualizado" });
  } catch (err) { responderErro(res, err, "Erro ao atualizar link"); }
};

exports.excluirLink = async (req, res) => {
  try {
    const [r] = await pool.query("DELETE FROM marketing_tracking_links WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!r.affectedRows) return res.status(404).json({ error: "Link não encontrado" });
    res.json({ message: "Link excluído" });
  } catch (err) { responderErro(res, err, "Erro ao excluir link"); }
};

// PÚBLICO: o cliente clica no link curto, registramos o clique e mandamos para o destino com as UTMs.
exports.redirecionar = async (req, res) => {
  try {
    const [[link]] = await pool.query("SELECT * FROM marketing_tracking_links WHERE slug = ? AND ativo = TRUE", [String(req.params.slug).slice(0, 40)]);
    if (!link) return res.status(404).send("Link não encontrado ou desativado.");
    await pool.query("INSERT INTO marketing_link_clicks (link_id, tenant_id) VALUES (?, ?)", [link.id, link.tenant_id]);
    res.redirect(302, montarDestino(link));
  } catch (err) {
    console.error("[MARKETING] redirecionar:", err.message);
    res.status(500).send("Erro ao abrir o link.");
  }
};

// ---------- Investimento (base do CAC, ROAS e ROI) ----------
exports.listarInvestimentos = async (req, res) => {
  try {
    const dias = Math.min(Number(req.query.dias) || 90, 730);
    const [rows] = await pool.query(
      `SELECT s.*, c.nome AS campanha_nome FROM marketing_spend s LEFT JOIN marketing_campaigns c ON c.id = s.campaign_id
       WHERE s.tenant_id = ? AND s.data >= DATE_SUB(CURDATE(), INTERVAL ? DAY) ORDER BY s.data DESC, s.id DESC LIMIT 300`, [req.tenant_id, dias]);
    const [[tot]] = await pool.query(
      "SELECT COALESCE(SUM(valor), 0) AS total FROM marketing_spend WHERE tenant_id = ? AND data >= DATE_SUB(CURDATE(), INTERVAL ? DAY)", [req.tenant_id, dias]);
    res.json({ total: Number(tot.total), itens: rows });
  } catch (err) { responderErro(res, err, "Erro ao listar investimentos"); }
};

exports.registrarInvestimento = async (req, res) => {
  try {
    const b = req.body || {};
    const valor = Number(b.valor);
    if (!valor || valor <= 0 || valor > 100000000) throw new ErroValidacao("valor deve ser maior que zero");
    const agora = new Date();
    const dataLocal = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`; // dia do servidor, mesmo critério dos relatórios
    const data = limpar(b.data, 10) || dataLocal;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data))) throw new ErroValidacao("data inválida (use AAAA-MM-DD)");
    let campaignId = null;
    if (b.campaign_id) {
      const [[c]] = await pool.query("SELECT id FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [b.campaign_id, req.tenant_id]);
      if (!c) throw new ErroValidacao("campanha inválida");
      campaignId = c.id;
    }
    const [r] = await pool.query(
      "INSERT INTO marketing_spend (tenant_id, campaign_id, data, valor, canal, observacao, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [req.tenant_id, campaignId, data, valor, limpar(b.canal, 100), limpar(b.observacao, 255), req.user?.id || null]);
    res.status(201).json({ id: r.insertId });
  } catch (err) { responderErro(res, err, "Erro ao registrar investimento"); }
};

exports.excluirInvestimento = async (req, res) => {
  try {
    const [r] = await pool.query("DELETE FROM marketing_spend WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!r.affectedRows) return res.status(404).json({ error: "Lançamento não encontrado" });
    res.json({ message: "Lançamento excluído" });
  } catch (err) { responderErro(res, err, "Erro ao excluir investimento"); }
};
