// Tarefas de marketing: tudo que a Aria recomenda ou que uma regra de recuperação encontra
// vira uma tarefa com responsável, prazo, prioridade e status. Ações que dependem de publicar,
// enviar mensagem ou gastar dinheiro ficam "aguardando aprovação" até uma pessoa aprovar.
const pool = require("../../config/db");
const eventDispatcher = require("../../automation/engine/EventDispatcher");
const { ErroValidacao } = require("./leadService");

const PRIORIDADES = ["baixa", "media", "alta"];

const txt = (v, max) => { const s = String(v ?? "").trim(); return s ? s.slice(0, max) : null; };

// Lead, cliente, campanha e responsável precisam ser da mesma empresa da tarefa.
async function validarReferencias(tenantId, t) {
  const checks = [["lead_id", "marketing_leads", "lead"], ["customer_id", "customers", "cliente"], ["campaign_id", "marketing_campaigns", "campanha"], ["responsavel_id", "users", "responsável"]];
  for (const [campo, tabela, nome] of checks) {
    const id = Number(t[campo]);
    if (!id) continue;
    const [[r]] = await pool.query(`SELECT id FROM ${tabela} WHERE id = ? AND tenant_id = ?`, [id, tenantId]);
    if (!r) throw new ErroValidacao(`${nome} inválido para esta empresa`);
  }
}

