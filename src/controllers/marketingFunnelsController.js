// Funis de conversão personalizados: cada empresa pode ter vários funis, com as etapas que fazem
// sentido para o seu processo, e ver onde os potenciais clientes estão desistindo.
const pool = require("../config/db");
const { prepararTenant } = require("../services/marketingSchema");
const { analiseFunil, janela } = require("../services/marketing/analyticsService");
const { responderErro, ErroValidacao } = require("../services/marketing/http");

const TIPOS_ETAPA = ["etapa", "ganho", "perdido"];
const txt = (v, max) => { const s = String(v ?? "").trim(); return s ? s.slice(0, max) : null; };

async function funilDoTenant(tenantId, id) {
  const [[f]] = await pool.query("SELECT * FROM marketing_funnels WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  return f || null;
}

exports.listar = async (req, res) => {
  try {
    await prepararTenant(req.tenant_id);
    const [funis] = await pool.query(
      `SELECT f.*, (SELECT COUNT(*) FROM marketing_leads l JOIN marketing_funnel_stages s ON s.id = l.funnel_stage_id WHERE s.funnel_id = f.id) AS total_leads
       FROM marketing_funnels f WHERE f.tenant_id = ? ORDER BY f.padrao DESC, f.id`, [req.tenant_id]);
    const [etapas] = await pool.query("SELECT * FROM marketing_funnel_stages WHERE tenant_id = ? ORDER BY funnel_id, ordem", [req.tenant_id]);
    res.json(funis.map(f => ({ ...f, padrao: !!f.padrao, etapas: etapas.filter(e => e.funnel_id === f.id) })));
  } catch (err) { responderErro(res, err, "Erro ao listar funis"); }
};

exports.criar = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await prepararTenant(req.tenant_id);
    const nome = txt(req.body?.nome, 150);
    if (!nome) throw new ErroValidacao("nome é obrigatório");
    const etapas = Array.isArray(req.body?.etapas) ? req.body.etapas : [];
    if (etapas.length < 2 || etapas.length > 15) throw new ErroValidacao("informe de 2 a 15 etapas");
    const normal = etapas.map((e, i) => ({ nome: txt(e.nome, 100), tipo: TIPOS_ETAPA.includes(e.tipo) ? e.tipo : "etapa", ordem: i + 1 }));
    if (normal.some(e => !e.nome)) throw new ErroValidacao("toda etapa precisa de nome");
    if (normal.filter(e => e.tipo === "ganho").length > 1 || normal.filter(e => e.tipo === "perdido").length > 1) throw new ErroValidacao("use no máximo uma etapa de ganho e uma de perdido");
    if (!normal.some(e => e.tipo === "etapa")) throw new ErroValidacao("o funil precisa de ao menos uma etapa de andamento");

    await conn.beginTransaction();
    const [f] = await conn.query("INSERT INTO marketing_funnels (tenant_id, nome, descricao) VALUES (?, ?, ?)", [req.tenant_id, nome, txt(req.body?.descricao, 255)]);
    for (const e of normal) {
      await conn.query("INSERT INTO marketing_funnel_stages (funnel_id, tenant_id, nome, ordem, tipo) VALUES (?, ?, ?, ?, ?)", [f.insertId, req.tenant_id, e.nome, e.ordem, e.tipo]);
    }
    await conn.commit();
    res.status(201).json({ id: f.insertId });
  } catch (err) {
    await conn.rollback().catch(() => {});
    responderErro(res, err, "Erro ao criar funil");
  } finally { conn.release(); }
};

exports.renomear = async (req, res) => {
  try {
    const nome = txt(req.body?.nome, 150);
    if (!nome) throw new ErroValidacao("nome é obrigatório");
    const [r] = await pool.query("UPDATE marketing_funnels SET nome = ?, descricao = COALESCE(?, descricao) WHERE id = ? AND tenant_id = ?", [nome, txt(req.body?.descricao, 255), req.params.id, req.tenant_id]);
    if (!r.affectedRows) return res.status(404).json({ error: "Funil não encontrado" });
    res.json({ message: "Funil atualizado" });
  } catch (err) { responderErro(res, err, "Erro ao atualizar funil"); }
};

exports.excluir = async (req, res) => {
  try {
    const f = await funilDoTenant(req.tenant_id, req.params.id);
    if (!f) return res.status(404).json({ error: "Funil não encontrado" });
    if (f.padrao) throw new ErroValidacao("O funil padrão não pode ser excluído");
    const [[padrao]] = await pool.query("SELECT id FROM marketing_funnels WHERE tenant_id = ? AND padrao = TRUE LIMIT 1", [req.tenant_id]);
    const [[primeira]] = await pool.query("SELECT id, ordem FROM marketing_funnel_stages WHERE funnel_id = ? AND tipo = 'etapa' ORDER BY ordem LIMIT 1", [padrao.id]);
    // Os leads voltam para a primeira etapa do funil padrão
    await pool.query(
      `UPDATE marketing_leads l JOIN marketing_funnel_stages s ON s.id = l.funnel_stage_id AND s.funnel_id = ?
       SET l.funnel_stage_id = ?, l.funnel_max_ordem = ?`, [f.id, primeira.id, primeira.ordem]);
    await pool.query("DELETE FROM marketing_funnels WHERE id = ?", [f.id]);
    res.json({ message: "Funil excluído; os leads voltaram para o funil padrão" });
  } catch (err) { responderErro(res, err, "Erro ao excluir funil"); }
};