async function criarTarefa(tenantId, t, { userId = null } = {}) {
  const titulo = txt(t.titulo, 255);
  if (!titulo) throw new ErroValidacao("titulo é obrigatório");
  const prioridade = PRIORIDADES.includes(t.prioridade) ? t.prioridade : "media";
  const origem = ["manual", "aria", "recuperacao"].includes(t.origem) ? t.origem : "manual";
  const requerAprovacao = !!t.requer_aprovacao;
  let prazo = null;
  if (t.prazo) {
    if (Number.isNaN(Date.parse(t.prazo))) throw new ErroValidacao("prazo inválido");
    prazo = String(t.prazo).slice(0, 10);
  } else if (t.prazo_dias !== undefined && Number.isFinite(Number(t.prazo_dias))) {
    prazo = new Date(Date.now() + Number(t.prazo_dias) * 86400000).toISOString().slice(0, 10);
  }
  await validarReferencias(tenantId, t);
  const chave = txt(t.chave, 120);
  if (chave) {
    const [[aberta]] = await pool.query(
      "SELECT id FROM marketing_tasks WHERE tenant_id = ? AND chave = ? AND status IN ('aguardando_aprovacao','aberta','em_andamento') LIMIT 1", [tenantId, chave]);
    if (aberta) return { id: aberta.id, duplicada: true };
  }
  const status = requerAprovacao ? "aguardando_aprovacao" : "aberta";
  const [r] = await pool.query(
    `INSERT INTO marketing_tasks (tenant_id, titulo, descricao, prioridade, status, prazo, responsavel_id, lead_id, customer_id, campaign_id,
        recomendacao_id, estrategia_id, origem, requer_aprovacao, chave, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [tenantId, titulo, txt(t.descricao, 4000), prioridade, status, prazo, Number(t.responsavel_id) || null, Number(t.lead_id) || null,
      Number(t.customer_id) || null, Number(t.campaign_id) || null, Number(t.recomendacao_id) || null, Number(t.estrategia_id) || null,
      origem, requerAprovacao ? 1 : 0, chave, userId]);
  try { await eventDispatcher.dispatch("marketing_tarefa_criada", tenantId, { task_id: r.insertId, titulo, origem, lead_id: t.lead_id || null }); } catch { /* não trava */ }
  return { id: r.insertId, duplicada: false, status };
}

async function listarTarefas(tenantId, { status, origem, responsavelId } = {}) {
  let sql = `SELECT t.*, u.nome AS responsavel_nome, l.nome AS lead_nome, c.nome AS campanha_nome
             FROM marketing_tasks t LEFT JOIN users u ON u.id = t.responsavel_id AND u.tenant_id = t.tenant_id
             LEFT JOIN marketing_leads l ON l.id = t.lead_id AND l.tenant_id = t.tenant_id LEFT JOIN marketing_campaigns c ON c.id = t.campaign_id AND c.tenant_id = t.tenant_id
             WHERE t.tenant_id = ?`;
  const params = [tenantId];
  if (status === "abertas") sql += " AND t.status IN ('aguardando_aprovacao','aberta','em_andamento')";
  else if (status) { sql += " AND t.status = ?"; params.push(status); }
  if (origem) { sql += " AND t.origem = ?"; params.push(origem); }
  if (responsavelId) { sql += " AND t.responsavel_id = ?"; params.push(Number(responsavelId)); }
  sql += " ORDER BY FIELD(t.status,'aguardando_aprovacao','aberta','em_andamento','concluida','cancelada'), FIELD(t.prioridade,'alta','media','baixa'), t.prazo IS NULL, t.prazo, t.id DESC LIMIT 300";
  const [rows] = await pool.query(sql, params);
  const hoje = new Date().toISOString().slice(0, 10);
  return rows.map(r => ({ ...r, atrasada: !!r.prazo && ["aberta", "em_andamento"].includes(r.status) && String(r.prazo instanceof Date ? r.prazo.toISOString() : r.prazo).slice(0, 10) < hoje }));
}

async function atualizarTarefa(tenantId, id, dados, userId) {
  const [[t]] = await pool.query("SELECT * FROM marketing_tasks WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  if (!t) return null;
  const sets = [], params = [];
  const add = (k, v) => { sets.push(`${k} = ?`); params.push(v); };
  if (dados.titulo !== undefined) { const v = txt(dados.titulo, 255); if (!v) throw new ErroValidacao("titulo é obrigatório"); add("titulo", v); }
  if (dados.descricao !== undefined) add("descricao", txt(dados.descricao, 4000));
  if (dados.prioridade !== undefined) { if (!PRIORIDADES.includes(dados.prioridade)) throw new ErroValidacao("prioridade inválida"); add("prioridade", dados.prioridade); }
  if (dados.prazo !== undefined) {
    if (dados.prazo && Number.isNaN(Date.parse(dados.prazo))) throw new ErroValidacao("prazo inválido");
    add("prazo", dados.prazo ? String(dados.prazo).slice(0, 10) : null);
  }
  if (dados.responsavel_id !== undefined) { await validarReferencias(tenantId, { responsavel_id: dados.responsavel_id }); add("responsavel_id", Number(dados.responsavel_id) || null); }
  if (dados.status !== undefined) {
    if (!["aberta", "em_andamento", "concluida", "cancelada"].includes(dados.status)) throw new ErroValidacao("status inválido");
    if (t.status === "aguardando_aprovacao" && dados.status !== "cancelada") throw new ErroValidacao("Esta tarefa precisa ser aprovada antes de ser executada");
    add("status", dados.status);
    if (dados.status === "concluida") sets.push("concluida_em = NOW()");
  }
  if (!sets.length) return t;
  await pool.query(`UPDATE marketing_tasks SET ${sets.join(", ")} WHERE id = ? AND tenant_id = ?`, [...params, id, tenantId]);
  return true;
}

async function aprovarTarefa(tenantId, id) {
  const [r] = await pool.query(
    "UPDATE marketing_tasks SET status = 'aberta', aprovada_em = NOW() WHERE id = ? AND tenant_id = ? AND status = 'aguardando_aprovacao'", [id, tenantId]);
  return r.affectedRows > 0;
}

async function resumoTarefas(tenantId) {
  const [[r]] = await pool.query(
    `SELECT SUM(status = 'aguardando_aprovacao') AS aguardando, SUM(status IN ('aberta','em_andamento')) AS abertas,
            SUM(status IN ('aberta','em_andamento') AND prazo < CURDATE()) AS atrasadas, SUM(status = 'concluida') AS concluidas
     FROM marketing_tasks WHERE tenant_id = ?`, [tenantId]);
  return { aguardando_aprovacao: Number(r.aguardando || 0), abertas: Number(r.abertas || 0), atrasadas: Number(r.atrasadas || 0), concluidas: Number(r.concluidas || 0) };
}

module.exports = { criarTarefa, listarTarefas, atualizarTarefa, aprovarTarefa, resumoTarefas };