exports.adicionarEtapa = async (req, res) => {
  try {
    const f = await funilDoTenant(req.tenant_id, req.params.id);
    if (!f) return res.status(404).json({ error: "Funil não encontrado" });
    const nome = txt(req.body?.nome, 100);
    if (!nome) throw new ErroValidacao("nome é obrigatório");
    const tipo = TIPOS_ETAPA.includes(req.body?.tipo) ? req.body.tipo : "etapa";
    const [[m]] = await pool.query("SELECT COALESCE(MAX(ordem), 0) AS max FROM marketing_funnel_stages WHERE funnel_id = ?", [f.id]);
    let ordem = m.max + 1;
    if (tipo === "etapa") {
      // Entra antes das etapas de ganho/perdido
      const [[fim]] = await pool.query("SELECT MIN(ordem) AS o FROM marketing_funnel_stages WHERE funnel_id = ? AND tipo IN ('ganho','perdido')", [f.id]);
      if (fim.o) {
        ordem = fim.o;
        await pool.query("UPDATE marketing_funnel_stages SET ordem = ordem + 1 WHERE funnel_id = ? AND ordem >= ?", [f.id, ordem]);
        await pool.query("UPDATE marketing_leads l JOIN marketing_funnel_stages s ON s.id = l.funnel_stage_id AND s.funnel_id = ? SET l.funnel_max_ordem = l.funnel_max_ordem + 1 WHERE l.funnel_max_ordem >= ?", [f.id, ordem]);
      }
    } else if (tipo === "ganho" || tipo === "perdido") {
      const [[ja]] = await pool.query("SELECT id FROM marketing_funnel_stages WHERE funnel_id = ? AND tipo = ?", [f.id, tipo]);
      if (ja) throw new ErroValidacao(`o funil já tem uma etapa de ${tipo}`);
    }
    const [r] = await pool.query("INSERT INTO marketing_funnel_stages (funnel_id, tenant_id, nome, ordem, tipo) VALUES (?, ?, ?, ?, ?)", [f.id, req.tenant_id, nome, ordem, tipo]);
    res.status(201).json({ id: r.insertId });
  } catch (err) { responderErro(res, err, "Erro ao adicionar etapa"); }
};

exports.renomearEtapa = async (req, res) => {
  try {
    const nome = txt(req.body?.nome, 100);
    if (!nome) throw new ErroValidacao("nome é obrigatório");
    const [r] = await pool.query("UPDATE marketing_funnel_stages SET nome = ? WHERE id = ? AND tenant_id = ?", [nome, req.params.stageId, req.tenant_id]);
    if (!r.affectedRows) return res.status(404).json({ error: "Etapa não encontrada" });
    res.json({ message: "Etapa renomeada" });
  } catch (err) { responderErro(res, err, "Erro ao renomear etapa"); }
};

exports.excluirEtapa = async (req, res) => {
  try {
    const [[e]] = await pool.query("SELECT * FROM marketing_funnel_stages WHERE id = ? AND tenant_id = ?", [req.params.stageId, req.tenant_id]);
    if (!e) return res.status(404).json({ error: "Etapa não encontrada" });
    const [[f]] = await pool.query("SELECT padrao FROM marketing_funnels WHERE id = ?", [e.funnel_id]);
    if (f.padrao) throw new ErroValidacao("As etapas do funil padrão estão ligadas ao status dos leads e não podem ser excluídas");
    const [[ant]] = await pool.query("SELECT id, ordem FROM marketing_funnel_stages WHERE funnel_id = ? AND tipo = 'etapa' AND id <> ? ORDER BY ABS(ordem - ?) LIMIT 1", [e.funnel_id, e.id, e.ordem]);
    if (!ant) throw new ErroValidacao("O funil precisa manter ao menos uma etapa de andamento");
    await pool.query("UPDATE marketing_leads SET funnel_stage_id = ? WHERE funnel_stage_id = ?", [ant.id, e.id]);
    await pool.query("DELETE FROM marketing_funnel_stages WHERE id = ?", [e.id]);
    res.json({ message: "Etapa excluída; os leads foram para a etapa mais próxima" });
  } catch (err) { responderErro(res, err, "Erro ao excluir etapa"); }
};

exports.analise = async (req, res) => {
  try {
    const f = await funilDoTenant(req.tenant_id, req.params.id);
    if (!f) return res.status(404).json({ error: "Funil não encontrado" });
    const w = janela(req.query.dias);
    const r = await analiseFunil(req.tenant_id, f.id, { de: w.ini, ate: w.fim, campaignId: req.query.campaign_id || null });
    res.json({ ...r, periodo: { dias: w.dias, de: w.ini, ate: w.fim } });
  } catch (err) { responderErro(res, err, "Erro ao analisar funil"); }
};
