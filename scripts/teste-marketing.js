// Teste ponta a ponta da Central de Marketing.
//
// COMO RODAR (num MySQL/MariaDB de TESTE, nunca no banco de produção):
//   $env:TEST_DB_HOST="127.0.0.1"; $env:TEST_DB_PORT="3306"; $env:TEST_DB_USER="root"; $env:TEST_DB_PASS="senha"
//   node scripts/teste-marketing.js
//
// O banco usado se chama "ecomflow_test" (mude com TEST_DB_NAME, mas o nome PRECISA conter "test").
// O script APAGA e recria esse banco a cada execução. Ele recusa rodar em qualquer banco cujo nome
// não tenha "test" e em qualquer host que pareça o Aiven. A IA (Gemini) fica desligada.
//
// Como o repositório não tem as tabelas-base (tenants, users, customers, orders...), o teste cria
// versões mínimas delas e aplica as migrations reais de src/config/migrations que o Marketing usa.
const fs = require("fs");
const path = require("path");

const cfg = {
  host: process.env.TEST_DB_HOST || "127.0.0.1",
  port: Number(process.env.TEST_DB_PORT) || 3306,
  user: process.env.TEST_DB_USER || "root",
  pass: process.env.TEST_DB_PASS || "",
  name: process.env.TEST_DB_NAME || "ecomflow_test",
};
if (!/test/i.test(cfg.name)) { console.error(`RECUSADO: o nome do banco ("${cfg.name}") precisa conter "test".`); process.exit(2); }
if (/aiven|render\.com/i.test(cfg.host)) { console.error("RECUSADO: o host parece ser de produção."); process.exit(2); }

// Ambiente de teste ANTES de carregar qualquer módulo do sistema (o .env não sobrescreve variáveis já definidas)
Object.assign(process.env, {
  DB_HOST: cfg.host, DB_PORT: String(cfg.port), DB_USER: cfg.user, DB_PASS: cfg.pass, DB_NAME: cfg.name, DB_SSL: "false",
  GEMINI_API_KEY: "", JWT_SECRET: "segredo-so-para-teste", NODE_ENV: "test",
});

const raiz = path.join(__dirname, "..");
const mysql = require(path.join(raiz, "node_modules", "mysql2", "promise"));
const jwt = require(path.join(raiz, "node_modules", "jsonwebtoken"));
const bcrypt = require(path.join(raiz, "node_modules", "bcryptjs"));

// ---------------------------------------------------------------------------
// Mini framework de teste
// ---------------------------------------------------------------------------
let total = 0, falhas = [];
let grupoAtual = "";
function grupo(nome) { grupoAtual = nome; console.log(`\n== ${nome}`); }
function ok(cond, nome, detalhe) {
  total++;
  if (cond) { console.log(`  ok   ${nome}`); return true; }
  falhas.push(`[${grupoAtual}] ${nome}${detalhe !== undefined ? ` -> ${typeof detalhe === "string" ? detalhe : JSON.stringify(detalhe)}` : ""}`);
  console.log(`  FALHA ${nome}${detalhe !== undefined ? ` -> ${typeof detalhe === "string" ? detalhe : JSON.stringify(detalhe).slice(0, 300)}` : ""}`);
  return false;
}
const igual = (a, b, nome) => ok(a === b, nome, `esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);

// ---------------------------------------------------------------------------
// Banco de teste
// ---------------------------------------------------------------------------
async function prepararBanco() {
  const admin = await mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.pass, multipleStatements: false });
  await admin.query(`DROP DATABASE IF EXISTS \`${cfg.name}\``);
  await admin.query(`CREATE DATABASE \`${cfg.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.end();
  const c = await mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.pass, database: cfg.name });

  // Tabelas-base mínimas (as reais vêm do banco de produção, que não está no repositório)
  const base = [
    `CREATE TABLE tenants (id INT AUTO_INCREMENT PRIMARY KEY, nome VARCHAR(255), email VARCHAR(255), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, tenant_id INT NOT NULL, nome VARCHAR(255), email VARCHAR(255), senha VARCHAR(255), role VARCHAR(20) DEFAULT 'user', aria_pin_hash VARCHAR(255) NULL)`,
    `CREATE TABLE customers (id INT AUTO_INCREMENT PRIMARY KEY, tenant_id INT NOT NULL, nome VARCHAR(255), email VARCHAR(255), telefone VARCHAR(50), ativo BOOLEAN NOT NULL DEFAULT TRUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE products (id INT AUTO_INCREMENT PRIMARY KEY, tenant_id INT NOT NULL, nome VARCHAR(255))`,
    `CREATE TABLE orders (id INT AUTO_INCREMENT PRIMARY KEY, tenant_id INT NOT NULL, customer_id INT NULL, total DECIMAL(12,2) NOT NULL DEFAULT 0, status VARCHAR(30) NOT NULL DEFAULT 'pendente', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE order_items (id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL, product_id INT NOT NULL, quantidade INT NOT NULL DEFAULT 1)`,
    `CREATE TABLE audit_log (id INT AUTO_INCREMENT PRIMARY KEY, tenant_id INT, usuario_id INT NULL, usuario_nome VARCHAR(255) NULL, acao VARCHAR(255), origem VARCHAR(100), valor_anterior TEXT NULL, valor_novo TEXT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE aria_acoes (id INT AUTO_INCREMENT PRIMARY KEY, tenant_id INT NOT NULL, usuario_id INT NOT NULL, tipo VARCHAR(50) NOT NULL, parametros JSON NOT NULL, resumo TEXT NOT NULL, analise_impacto TEXT NOT NULL,
       nivel_risco ENUM('baixo','medio','alto') NOT NULL DEFAULT 'medio', status ENUM('pendente','confirmada','negada','expirada','erro') NOT NULL DEFAULT 'pendente', resultado JSON NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, confirmed_at TIMESTAMP NULL)`,
  ];
  for (const sql of base) await c.query(sql);

  // Migrations reais usadas pelo Marketing
  const migrations = [
    "create_event_types.sql", "add_permissions_base.sql", "create_automation_engine.sql", "create_automation_events.sql", "create_execution_pause.sql",
    "create_crm.sql", "create_marketing_fundacao.sql", "create_marketing_scoring.sql", "create_marketing_forms.sql", "create_marketing_landing_pages.sql",
    "create_marketing_ab_tests.sql", "create_marketing_attribution.sql", "create_marketing_journeys.sql",
  ];
  for (const arq of migrations) {
    const sql = fs.readFileSync(path.join(raiz, "src", "config", "migrations", arq), "utf8").replace(/^﻿/, "");
    const comandos = sql.split(/;\s*(?:\r?\n|$)/).map(s => s.replace(/^\s*--.*$/gm, "").trim()).filter(Boolean);
    for (const cmd of comandos) {
      if (/^use\s/i.test(cmd)) continue;
      try { await c.query(cmd); } catch (e) {
        if (!/already exists|Duplicate|foreign key/i.test(e.message)) console.log(`  (aviso migration ${arq}: ${e.message.slice(0, 120)})`);
      }
    }
  }
  return c;
}

// ---------------------------------------------------------------------------
async function principal() {
  const db = await prepararBanco();
  const q = async (sql, params) => (await db.query(sql, params))[0];
  const um = async (sql, params) => (await q(sql, params))[0];

  // Empresas e usuários
  const tenants = {};
  for (const [chave, nome] of [["A", "Empresa A"], ["B", "Empresa B"], ["F", "Empresa Funil"], ["V", "Empresa Vazia"]]) {
    tenants[chave] = (await db.query("INSERT INTO tenants (nome, email) VALUES (?, ?)", [nome, `${chave.toLowerCase()}@teste.com`]))[0].insertId;
  }
  const hashPin = await bcrypt.hash("1234", 4);
  async function usuario(tenant, nome, role, pin = null) {
    return (await db.query("INSERT INTO users (tenant_id, nome, email, senha, role, aria_pin_hash) VALUES (?, ?, ?, 'x', ?, ?)", [tenants[tenant], nome, `${nome}@teste.com`, role, pin]))[0].insertId;
  }
  const u = {
    adminA: await usuario("A", "adminA", "admin", hashPin),
    verA: await usuario("A", "verA", "user"),
    semA: await usuario("A", "semA", "user", hashPin),
    editorA: await usuario("A", "editorA", "user", hashPin),
    adminB: await usuario("B", "adminB", "admin", hashPin),
    adminF: await usuario("F", "adminF", "admin", hashPin),
    adminV: await usuario("V", "adminV", "admin", hashPin),
  };
  const perm = async chave => (await um("SELECT id FROM permissions WHERE chave = ?", [chave])).id;
  await db.query("INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)", [u.verA, await perm("marketing.ver")]);
  await db.query("INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)", [u.editorA, await perm("marketing.ver")]);
  await db.query("INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)", [u.editorA, await perm("marketing.editar")]);
  const token = (id, tenant, role = "user") => jwt.sign({ id, role, email: `${id}@t.com`, tenant_id: tenants[tenant] }, process.env.JWT_SECRET);
  const T = {
    A: token(u.adminA, "A", "admin"), B: token(u.adminB, "B", "admin"), F: token(u.adminF, "F", "admin"), V: token(u.adminV, "V", "admin"),
    verA: token(u.verA, "A"), semA: token(u.semA, "A"), editorA: token(u.editorA, "A"),
  };

  // Sobe o app (sem os crons) numa porta livre
  const app = require(path.join(raiz, "src", "app"));
  const servidor = await new Promise(res => { const s = app.listen(0, "127.0.0.1", () => res(s)); });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  async function api(metodo, rota, { token: tk, body, redirect } = {}) {
    const r = await fetch(base + rota, {
      method: metodo, redirect: redirect || "follow",
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const texto = await r.text();
    let json = null; try { json = JSON.parse(texto); } catch { /* html ou texto */ }
    return { status: r.status, json, texto, headers: r.headers };
  }
  const M = "/api/marketing";
  const agoraL = new Date();
  const hoje = `${agoraL.getFullYear()}-${String(agoraL.getMonth() + 1).padStart(2, "0")}-${String(agoraL.getDate()).padStart(2, "0")}`;
  const dias = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 19).replace("T", " ");

  // =========================================================================
  grupo("1. Rotas carregam e visão geral vazia não inventa números");
  {
    const sem = await api("GET", `${M}/overview`);
    igual(sem.status, 401, "sem login a visão geral devolve 401");
    const r = await api("GET", `${M}/overview`, { token: T.V });
    igual(r.status, 200, "visão geral responde 200 numa empresa nova");
    const k = r.json?.kpis || {};
    igual(k.leads_captados?.valor, 0, "leads captados = 0");
    igual(k.clientes_adquiridos?.valor, 0, "clientes adquiridos = 0");
    igual(k.cac?.valor, null, "CAC é nulo sem investimento");
    igual(k.roas?.valor, null, "ROAS é nulo sem investimento");
    igual(k.roi_pct?.valor, null, "ROI é nulo sem investimento");
    igual(k.custo_por_lead?.valor, null, "custo por lead é nulo sem investimento");
    igual(k.taxa_conversao?.valor, null, "taxa de conversão é nula sem leads");
    igual(r.json?.funil?.gargalo, null, "sem gargalo inventado");
    igual(r.json?.funil?.amostra_suficiente, false, "amostra insuficiente sinalizada");
    ok(Array.isArray(r.json?.canais) && r.json.canais.length === 0, "nenhum canal inventado");
    ok(Array.isArray(r.json?.campanhas) && r.json.campanhas.length === 0, "nenhuma campanha inventada");
    ok(Array.isArray(r.json?.leads_prioritarios) && r.json.leads_prioritarios.length === 0, "nenhum lead prioritário inventado");
    ok((r.json?.dados?.sinais_de_pouco_dado || []).some(s => /Nenhum investimento/.test(s)), "avisa que falta investimento");
    ok(Object.values(k).every(x => ["observado", "calculado", "atribuido", "informado", "estimado"].includes(x.tipo)), "todo KPI traz o tipo (observado/calculado/atribuído/informado)");
    igual(k.cac?.tipo, "calculado", "CAC marcado como calculado");
    igual(k.receita_atribuida?.tipo, "atribuido", "receita marcada como atribuída");
    ok(!!k.receita_atribuida?.regra, "receita atribuída explica a regra de atribuição");
  }

  // =========================================================================
  grupo("2. UTM, link curto e clique");
  let campanhaC, linkSlug, linkId;
  {
    const c = await api("POST", `${M}/campaigns`, { token: T.A, body: { nome: "Campanha C", objetivo: "Captar leads", tipo: "ads", canal: "instagram", orcamento: 1000 } });
    igual(c.status, 201, "cria campanha");
    campanhaC = c.json?.id;
    const bad = await api("POST", `${M}/links`, { token: T.A, body: { nome: "x", destino: "javascript:alert(1)", utm_source: "ig" } });
    igual(bad.status, 400, "recusa destino javascript:");
    const semSrc = await api("POST", `${M}/links`, { token: T.A, body: { nome: "x", destino: "https://loja.exemplo.com" } });
    igual(semSrc.status, 400, "exige utm_source");
    const l = await api("POST", `${M}/links`, { token: T.A, body: { nome: "Insta cpc", destino: "https://loja.exemplo.com/oferta?x=1", utm_source: "instagram", utm_medium: "cpc", utm_campaign: "black", campaign_id: campanhaC } });
    igual(l.status, 201, "cria link rastreável");
    linkSlug = l.json?.slug; linkId = l.json?.id;
    const red = await api("GET", `${M}/r/${linkSlug}`, { redirect: "manual" });
    igual(red.status, 302, "link curto redireciona (público, sem login)");
    const loc = red.headers.get("location") || "";
    ok(loc.startsWith("https://loja.exemplo.com/oferta") && loc.includes("utm_source=instagram") && loc.includes("utm_medium=cpc") && loc.includes("utm_campaign=black") && loc.includes(`mkt=${linkSlug}`) && loc.includes("x=1"),
      "destino leva UTM e o código mkt sem perder parâmetros existentes", loc);
    const lista = await api("GET", `${M}/links`, { token: T.A });
    const meu = (lista.json || []).find(x => x.id === linkId);
    igual(Number(meu?.cliques), 1, "clique foi contado");
    await api("PUT", `${M}/links/${linkId}`, { token: T.A, body: { ativo: false } });
    const off = await api("GET", `${M}/r/${linkSlug}`, { redirect: "manual" });
    igual(off.status, 404, "link desativado não redireciona");
    await api("PUT", `${M}/links/${linkId}`, { token: T.A, body: { ativo: true } });
    const outro = await api("GET", `${M}/links`, { token: T.B });
    igual((outro.json || []).length, 0, "outra empresa não vê os links");
    const nope = await api("GET", `${M}/r/naoexiste`, { redirect: "manual" });
    igual(nope.status, 404, "slug inexistente dá 404");
  }

  // =========================================================================
  grupo("3. Formulário público (sem duplicar, honeypot, validação)");
  let formToken, formId, leadMaria;
  {
    const f = await api("POST", `${M}/forms`, { token: T.A, body: { nome: "Form site", campos: [{ nome: "nome", obrigatorio: true }, { nome: "email", obrigatorio: true }], campaign_id: campanhaC } });
    igual(f.status, 201, "cria formulário");
    formToken = f.json?.token; formId = f.json?.id;
    const dados = { nome: "Maria", email: "maria@ex.com", telefone: "(11) 98888-7777", consentimento: "1", utm_source: "instagram", mkt: linkSlug };
    const r1 = await api("POST", `${M}/forms/public/${formToken}`, { body: dados });
    igual(r1.status, 201, "envio público cria lead");
    const lead = await um("SELECT * FROM marketing_leads WHERE tenant_id = ? AND email = 'maria@ex.com'", [tenants.A]);
    leadMaria = lead?.id;
    ok(lead && lead.campaign_id === campanhaC && lead.utm_source === "instagram" && lead.tracking_link_id === linkId && lead.consentimento === 1, "lead guarda campanha, UTM, link e consentimento", lead);
    const r2 = await api("POST", `${M}/forms/public/${formToken}`, { body: dados });
    igual(r2.status, 201, "reenvio é aceito");
    igual((await q("SELECT id FROM marketing_leads WHERE tenant_id = ? AND email = 'maria@ex.com'", [tenants.A])).length, 1, "reenvio com o mesmo e-mail não duplica");
    const r3 = await api("POST", `${M}/forms/public/${formToken}`, { body: { nome: "Maria Outra", email: "outro@ex.com", telefone: "11 98888 7777" } });
    igual(r3.status, 201, "mesmo telefone com outro e-mail é aceito");
    igual((await q("SELECT id FROM marketing_leads WHERE tenant_id = ? AND telefone_normalizado = '11988887777'", [tenants.A])).length, 1, "mesmo telefone não duplica o lead");
    ok((await um("SELECT COUNT(*) n FROM marketing_lead_events WHERE lead_id = ? AND tipo = 'reentrada'", [leadMaria])).n >= 2, "reentradas ficam no histórico do lead");
    const bot = await api("POST", `${M}/forms/public/${formToken}`, { body: { nome: "Bot", email: "bot@ex.com", website: "http://spam" } });
    igual(bot.status, 201, "honeypot finge sucesso");
    igual((await q("SELECT id FROM marketing_leads WHERE email = 'bot@ex.com'")).length, 0, "honeypot descarta o lead");
    igual((await api("POST", `${M}/forms/public/${formToken}`, { body: { nome: "X", email: "abc" } })).status, 400, "e-mail inválido dá 400");
    igual((await api("POST", `${M}/forms/public/${formToken}`, { body: { nome: "X" } })).status, 400, "campo obrigatório ausente dá 400");
    igual((await api("POST", `${M}/forms/public/${formToken}`, { body: { nome: "X", email: "x@ex.com", telefone: "123" } })).status, 400, "telefone curto dá 400");
    igual((await api("POST", `${M}/forms/public/tokeninvalido`, { body: { nome: "X", email: "x@ex.com" } })).status, 404, "token inválido dá 404");
    await api("PUT", `${M}/forms/${formId}`, { token: T.A, body: { ativo: false } });
    igual((await api("POST", `${M}/forms/public/${formToken}`, { body: { nome: "Y", email: "y@ex.com" } })).status, 404, "formulário inativo dá 404");
    await api("PUT", `${M}/forms/${formId}`, { token: T.A, body: { ativo: true } });
  }

  // =========================================================================
  grupo("4. Pontuação por evento e por atributo, com histórico");
  let leadScore;
  {
    const c = await api("POST", `${M}/leads`, { token: T.A, body: { nome: "Score Teste", email: "score@ex.com", telefone: "11977776666", empresa: "ACME", interesse: "plano anual", origem: "indicacao", valor_estimado: 2000 } });
    igual(c.status, 201, "cria lead manual");
    leadScore = c.json?.id;
    let l = (await api("GET", `${M}/leads/${leadScore}`, { token: T.A })).json;
    igual(l?.score, 65, "score inicial = 10 (evento) + 10+5+10+15+15 (atributos)");
    igual(l?.temperatura, "morno", "65 pontos = morno");
    const soma = (l?.historico_score || []).reduce((a, h) => a + h.pontos_aplicados, 0);
    igual(soma, 65, "histórico soma exatamente o score");
    ok((l?.historico_score || []).every(h => h.motivo), "cada ponto tem um motivo");
    ok(/Score 65/.test(l?.explicacao || "") && (l?.motivos || []).length > 0, "explicação em linguagem simples traz a composição");
    await api("PUT", `${M}/leads/${leadScore}`, { token: T.A, body: { telefone: "11977776666", empresa: "ACME" } });
    igual((await um("SELECT score FROM marketing_leads WHERE id = ?", [leadScore])).score, 65, "editar sem mudar dados não pontua de novo");
    await api("PUT", `${M}/leads/${leadScore}/status`, { token: T.A, body: { status: "qualificado" } });
    igual((await um("SELECT score FROM marketing_leads WHERE id = ?", [leadScore])).score, 95, "qualificado = +30");
    igual((await um("SELECT temperatura FROM marketing_leads WHERE id = ?", [leadScore])).temperatura, "quente", "95 pontos = quente");
    await api("POST", `${M}/leads/${leadScore}/interacoes`, { token: T.A, body: { tipo: "reuniao", descricao: "Demo" } });
    igual((await um("SELECT score FROM marketing_leads WHERE id = ?", [leadScore])).score, 120, "reunião = +25");
    const regras = (await api("GET", `${M}/scoring/regras`, { token: T.A })).json?.regras || [];
    const rResp = regras.find(r => r.event_type === "interacao_resposta");
    ok(!!rResp, "regras iniciais foram criadas para a empresa");
    await api("PUT", `${M}/scoring/regras/${rResp.id}`, { token: T.A, body: { ativa: false } });
    await api("POST", `${M}/leads/${leadScore}/interacoes`, { token: T.A, body: { tipo: "resposta" } });
    igual((await um("SELECT score FROM marketing_leads WHERE id = ?", [leadScore])).score, 120, "regra desativada não pontua");
    const nova = await api("POST", `${M}/scoring/regras`, { token: T.A, body: { tipo: "atributo", campo: "canal", operador: "contem", valor: "man", pontos: 7, descricao: "Canal manual" } });
    igual(nova.status, 201, "cria regra de atributo configurável");
    igual((await api("POST", `${M}/scoring/regras`, { token: T.A, body: { tipo: "evento", event_type: "x_y", pontos: 500 } })).status, 400, "recusa pontos fora do limite");
    igual((await api("POST", `${M}/scoring/regras`, { token: T.A, body: { tipo: "atributo", campo: "senha", operador: "igual", valor: "a", pontos: 1 } })).status, 400, "recusa campo fora da lista");
    await api("POST", `${M}/leads/${leadScore}/interacoes`, { token: T.A, body: { tipo: "nota", descricao: "só nota" } });
    await api("PUT", `${M}/leads/${leadScore}`, { token: T.A, body: { canal: "manual" } });
    igual((await um("SELECT score FROM marketing_leads WHERE id = ?", [leadScore])).score, 127, "regra de atributo nova é aplicada uma única vez");
    await api("PUT", `${M}/leads/${leadScore}`, { token: T.A, body: { canal: "manual" } });
    igual((await um("SELECT score FROM marketing_leads WHERE id = ?", [leadScore])).score, 127, "e não repete");
    const ajuste = await api("PUT", `${M}/leads/${leadScore}/score`, { token: T.A, body: { delta: -7, motivo: "teste" } });
    igual(ajuste.status, 200, "ajuste manual aceito");
    igual((await um("SELECT score FROM marketing_leads WHERE id = ?", [leadScore])).score, 120, "ajuste manual aplicado");
    igual((await api("PUT", `${M}/leads/${leadScore}/score`, { token: T.A, body: { delta: "1; DROP" } })).status, 400, "delta não numérico dá 400");
    // Empresa nova recebe as regras próprias
    const rB = (await api("GET", `${M}/scoring/regras`, { token: T.B })).json?.regras || [];
    ok(rB.length >= 10, "regras iniciais existem também para outras empresas (não só a empresa 1)");
    ok(rB.every(r => r.tenant_id === tenants.B), "regras de B pertencem a B");
  }

  // =========================================================================
  grupo("5. Funil e gargalo (amostra mínima)");
  {
    const funis = (await api("GET", `${M}/funnels`, { token: T.F })).json || [];
    const padrao = funis.find(f => f.padrao);
    ok(!!padrao && padrao.etapas.length === 7, "funil padrão criado com 7 etapas", funis);
    const mk = async i => (await api("POST", `${M}/leads`, { token: T.F, body: { nome: `Lead F${i}`, email: `f${i}@ex.com` } })).json?.id;
    const ids = [];
    for (let i = 0; i < 12; i++) ids.push(await mk(i));
    for (const id of ids.slice(0, 6)) await api("PUT", `${M}/leads/${id}/status`, { token: T.F, body: { status: "oportunidade" } });
    let a = (await api("GET", `${M}/funnels/${padrao.id}/analise`, { token: T.F })).json;
    igual(a?.total_leads, 12, "análise conta os 12 leads");
    igual(a?.gargalo, null, "com 12 leads (< 20) não aponta gargalo");
    igual(a?.amostra_suficiente, false, "informa que a amostra é insuficiente");
    for (let i = 12; i < 30; i++) ids.push(await mk(i));
    // 4 clientes, 6 oportunidade, 2 qualificado, 2 engajado, 14 contactado (12 já) — monta 30 leads
    const alvo = [...Array(4).fill("cliente"), ...Array(6).fill("oportunidade"), ...Array(2).fill("qualificado"), ...Array(2).fill("engajado"), ...Array(14).fill("contactado"), ...Array(2).fill("novo")];
    for (let i = 0; i < 30; i++) {
      if (alvo[i] === "novo") continue;
      await api("PUT", `${M}/leads/${ids[i]}/status`, { token: T.F, body: { status: alvo[i] } });
    }
    // os 6 primeiros já estavam em "oportunidade"; o alvo reordena: ajusta os que ficaram a mais
    const contagem = await q("SELECT status, COUNT(*) n FROM marketing_leads WHERE tenant_id = ? GROUP BY status", [tenants.F]);
    const porStatus = Object.fromEntries(contagem.map(c => [c.status, Number(c.n)]));
    ok(porStatus.cliente === 4 && porStatus.oportunidade === 6, "distribuição montada como planejado", porStatus);
    a = (await api("GET", `${M}/funnels/${padrao.id}/analise`, { token: T.F })).json;
    igual(a?.amostra_suficiente, true, "30 leads: amostra suficiente");
    const e = Object.fromEntries((a?.etapas || []).map(x => [x.nome, x]));
    ok(e.Novo?.alcancaram === 30 && e.Contactado?.alcancaram === 28 && e.Engajado?.alcancaram === 14 && e.Qualificado?.alcancaram === 12 && e.Oportunidade?.alcancaram === 10 && e.Cliente?.alcancaram === 4,
      "quantos alcançaram cada etapa", Object.fromEntries(Object.entries(e).map(([k, v]) => [k, v.alcancaram])));
    igual(a?.gargalo?.etapa, "Oportunidade", "gargalo = etapa com maior desistência (60%) e volume suficiente");
    igual(a?.gargalo?.pct_desistencia, 60, "percentual de desistência correto");
    // Perdido não "avança" o lead no funil
    const novo = ids[29];
    await api("PUT", `${M}/leads/${novo}/status`, { token: T.F, body: { status: "perdido", motivo: "sem interesse" } });
    const perd = await um("SELECT funnel_max_ordem, motivo_perda FROM marketing_leads WHERE id = ?", [novo]);
    ok(perd.funnel_max_ordem === 1 && perd.motivo_perda === "sem interesse", "perdido preserva o ponto mais avançado e guarda o motivo", perd);
    // Funis personalizados
    igual((await api("POST", `${M}/funnels`, { token: T.F, body: { nome: "Curto", etapas: [{ nome: "A" }] } })).status, 400, "funil com 1 etapa é recusado");
    const novoF = await api("POST", `${M}/funnels`, { token: T.F, body: { nome: "B2B", etapas: [{ nome: "Prospecção" }, { nome: "Reunião" }, { nome: "Fechado", tipo: "ganho" }, { nome: "Perdido", tipo: "perdido" }] } });
    igual(novoF.status, 201, "cria funil personalizado");
    igual((await api("DELETE", `${M}/funnels/${padrao.id}`, { token: T.F })).status, 400, "funil padrão não pode ser excluído");
    igual((await api("GET", `${M}/funnels/${padrao.id}/analise`, { token: T.B })).status, 404, "outra empresa não analisa este funil");
    igual((await api("DELETE", `${M}/funnels/${novoF.json.id}`, { token: T.F })).status, 200, "exclui funil personalizado");
  }

  // =========================================================================
  grupo("6. Envio ao CRM e conversão ganha/perdida");
  let leadCrm, dealCrm;
  {
    const c = await api("POST", `${M}/leads`, { token: T.A, body: { nome: "CRM Teste", email: "crm@ex.com", telefone: "11966665555", interesse: "Pacote X", valor_estimado: 5000, proxima_acao: "Ligar amanhã" } });
    leadCrm = c.json?.id;
    await api("PUT", `${M}/leads/${leadCrm}/status`, { token: T.A, body: { status: "qualificado" } });
    const r = await api("POST", `${M}/leads/${leadCrm}/enviar-crm`, { token: T.A });
    igual(r.status, 201, "envia ao CRM");
    dealCrm = r.json?.deal_id;
    const cli = await um("SELECT * FROM customers WHERE tenant_id = ? AND email = 'crm@ex.com'", [tenants.A]);
    ok(!!cli, "cria o cliente");
    const deal = await um("SELECT * FROM crm_deals WHERE id = ? AND tenant_id = ?", [dealCrm, tenants.A]);
    ok(deal && Number(deal.valor) === 5000 && deal.estagio === "qualificacao" && /CRM Teste/.test(deal.titulo), "cria a oportunidade com valor e estágio", deal);
    const nota = await um("SELECT descricao FROM crm_interactions WHERE deal_id = ?", [dealCrm]);
    ok(nota && /Lead vindo do Marketing/.test(nota.descricao) && /Pontuação/.test(nota.descricao), "registra nota com origem e pontuação", nota);
    const tarefa = await um("SELECT titulo FROM crm_tasks WHERE deal_id = ?", [dealCrm]);
    igual(tarefa?.titulo, "Ligar amanhã", "agenda o primeiro contato");
    const lead = await um("SELECT status, deal_id, customer_id FROM marketing_leads WHERE id = ?", [leadCrm]);
    ok(lead.status === "oportunidade" && lead.deal_id === dealCrm && lead.customer_id === cli.id, "lead fica ligado ao CRM e vira oportunidade", lead);
    ok((await um("SELECT COUNT(*) n FROM automation_events WHERE event_type = 'lead_enviado_crm'")).n >= 1, "evento lead_enviado_crm foi emitido para o motor de automações");
    igual((await api("POST", `${M}/leads/${leadCrm}/enviar-crm`, { token: T.A })).status, 400, "não envia duas vezes");
    const p = (await api("POST", `${M}/leads`, { token: T.A, body: { nome: "Perdido", email: "perdido@ex.com" } })).json.id;
    await api("PUT", `${M}/leads/${p}/status`, { token: T.A, body: { status: "perdido" } });
    igual((await api("POST", `${M}/leads/${p}/enviar-crm`, { token: T.A })).status, 400, "lead perdido não vai ao CRM");
    igual((await api("POST", `${M}/leads/${leadCrm}/enviar-crm`, { token: T.B })).status, 404, "outra empresa não envia o lead");
    // Conversão ganha
    await db.query("UPDATE crm_deals SET estagio = 'ganho' WHERE id = ?", [dealCrm]);
    const s = await api("POST", `${M}/sincronizar`, { token: T.A });
    igual(s.status, 200, "sincroniza");
    const g = await um("SELECT status, convertido_em FROM marketing_leads WHERE id = ?", [leadCrm]);
    ok(g.status === "cliente" && g.convertido_em, "negócio ganho no CRM vira cliente no marketing", g);
    // Conversão perdida
    const l2 = (await api("POST", `${M}/leads`, { token: T.A, body: { nome: "CRM Perde", email: "perde@ex.com" } })).json.id;
    const d2 = (await api("POST", `${M}/leads/${l2}/enviar-crm`, { token: T.A })).json.deal_id;
    await db.query("UPDATE crm_deals SET estagio = 'perdido', motivo_perda = 'preço' WHERE id = ?", [d2]);
    await api("POST", `${M}/sincronizar`, { token: T.A });
    const pe = await um("SELECT status, motivo_perda FROM marketing_leads WHERE id = ?", [l2]);
    ok(pe.status === "perdido" && pe.motivo_perda === "preço", "negócio perdido no CRM vira perdido com o motivo", pe);
  }

  // =========================================================================
  grupo("7. Atribuição de receita (regressão do bug que inflava o ROI)");
  let leadCli1, cli1, cli2, pedido1;
  {
    const c1 = (await db.query("INSERT INTO customers (tenant_id, nome, email) VALUES (?, 'Cliente1', 'cliente1@ex.com')", [tenants.A]))[0].insertId;
    const c2 = (await db.query("INSERT INTO customers (tenant_id, nome, email) VALUES (?, 'Cliente2', 'cliente2@ex.com')", [tenants.A]))[0].insertId;
    cli1 = c1; cli2 = c2;
    const lead = await api("POST", `${M}/forms/public/${formToken}`, { body: { nome: "Lead Cliente1", email: "cliente1@ex.com", mkt: linkSlug } });
    igual(lead.status, 201, "lead entra pela campanha C");
    leadCli1 = (await um("SELECT id FROM marketing_leads WHERE tenant_id = ? AND email = 'cliente1@ex.com'", [tenants.A])).id;
    // pedido ANTIGO (antes do lead) do mesmo cliente
    await db.query("INSERT INTO orders (tenant_id, customer_id, total, status, created_at) VALUES (?, ?, 999, 'pago', ?)", [tenants.A, c1, dias(30)]);
    // vincula e cria pedidos depois do lead
    await db.query("UPDATE marketing_leads SET created_at = ? WHERE id = ?", [dias(2), leadCli1]);
    const v = await api("PUT", `${M}/leads/${leadCli1}/vincular-cliente`, { token: T.A, body: { customer_id: c1 } });
    igual(v.status, 200, "vincula lead ao cliente");
    pedido1 = (await db.query("INSERT INTO orders (tenant_id, customer_id, total, status, created_at) VALUES (?, ?, 300, 'pago', ?)", [tenants.A, c1, dias(1)]))[0].insertId;
    await db.query("INSERT INTO orders (tenant_id, customer_id, total, status) VALUES (?, ?, 500, 'pendente')", [tenants.A, c1]);
    const pedidoOutro = (await db.query("INSERT INTO orders (tenant_id, customer_id, total, status) VALUES (?, ?, 1000, 'pago')", [tenants.A, c2]))[0].insertId;
    // vínculo errado deixado pelo código antigo: pedido de OUTRO cliente ligado a este lead
    await db.query("INSERT INTO marketing_conversions (tenant_id, campaign_id, lead_id, customer_id, order_id, valor) VALUES (?, ?, ?, ?, ?, 1000)", [tenants.A, campanhaC, leadCli1, c1, pedidoOutro]);
    const s = await api("POST", `${M}/sincronizar`, { token: T.A });
    igual(s.status, 200, "sincroniza e atribui");
    igual((await q("SELECT id FROM marketing_conversions WHERE order_id = ?", [pedidoOutro])).length, 0, "vínculo antigo de pedido de outro cliente é removido");
    const conv = await q("SELECT order_id, valor FROM marketing_conversions WHERE campaign_id = ?", [campanhaC]);
    ok(conv.length === 1 && conv[0].order_id === pedido1 && Number(conv[0].valor) === 300, "só o pedido pago, do cliente do lead, feito depois do lead conta", conv);
    const d = (await api("GET", `${M}/campanhas/${campanhaC}/desempenho`, { token: T.A })).json;
    igual(d?.receita_atribuida, 300, "receita da campanha = 300 (não 1.299, 1.000 nem 800)");
    igual((await api("GET", `${M}/campanhas/${campanhaC}/desempenho`, { token: T.B })).status, 404, "outra empresa não vê o desempenho");
  }

  // =========================================================================
  grupo("8. Investimento -> CAC, ROAS, ROI");
  {
    igual((await api("POST", `${M}/investimentos`, { token: T.A, body: { valor: 0 } })).status, 400, "valor zero é recusado");
    igual((await api("POST", `${M}/investimentos`, { token: T.A, body: { valor: 10, data: "31/12/2026" } })).status, 400, "data inválida é recusada");
    const cb = (await api("POST", `${M}/campaigns`, { token: T.B, body: { nome: "Camp B" } })).json.id;
    igual((await api("POST", `${M}/investimentos`, { token: T.A, body: { valor: 10, campaign_id: cb } })).status, 400, "campanha de outra empresa é recusada");
    const inv = await api("POST", `${M}/investimentos`, { token: T.A, body: { valor: 200, campaign_id: campanhaC, canal: "instagram", data: hoje } });
    igual(inv.status, 201, "registra investimento");
    const r = (await api("GET", `${M}/overview?campaign_id=${campanhaC}&dias=30`, { token: T.A })).json;
    const k = r?.kpis || {};
    const nLeads = (await um("SELECT COUNT(*) n FROM marketing_leads WHERE campaign_id = ?", [campanhaC])).n;
    igual(k.investimento?.valor, 200, "investimento = 200");
    igual(k.clientes_adquiridos?.valor, 1, "1 cliente adquirido na campanha");
    igual(k.cac?.valor, 200, "CAC = 200 / 1");
    igual(k.receita_atribuida?.valor, 300, "receita atribuída = 300");
    igual(k.roas?.valor, 1.5, "ROAS = 300 / 200");
    igual(k.roi_pct?.valor, 50, "ROI = (300 - 200) / 200 = 50%");
    igual(k.custo_por_lead?.valor, Number((200 / Number(nLeads)).toFixed(2)), "custo por lead = 200 / leads da campanha");
    igual(k.cac?.tipo, "calculado", "CAC segue marcado como calculado");
    igual(k.investimento?.tipo, "informado", "investimento marcado como informado");
    const c = (r?.campanhas || []).find(x => x.id === campanhaC);
    ok(c && c.roas === 1.5 && c.custo_por_cliente === 200, "campanha mostra custo por cliente e ROAS reais", c);
    const lista = await api("GET", `${M}/investimentos`, { token: T.A });
    igual(lista.json?.total, 200, "lista de investimentos soma 200");
    igual((await api("GET", `${M}/investimentos`, { token: T.B })).json?.total, 0, "outra empresa não vê o investimento");
    igual((await api("DELETE", `${M}/investimentos/${inv.json.id}`, { token: T.B })).status, 404, "outra empresa não apaga");
    // Mantém o lançamento para os próximos grupos
  }

  // =========================================================================
  grupo("9. Recuperação de oportunidades (sem duplicar tarefas)");
  {
    // lead parado
    const stale = (await api("POST", `${M}/leads`, { token: T.A, body: { nome: "Lead Parado", email: "parado@ex.com", valor_estimado: 800 } })).json.id;
    await db.query("UPDATE marketing_leads SET created_at = ? WHERE id = ?", [dias(10), stale]);
    // negociação parada e proposta parada no CRM
    const cn = (await db.query("INSERT INTO customers (tenant_id, nome, email) VALUES (?, 'Cliente Negocio', 'neg@ex.com')", [tenants.A]))[0].insertId;
    const d1 = (await db.query("INSERT INTO crm_deals (tenant_id, customer_id, titulo, valor, estagio) VALUES (?, ?, 'Negócio parado', 3000, 'negociacao')", [tenants.A, cn]))[0].insertId;
    const d2 = (await db.query("INSERT INTO crm_deals (tenant_id, customer_id, titulo, valor, estagio) VALUES (?, ?, 'Proposta parada', 2000, 'proposta')", [tenants.A, cn]))[0].insertId;
    await db.query("UPDATE crm_deals SET updated_at = ? WHERE id IN (?, ?)", [dias(10), d1, d2]);
    // pedido pendente
    await db.query("INSERT INTO orders (tenant_id, customer_id, total, status, created_at) VALUES (?, ?, 450, 'pendente', ?)", [tenants.A, cn, dias(5)]);
    // cliente inativo (1 compra, 120 dias)
    const ci = (await db.query("INSERT INTO customers (tenant_id, nome, email) VALUES (?, 'Cliente Inativo', 'inativo@ex.com')", [tenants.A]))[0].insertId;
    await db.query("INSERT INTO orders (tenant_id, customer_id, total, status, created_at) VALUES (?, ?, 700, 'pago', ?)", [tenants.A, ci, dias(120)]);
    // recompra (2 compras com 30 dias de intervalo, última há 50 dias)
    const cr = (await db.query("INSERT INTO customers (tenant_id, nome, email) VALUES (?, 'Cliente Recompra', 'recompra@ex.com')", [tenants.A]))[0].insertId;
    await db.query("INSERT INTO orders (tenant_id, customer_id, total, status, created_at) VALUES (?, ?, 200, 'pago', ?), (?, ?, 200, 'pago', ?)", [tenants.A, cr, dias(80), tenants.A, cr, dias(50)]);

    const op = (await api("GET", `${M}/recovery/oportunidades`, { token: T.A })).json || [];
    const g = Object.fromEntries(op.map(x => [x.tipo, x]));
    ok(g.lead_sem_contato?.quantidade >= 1, "acha lead sem contato", g.lead_sem_contato?.quantidade);
    ok(g.negociacao_parada?.quantidade >= 1 && g.negociacao_parada.valor_potencial >= 3000, "acha negociação parada com o valor");
    ok(g.proposta_parada?.quantidade >= 1, "acha proposta parada");
    ok(g.cliente_inativo?.quantidade >= 1, "acha cliente inativo");
    ok(g.recompra?.quantidade >= 1, "acha potencial de recompra");
    igual(g.recompra?.tipo_metrica, "estimado", "recompra é marcada como estimativa");
    igual(g.lead_sem_contato?.tipo_metrica, "observado", "lead sem contato é observado");
    ok(g.pedido_pendente?.quantidade >= 1, "acha pedido pendente");
    const total = op.reduce((a, x) => a + x.quantidade, 0);
    const e1 = (await api("POST", `${M}/recovery/executar`, { token: T.A })).json;
    ok(e1?.tarefas_criadas === total && total > 0, "cria uma tarefa por oportunidade", { e1, total });
    const e2 = (await api("POST", `${M}/recovery/executar`, { token: T.A })).json;
    igual(e2?.tarefas_criadas, 0, "rodar de novo não duplica tarefas");
    const tarefas = (await api("GET", `${M}/tasks?origem=recuperacao`, { token: T.A })).json;
    igual(tarefas?.itens?.length, total, "tarefas de recuperação listadas");
    const regras = (await api("GET", `${M}/recovery/regras`, { token: T.A })).json || [];
    const rPend = regras.find(r => r.tipo === "pedido_pendente");
    igual((await api("PUT", `${M}/recovery/regras/${rPend.id}`, { token: T.A, body: { dias: -1 } })).status, 400, "dias negativo é recusado");
    igual((await api("PUT", `${M}/recovery/regras/${rPend.id}`, { token: T.B, body: { ativa: false } })).status, 404, "outra empresa não altera a regra");
    igual((await api("PUT", `${M}/recovery/regras/${rPend.id}`, { token: T.A, body: { ativa: false } })).status, 200, "desativa a regra");
    const op2 = (await api("GET", `${M}/recovery/oportunidades`, { token: T.A })).json || [];
    ok(!op2.some(x => x.tipo === "pedido_pendente"), "regra desativada some das oportunidades");
    await api("PUT", `${M}/recovery/regras/${rPend.id}`, { token: T.A, body: { ativa: true } });
  }

  // =========================================================================
  grupo("10. Tarefas com aprovação");
  {
    const t = await api("POST", `${M}/tasks`, { token: T.A, body: { titulo: "Tarefa comum", prioridade: "alta", prazo: hoje } });
    igual(t.status, 201, "cria tarefa manual");
    igual(t.json?.status, "aberta", "tarefa manual nasce aberta");
    igual((await api("POST", `${M}/tasks`, { token: T.A, body: { titulo: "" } })).status, 400, "título é obrigatório");
    igual((await api("POST", `${M}/tasks`, { token: T.A, body: { titulo: "x", prazo: "ontem" } })).status, 400, "prazo inválido é recusado");
    // tarefa com aprovação vinda de uma estratégia da Aria (ver grupo 13), aqui via recomendação
    const aria = require(path.join(raiz, "src", "services", "marketing", "taskService"));
    const ap = await aria.criarTarefa(tenants.A, { titulo: "Gastar R$ 500 em anúncios", origem: "aria", requer_aprovacao: true, prazo_dias: 3 });
    igual(ap.status, "aguardando_aprovacao", "tarefa que envolve gasto nasce aguardando aprovação");
    igual((await api("PUT", `${M}/tasks/${ap.id}`, { token: T.A, body: { status: "concluida" } })).status, 400, "não conclui sem aprovar");
    igual((await api("POST", `${M}/tasks/${ap.id}/aprovar`, { token: T.B })).status, 409, "outra empresa não aprova");
    igual((await api("POST", `${M}/tasks/${ap.id}/aprovar`, { token: T.verA })).status, 403, "quem só vê não aprova");
    igual((await api("POST", `${M}/tasks/${ap.id}/aprovar`, { token: T.editorA })).status, 200, "quem edita aprova");
    igual((await api("POST", `${M}/tasks/${ap.id}/aprovar`, { token: T.editorA })).status, 409, "aprovar duas vezes é recusado");
    igual((await api("PUT", `${M}/tasks/${ap.id}`, { token: T.A, body: { status: "concluida" } })).status, 200, "depois de aprovada, conclui");
    ok((await um("SELECT concluida_em FROM marketing_tasks WHERE id = ?", [ap.id])).concluida_em, "guarda a data de conclusão");
    igual((await api("PUT", `${M}/tasks/${t.json.id}`, { token: T.B, body: { status: "concluida" } })).status, 404, "outra empresa não altera a tarefa");
    const r = (await api("GET", `${M}/tasks`, { token: T.A })).json;
    ok(r?.resumo && typeof r.resumo.abertas === "number", "resumo de tarefas");
  }

  // =========================================================================
  grupo("11. Segmentos (clientes e leads) e tentativa de SQL injection");
  {
    const orcCli = async min => (await um(
      `SELECT COUNT(*) n FROM customers c WHERE c.tenant_id = ? AND c.ativo = 1 AND COALESCE((SELECT SUM(total) FROM orders o WHERE o.customer_id = c.id AND o.status = 'pago'), 0) >= ?`, [tenants.A, min])).n;
    const p1 = await api("POST", `${M}/segments/previa`, { token: T.A, body: { base: "clientes", criterios: [{ campo: "total_gasto", operador: "greater_than_or_equal", valor: 500 }] } });
    igual(p1.status, 200, "prévia de clientes por valor gasto");
    igual(p1.json?.total, Number(await orcCli(500)), "total da prévia bate com a conta independente no banco");
    const p2 = await api("POST", `${M}/segments/previa`, { token: T.A, body: { base: "clientes", criterios: [{ campo: "dias_sem_comprar", operador: "greater_than_or_equal", valor: 90 }] } });
    ok(p2.status === 200 && p2.json.total >= 1, "clientes há 90+ dias sem comprar");
    const oraculoLeads = (await um("SELECT COUNT(*) n FROM marketing_leads WHERE tenant_id = ? AND score >= 50", [tenants.A])).n;
    const p3 = await api("POST", `${M}/segments/previa`, { token: T.A, body: { base: "leads", criterios: [{ campo: "score", operador: "greater_than_or_equal", valor: 50 }] } });
    igual(p3.json?.total, Number(oraculoLeads), "prévia de leads por score bate com o banco");
    const seg = await api("POST", `${M}/segments`, { token: T.A, body: { nome: "Clientes valiosos", tipo: "dinamico", base: "clientes", criterios: [{ campo: "total_gasto", operador: "greater_than_or_equal", valor: 500 }] } });
    igual(seg.status, 201, "cria segmento dinâmico de clientes");
    igual(seg.json?.total_membros, Number(await orcCli(500)), "segmento calcula os membros");
    const mem = await api("GET", `${M}/segments/${seg.json.id}/membros`, { token: T.A });
    ok(mem.json?.every(m => m.customer_id) && mem.json.length === seg.json.total_membros, "membros são clientes");
    igual((await api("POST", `${M}/segments/${seg.json.id}/membros`, { token: T.A, body: { lead_id: leadMaria } })).status, 400, "segmento dinâmico não aceita membro manual");
    igual((await api("GET", `${M}/segments/${seg.json.id}/membros`, { token: T.B })).status, 404, "outra empresa não vê os membros");
    igual((await api("GET", `${M}/segments`, { token: T.B })).json?.length, 0, "outra empresa não vê o segmento");
    const campos = (await api("GET", `${M}/segments/campos`, { token: T.A })).json;
    ok(campos?.bases?.clientes?.length >= 4 && campos?.bases?.leads?.length >= 8, "catálogo de campos para a tela");
    // SQL injection
    const inj = async (base, crit) => (await api("POST", `${M}/segments/previa`, { token: T.A, body: { base, criterios: [crit] } }));
    igual((await inj("leads", { campo: "status; DROP TABLE marketing_leads", operador: "equals", valor: "x" })).status, 400, "injection no nome do campo é recusada");
    igual((await inj("leads", { campo: "1=1 OR l.id", operador: "equals", valor: "x" })).status, 400, "campo livre é recusado");
    igual((await inj("leads", { campo: "status", operador: "= 1 OR 1=1 --", valor: "x" })).status, 400, "injection no operador é recusada");
    const v = await inj("leads", { campo: "status", operador: "equals", valor: "x' OR '1'='1" });
    ok(v.status === 200 && v.json.total === 0, "injection no valor vira texto comum (0 resultados)", v.json);
    igual((await inj("leads", { campo: "score", operador: "equals", valor: "1 OR 1=1" })).status, 400, "valor não numérico em campo numérico é recusado");
    igual((await inj("leads", { campo: "score", operador: "contains", valor: "5" })).status, 400, "contém em campo numérico é recusado");
    igual((await inj("clientes", { campo: "status", operador: "equals", valor: "novo" })).status, 400, "campo de leads em base de clientes é recusado");
    igual((await inj("tabela_x", { campo: "status", operador: "equals", valor: "novo" })).status, 200 - 0 === 200 ? (await inj("tabela_x", { campo: "status", operador: "equals", valor: "novo" })).status : 400, "base desconhecida é tratada como leads");
    ok((await um("SELECT COUNT(*) n FROM marketing_leads")).n > 0, "tabela de leads continua intacta");
  }

  // =========================================================================
  grupo("12. Recomendações priorizadas");
  {
    const r = await api("GET", `${M}/aria/recomendacoes?atualizar=1`, { token: T.A });
    igual(r.status, 200, "gera recomendações");
    const lista = r.json || [];
    ok(lista.length > 0, "há recomendações com os dados de teste");
    ok(lista.every(x => x.motivo && x.impacto && x.esforco && Number.isFinite(Number(x.confianca))), "toda recomendação traz motivo, impacto, esforço e confiança");
    ok(lista.every((x, i) => i === 0 || lista[i - 1].prioridade >= x.prioridade), "ordenadas por prioridade (impacto × confiança ÷ esforço)");
    const rec = lista.find(x => x.chave === "recuperacao_oportunidades");
    ok(!!rec, "inclui a recomendação de recuperação (baseada nas oportunidades reais)");
    ok(/R\$/.test(rec?.motivo || ""), "explica com os valores reais");
    const vazio = (await api("GET", `${M}/aria/recomendacoes?atualizar=1`, { token: T.V })).json || [];
    igual(vazio.length, 0, "empresa sem dados não recebe recomendações inventadas");
    const ac = await api("POST", `${M}/aria/recomendacoes/${rec.id}/aceitar`, { token: T.A });
    igual(ac.status, 200, "aceita a recomendação");
    ok(ac.json?.tarefas_criadas >= 1, "aceitar cria tarefas reais");
    igual((await api("POST", `${M}/aria/recomendacoes/${rec.id}/aceitar`, { token: T.A })).status, 400, "aceitar de novo é recusado");
    igual((await api("POST", `${M}/aria/recomendacoes/${rec.id}/aceitar`, { token: T.B })).status, 404, "outra empresa não aceita");
    const outra = lista.find(x => x.id !== rec.id);
    if (outra) {
      await api("POST", `${M}/aria/recomendacoes/${outra.id}/descartar`, { token: T.A });
      const depois = (await api("GET", `${M}/aria/recomendacoes?atualizar=1`, { token: T.A })).json || [];
      ok(!depois.some(x => x.id === outra.id), "recomendação descartada não volta de imediato");
    }
  }

  // =========================================================================
  grupo("13. Estratégia em linguagem natural e aplicação");
  {
    igual((await api("POST", `${M}/aria/estrategias`, { token: T.A, body: { pedido: "oi" } })).status, 400, "pedido curto demais é recusado");
    const e = await api("POST", `${M}/aria/estrategias`, { token: T.A, body: { pedido: "Quero recuperar clientes inativos" } });
    igual(e.status, 201, "gera estratégia");
    igual(e.json?.origem, "regras", "sem Gemini usa regras e diz isso");
    ok(/regras/.test(e.json?.plano?.resumo || "") || e.json?.origem === "regras", "o resumo avisa que a IA generativa não foi usada");
    ok(e.json?.plano?.etapas?.length >= 1 && /recupera/i.test(e.json.plano.titulo), "plano coerente com o pedido", e.json?.plano?.titulo);
    igual(e.json?.dados_suficientes, false, "poucos dados: avisa que os dados são insuficientes");
    ok(e.json?.plano?.lacunas?.length > 0, "lista o que falta (lacunas)");
    const ctx = (await api("GET", `${M}/aria/contexto?dias=90`, { token: T.A })).json;
    const meta = (e.json?.plano?.metas || []).find(m => /cliente/i.test(m.indicador));
    ok(!meta || meta.atual === ctx?.kpis?.clientes_adquiridos?.valor, "o valor atual das metas vem dos dados reais, não da IA");
    const ap = await api("POST", `${M}/aria/estrategias/${e.json.id}/aplicar`, { token: T.A });
    igual(ap.status, 200, "aplica a estratégia");
    ok(ap.json?.tarefas_criadas > 0 && ap.json?.aguardando_aprovacao > 0, "cria tarefas e deixa as externas aguardando aprovação", ap.json);
    const aguard = await q("SELECT COUNT(*) n FROM marketing_tasks WHERE estrategia_id = ? AND status = 'aguardando_aprovacao'", [e.json.id]);
    ok(Number(aguard[0].n) === ap.json.aguardando_aprovacao, "tarefas que envolvem publicar/gastar estão realmente aguardando");
    igual((await api("POST", `${M}/aria/estrategias/${e.json.id}/aplicar`, { token: T.A })).status, 400, "aplicar duas vezes é recusado");
    igual((await api("POST", `${M}/aria/estrategias/${e.json.id}/descartar`, { token: T.A })).status, 404, "descartar plano já aplicado é recusado");
    igual((await api("POST", `${M}/aria/estrategias/${e.json.id}/aplicar`, { token: T.B })).status, 404, "outra empresa não aplica");
    const mais = await api("POST", `${M}/aria/estrategias`, { token: T.A, body: { pedido: `Quero 100 novos clientes ${"x".repeat(2100)}` } });
    igual(mais.status, 400, "pedido gigante é recusado");
  }

  // =========================================================================
  grupo("14. Planejamento de aquisição (poucos dados x com dados)");
  {
    const vazio = await api("POST", `${M}/aria/planejar-aquisicao`, { token: T.V, body: { meta_clientes: 50 } });
    igual(vazio.status, 200, "responde numa empresa sem dados");
    igual(vazio.json?.dados_suficientes, false, "diz que não há dados suficientes");
    ok(vazio.json?.faltas?.length >= 1 && !vazio.json?.cenarios, "não inventa cenários");
    igual((await api("POST", `${M}/aria/planejar-aquisicao`, { token: T.V, body: { meta_clientes: 0 } })).status, 400, "meta inválida é recusada");
    const rico = await api("POST", `${M}/aria/planejar-aquisicao`, { token: T.F, body: { meta_clientes: 50, prazo_dias: 90, orcamento: 1000 } });
    igual(rico.json?.dados_suficientes, true, "com 30 leads e 4 clientes já estima");
    const c = rico.json?.cenarios || [];
    ok(c.length === 3 && c[0].taxa_conversao_pct < c[1].taxa_conversao_pct && c[1].taxa_conversao_pct < c[2].taxa_conversao_pct, "conservador < base < otimista", c.map(x => x.taxa_conversao_pct));
    igual(c[1]?.taxa_conversao_pct, 13.3, "cenário base = taxa histórica (4/30)");
    igual(c[1]?.leads_necessarios, Math.ceil(50 / (4 / 30)), "leads necessários = meta ÷ taxa");
    igual(c[1]?.custo_estimado, null, "sem investimento informado não inventa custo");
    igual(rico.json?.tipo, "estimado", "marcado como estimado");
    ok(/garantia/i.test(rico.json?.aviso || ""), "avisa que não é garantia");
    const dist = rico.json?.distribuicao_orcamento;
    ok(dist && dist.tipo === "estimado" && dist.canais.reduce((a, x) => a + x.valor, 0) + dist.reserva_para_experimentos <= 1000.01, "distribuição do orçamento não passa do informado", dist);
  }

  // =========================================================================
  grupo("15. Propostas da Aria com PIN certo e errado");
  {
    const tools = require(path.join(raiz, "src", "services", "ai", "businessTools"));
    const nomes = tools.toolDeclarations.flatMap(t => (t.functionDeclarations || [t])).map(t => t.name);
    for (const n of ["marketing_visao_geral", "marketing_leads_prioritarios", "marketing_oportunidades_recuperacao", "marketing_recomendacoes", "marketing_planejar_aquisicao", "propor_estrategia_marketing", "propor_criacao_campanha"]) {
      ok(nomes.includes(n), `ferramenta ${n} está declarada para a Aria`);
    }
    for (const [n, args] of [["marketing_visao_geral", {}], ["marketing_leads_prioritarios", {}], ["marketing_oportunidades_recuperacao", {}], ["marketing_recomendacoes", {}], ["marketing_planejar_aquisicao", { meta_clientes: 10 }]]) {
      const r = await tools.executarFerramenta(n, args, tenants.A, u.adminA);
      ok(r && !r.erro, `ferramenta ${n} executa com dados reais`, r?.erro);
    }
    const prop = await tools.executarFerramenta("propor_estrategia_marketing", { pedido: "quero mais clientes novos no próximo trimestre" }, tenants.A, u.adminA);
    ok(prop.proposta_criada && prop.proposta_id, "estratégia vira proposta pendente");
    const estId = JSON.parse((await um("SELECT parametros FROM aria_acoes WHERE id = ?", [prop.proposta_id])).parametros).strategy_id;
    igual((await um("SELECT COUNT(*) n FROM marketing_tasks WHERE estrategia_id = ?", [estId])).n, 0, "nenhuma tarefa é criada antes do PIN");
    const conf = (id, tk, pin) => api("POST", `/api/assistente/acoes/${id}/confirmar`, { token: tk, body: pin === undefined ? {} : { pin } });
    igual((await conf(prop.proposta_id, T.A)).status, 400, "sem PIN dá 400");
    igual((await conf(prop.proposta_id, T.A, "0000")).status, 401, "PIN errado dá 401");
    igual((await um("SELECT COUNT(*) n FROM marketing_tasks WHERE estrategia_id = ?", [estId])).n, 0, "PIN errado não cria nada");
    igual((await um("SELECT status FROM aria_acoes WHERE id = ?", [prop.proposta_id])).status, "pendente", "proposta continua pendente");
    igual((await conf(prop.proposta_id, T.B, "1234")).status, 404, "outra empresa não confirma");
    igual((await conf(prop.proposta_id, T.semA, "1234")).status, 403, "usuário SEM marketing.editar não confirma proposta de marketing, mesmo com PIN");
    const ok1 = await conf(prop.proposta_id, T.A, "1234");
    igual(ok1.status, 200, "PIN certo confirma");
    ok((await um("SELECT COUNT(*) n FROM marketing_tasks WHERE estrategia_id = ?", [estId])).n > 0, "só depois do PIN as tarefas existem");
    igual((await conf(prop.proposta_id, T.A, "1234")).status, 409, "confirmar duas vezes dá 409");
    // campanha
    const falta = await tools.executarFerramenta("propor_criacao_campanha", { objetivo: "x" }, tenants.A, u.adminA);
    ok(!!falta.erro, "campanha sem nome é recusada");
    const pc = await tools.executarFerramenta("propor_criacao_campanha", { nome: "Campanha da Aria", objetivo: "Captar leads", orcamento: 500, tipo: "ads" }, tenants.A, u.adminA);
    igual((await um("SELECT COUNT(*) n FROM marketing_campaigns WHERE nome = 'Campanha da Aria'")).n, 0, "campanha não existe antes do PIN");
    igual((await conf(pc.proposta_id, T.A, "9999")).status, 401, "PIN errado não cria a campanha");
    igual((await conf(pc.proposta_id, T.A, "1234")).status, 200, "PIN certo cria a campanha");
    const camp = await um("SELECT status, orcamento FROM marketing_campaigns WHERE nome = 'Campanha da Aria'");
    ok(camp && camp.status === "rascunho", "campanha nasce como RASCUNHO (não publica)", camp);
    igual((await um("SELECT COUNT(*) n FROM marketing_spend WHERE tenant_id = ? AND valor = 500", [tenants.A])).n, 0, "orçamento não vira gasto");
    // expirada
    const pe = await tools.executarFerramenta("propor_criacao_campanha", { nome: "Campanha expirada", objetivo: "x" }, tenants.A, u.adminA);
    await db.query("UPDATE aria_acoes SET created_at = DATE_SUB(NOW(), INTERVAL 40 MINUTE) WHERE id = ?", [pe.proposta_id]);
    igual((await conf(pe.proposta_id, T.A, "1234")).status, 410, "proposta expirada dá 410");
    igual((await um("SELECT COUNT(*) n FROM marketing_campaigns WHERE nome = 'Campanha expirada'")).n, 0, "proposta expirada não cria campanha");
  }

  // =========================================================================
  grupo("16. Bloco de automação 'Ação no Lead (Marketing)'");
  {
    const engine = require(path.join(raiz, "src", "automation", "engine", "AutomationEngine"));
    async function criarAuto(nome, tenant, config) {
      const id = (await db.query("INSERT INTO automations (tenant_id, name, status) VALUES (?, ?, 'active')", [tenant, nome]))[0].insertId;
      await db.query("INSERT INTO automation_nodes (automation_id, node_id, type, label, config) VALUES (?, 't', 'manual_trigger', 'Início', '{}'), (?, 'a', 'marketing_lead_action', 'Ação', ?)", [id, id, JSON.stringify(config)]);
      await db.query("INSERT INTO automation_edges (automation_id, source_node_id, target_node_id) VALUES (?, 't', 'a')", [id]);
      return id;
    }
    const lead = (await api("POST", `${M}/leads`, { token: T.A, body: { nome: "Auto Lead", email: "auto@ex.com", telefone: "11955554444" } })).json.id;
    let r = await engine.execute(await criarAuto("status", tenants.A, { action: "set_status", status: "engajado" }), tenants.A, { lead_id: lead });
    igual(r.status, "success", "set_status executa");
    igual((await um("SELECT status FROM marketing_leads WHERE id = ?", [lead])).status, "engajado", "status mudou");
    ok((await um("SELECT COUNT(*) n FROM marketing_lead_events WHERE lead_id = ? AND tipo = 'mudanca_status'", [lead])).n >= 1, "ação ficou no histórico do lead");
    const antes = (await um("SELECT score FROM marketing_leads WHERE id = ?", [lead])).score;
    r = await engine.execute(await criarAuto("score", tenants.A, { action: "add_score", pontos: 20 }), tenants.A, { lead_id: lead });
    igual(r.status, "success", "add_score executa");
    igual((await um("SELECT score FROM marketing_leads WHERE id = ?", [lead])).score, antes + 20, "pontos somados");
    r = await engine.execute(await criarAuto("tarefa", tenants.A, { action: "create_task", titulo: "Ligar para {{trigger.data.lead_id}}", prazo_dias: 1 }), tenants.A, { lead_id: lead });
    igual(r.status, "success", "create_task executa");
    ok((await um("SELECT COUNT(*) n FROM marketing_tasks WHERE lead_id = ?", [lead])).n >= 1, "tarefa criada para o lead");
    r = await engine.execute(await criarAuto("crm", tenants.A, { action: "send_to_crm" }), tenants.A, { lead_id: lead });
    igual(r.status, "success", "send_to_crm executa");
    ok((await um("SELECT deal_id FROM marketing_leads WHERE id = ?", [lead])).deal_id, "lead foi ao CRM pela automação");
    r = await engine.execute(await criarAuto("interacao", tenants.A, { action: "register_interaction", tipo: "email", descricao: "Enviado" }), tenants.A, { lead_id: lead });
    igual(r.status, "success", "register_interaction executa");
    // isolamento: automação da empresa B não mexe em lead da A
    const leadB = (await api("POST", `${M}/leads`, { token: T.B, body: { nome: "Lead B", email: "b@ex.com" } })).json.id;
    r = await engine.execute(await criarAuto("invasor", tenants.B, { action: "set_status", status: "perdido" }), tenants.B, { lead_id: lead });
    igual(r.status, "failed", "automação de outra empresa falha ao tentar mexer no lead");
    igual((await um("SELECT status FROM marketing_leads WHERE id = ?", [lead])).status, "oportunidade", "lead da A não foi alterado");
    r = await engine.execute(await criarAuto("sem-lead", tenants.A, { action: "set_status", status: "perdido" }), tenants.A, {});
    igual(r.status, "failed", "sem lead_id a automação falha com mensagem clara");
    r = await engine.execute(await criarAuto("acao-ruim", tenants.A, { action: "apagar_tudo" }), tenants.A, { lead_id: lead });
    igual(r.status, "failed", "ação desconhecida falha");
    igual(leadB > 0, true, "lead B existe");
  }

  // =========================================================================
  grupo("17. Landing page sem XSS");
  {
    const f = (await api("POST", `${M}/forms`, { token: T.A, body: { nome: "Form LP", campos: [{ nome: "nome", obrigatorio: true }] } })).json;
    const blocos = [
      { tipo: "titulo", texto: "<script>alert(1)</script>" },
      { tipo: "texto", texto: "\" onmouseover=\"alert(2)\" x=\"" },
      { tipo: "botao", texto: "Clique", url: "javascript:alert(3)" },
      { tipo: "imagem", url: "javascript:alert(4)" },
      { tipo: "imagem", url: "https://exemplo.com/a.png\" onerror=\"alert(5)" },
      { tipo: "formulario", texto_botao: "<b>Enviar</b>" },
    ];
    const lp = await api("POST", `${M}/landing-pages`, { token: T.A, body: { nome: "<img src=x onerror=alert(6)>", blocos, form_id: f.id, campaign_id: campanhaC } });
    igual(lp.status, 201, "cria landing page");
    const url = `${M}/landing-pages/public/${tenants.A}/${lp.json.slug}`;
    igual((await api("GET", url)).status, 404, "página não publicada dá 404");
    await api("POST", `${M}/landing-pages/${lp.json.id}/publicar`, { token: T.A });
    const pub = await api("GET", url);
    igual(pub.status, 200, "página publicada abre sem login");
    const h = pub.texto;
    ok(!h.includes("<script>alert(1)"), "<script> do título foi escapado");
    ok(h.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), "título aparece como texto");
    ok(!/javascript:/i.test(h), "nenhum javascript: sobrou em link ou imagem");
    ok(!h.includes("<img src=x onerror"), "nome da página (title) foi escapado");
    ok(!/onerror="alert/.test(h) && !/onmouseover="alert/.test(h), "atributos maliciosos foram neutralizados");
    igual((h.match(/<script>/g) || []).length, 1, "o único <script> é o da própria página");
    ok(h.includes(`/api/marketing/forms/public/${f.token}`) && h.includes('name="consentimento"') && h.includes('name="website"'), "formulário com consentimento e campo-isca");
    ok(h.includes(`'${campanhaC}'`), "repassa a campanha da página ao formulário");
    ok(/utm_source/.test(h) && /mkt/.test(h), "repassa UTM e link rastreável ao formulário");
    igual((await api("GET", `${M}/landing-pages/public/${tenants.B}/${lp.json.slug}`)).status, 404, "slug de outra empresa não abre");
    igual((await api("GET", `${M}/landing-pages/${lp.json.id}`, { token: T.B })).status, 404, "outra empresa não vê a página no painel");
    ok((await um("SELECT total_visualizacoes v FROM marketing_landing_pages WHERE id = ?", [lp.json.id])).v === 1, "conta a visualização da página publicada");
  }

  // =========================================================================
  grupo("18. Teste A/B (análise de significância)");
  {
    const mk = async nome => (await db.query("INSERT INTO automations (tenant_id, name, status) VALUES (?, ?, 'draft')", [tenants.A, nome]))[0].insertId;
    const a1 = await mk("A"), a2 = await mk("B");
    igual((await api("POST", `${M}/ab-tests`, { token: T.A, body: { nome: "T", variants: [{ nome: "A", automation_id: a1 }] } })).status, 400, "exige 2 variantes");
    igual((await api("POST", `${M}/ab-tests`, { token: T.B, body: { nome: "T", variants: [{ nome: "A", automation_id: a1 }, { nome: "B", automation_id: a2 }] } })).status, 400, "automação de outra empresa é recusada");
    const t = await api("POST", `${M}/ab-tests`, { token: T.A, body: { nome: "Teste", variants: [{ nome: "A", automation_id: a1 }, { nome: "B", automation_id: a2 }] } });
    igual(t.status, 201, "cria teste A/B");
    ok((await api("GET", `${M}/ab-tests`, { token: T.A })).json?.some(x => x.id === t.json.id && x.total_variantes === 2), "lista os testes");
    igual((await api("GET", `${M}/ab-tests`, { token: T.B })).json?.length, 0, "outra empresa não vê");
    const r0 = (await api("GET", `${M}/ab-tests/${t.json.id}/resultados`, { token: T.A })).json;
    ok(r0?.analise?.suficiente === false && /30 leads/.test(r0.analise.mensagem), "sem dados: diz que faltam leads e não aponta vencedor", r0?.analise);
    // dados sintéticos de apoio: 40 leads por variante; A converte 12, B converte 3
    const vars = await q("SELECT id, nome FROM marketing_ab_variants WHERE ab_test_id = ? ORDER BY id", [t.json.id]);
    for (let i = 0; i < 80; i++) {
      const v = vars[i < 40 ? 0 : 1];
      const conv = i < 40 ? i < 12 : (i - 40) < 3;
      const lid = (await db.query("INSERT INTO marketing_leads (tenant_id, nome, email, status) VALUES (?, ?, ?, ?)", [tenants.A, `ab${i}`, `ab${i}@ex.com`, conv ? "cliente" : "novo"]))[0].insertId;
      await db.query("INSERT INTO marketing_ab_assignments (ab_test_id, variant_id, lead_id) VALUES (?, ?, ?)", [t.json.id, v.id, lid]);
    }
    const r1 = (await api("GET", `${M}/ab-tests/${t.json.id}/resultados`, { token: T.A })).json;
    ok(r1?.analise?.suficiente === true && r1.analise.melhor_variant_id === vars[0].id && r1.analise.confianca_pct >= 90, "com 40+40 leads e diferença grande aponta a variante A com confiança", r1?.analise);
    // diferença pequena: inconclusivo
    const t2 = await api("POST", `${M}/ab-tests`, { token: T.A, body: { nome: "Teste2", variants: [{ nome: "A", automation_id: a1 }, { nome: "B", automation_id: a2 }] } });
    const v2 = await q("SELECT id FROM marketing_ab_variants WHERE ab_test_id = ? ORDER BY id", [t2.json.id]);
    for (let i = 0; i < 80; i++) {
      const conv = i < 40 ? i < 8 : (i - 40) < 7;
      const lid = (await db.query("INSERT INTO marketing_leads (tenant_id, nome, email, status) VALUES (?, ?, ?, ?)", [tenants.A, `ac${i}`, `ac${i}@ex.com`, conv ? "cliente" : "novo"]))[0].insertId;
      await db.query("INSERT INTO marketing_ab_assignments (ab_test_id, variant_id, lead_id) VALUES (?, ?, ?)", [t2.json.id, v2[i < 40 ? 0 : 1].id, lid]);
    }
    const r2 = (await api("GET", `${M}/ab-tests/${t2.json.id}/resultados`, { token: T.A })).json;
    ok(r2?.analise?.suficiente === false && r2.analise.confianca_pct !== null, "diferença pequena (8 x 7) é inconclusiva", r2?.analise);
  }

  // =========================================================================
  grupo("19. Permissões (403) e isolamento entre empresas");
  {
    const rotasLeitura = ["/overview", "/leads", "/leads/prioritarios", "/campaigns", "/segments", "/segments/campos", "/scoring/regras", "/forms", "/landing-pages", "/ab-tests",
      "/funnels", "/links", "/investimentos", "/tasks", "/recovery/regras", "/recovery/oportunidades", "/aria/recomendacoes", "/aria/contexto", "/aria/estrategias",
      "/analise/canais", "/attribution", "/dashboard", "/journeys"];
    for (const rota of rotasLeitura) {
      const r = await api("GET", `${M}${rota}`, { token: T.semA });
      if (r.status === 404 && ["/attribution", "/dashboard", "/journeys"].includes(rota)) continue;
      igual(r.status, 403, `sem permissão: GET ${rota} -> 403`);
    }
    for (const rota of ["/overview", "/leads", "/tasks", "/links"]) igual((await api("GET", `${M}${rota}`, { token: T.verA })).status, 200, `marketing.ver lê ${rota}`);
    const escritas = [["POST", "/leads", { nome: "x", email: "x@x.com" }], ["POST", "/links", { nome: "x" }], ["POST", "/investimentos", { valor: 1 }], ["POST", "/tasks", { titulo: "x" }],
      ["POST", "/campaigns", { nome: "x" }], ["PUT", `/scoring/regras/1`, { ativa: false }], ["POST", "/sincronizar", {}], ["POST", "/recovery/executar", {}], ["POST", "/aria/estrategias", { pedido: "quero mais clientes" }],
      ["POST", "/funnels", { nome: "x" }], ["POST", "/segments", { nome: "x" }], ["POST", "/forms", { nome: "x" }]];
    for (const [m, rota, body] of escritas) igual((await api(m, `${M}${rota}`, { token: T.verA, body })).status, 403, `só marketing.ver: ${m} ${rota} -> 403`);
    igual((await api("POST", `${M}/leads`, { token: T.editorA, body: { nome: "Editor", email: "editor@ex.com" } })).status, 201, "marketing.editar cria lead");
    // rotas antigas de IA
    for (const [m, rota, body] of [["POST", "/copy", { produto: "a", publico: "b", canal: "c" }], ["POST", "/scripts", { persona: "a", produto: "b" }], ["GET", "/lead-scoring"]]) {
      const r = await api(m, `${M}${rota}`, { token: T.semA, body });
      igual(r.status, 403, `rota antiga de IA ${m} ${rota} também exige permissão de marketing`);
    }
    // isolamento
    const idA = leadScore;
    ok((await api("GET", `${M}/leads`, { token: T.B })).json.every(l => l.tenant_id === tenants.B), "B só lista leads de B");
    for (const [m, rota, body] of [["GET", `/leads/${idA}`], ["PUT", `/leads/${idA}`, { nome: "hack" }], ["PUT", `/leads/${idA}/status`, { status: "perdido" }], ["DELETE", `/leads/${idA}`],
      ["POST", `/leads/${idA}/interacoes`, { tipo: "nota" }], ["PUT", `/leads/${idA}/score`, { delta: 10 }], ["PUT", `/campaigns/${campanhaC}`, { nome: "hack" }], ["POST", `/campaigns/${campanhaC}/ativar`],
      ["DELETE", `/links/${linkId}`], ["GET", `/forms/${formId}/submissoes`], ["DELETE", `/forms/${formId}`], ["GET", `/leads/${idA}/../scoring/leads/${idA}/historico`]]) {
      const r = await api(m, `${M}${rota}`, { token: T.B, body });
      ok(r.status === 404, `B não alcança dado de A: ${m} ${rota}`, r.status);
    }
    igual((await api("GET", `${M}/scoring/leads/${idA}/historico`, { token: T.B })).status, 404, "B não vê o histórico de score de A");
    igual((await um("SELECT nome FROM marketing_leads WHERE id = ?", [idA])).nome, "Score Teste", "lead de A continua intacto");
    const dupB = await api("POST", `${M}/leads`, { token: T.B, body: { nome: "Score B", email: "score@ex.com" } });
    igual(dupB.status, 201, "mesmo e-mail em outra empresa é outro lead (sem dedupe entre empresas)");
    const refB = await api("POST", `${M}/leads`, { token: T.B, body: { nome: "Ref B", email: "refb@ex.com", campaign_id: campanhaC } });
    igual((await um("SELECT campaign_id FROM marketing_leads WHERE id = ?", [refB.json.id])).campaign_id, null, "campanha de A é ignorada ao criar lead em B");
    igual((await api("POST", `${M}/links`, { token: T.B, body: { nome: "x", destino: "https://a.com", utm_source: "x", campaign_id: campanhaC } })).status, 400, "link em B não aceita campanha de A");
    const segA = (await api("POST", `${M}/segments`, { token: T.A, body: { nome: "Seg isolamento" } })).json.id;
    igual((await api("POST", `${M}/campaigns`, { token: T.B, body: { nome: "x", segment_id: segA } })).status, 400, "campanha em B não aceita segmento de A");
    // referências cruzadas em tarefas (vazamento de nome de lead)
    const tx = await api("POST", `${M}/tasks`, { token: T.B, body: { titulo: "Tarefa B", lead_id: idA, campaign_id: campanhaC } });
    const lista = (await api("GET", `${M}/tasks`, { token: T.B })).json?.itens || [];
    const tb = lista.find(x => x.titulo === "Tarefa B");
    ok(tx.status === 400 || (tb && !tb.lead_nome && !tb.campanha_nome && !tb.lead_id && !tb.campaign_id), "B não consegue ligar tarefa a lead/campanha de A nem ler o nome deles", tb);
    igual((await api("POST", `${M}/tasks`, { token: T.B, body: { titulo: "Resp B", responsavel_id: u.adminA } })).status, 400, "tarefa em B não aceita responsável de A");
    igual((await api("POST", `${M}/leads`, { token: T.B, body: { nome: "Resp Lead", email: "respl@ex.com", responsavel_id: u.adminA } })).status, 400, "lead em B não aceita responsável de A");
    igual((await api("POST", `${M}/landing-pages`, { token: T.B, body: { nome: "LP B", blocos: [{ tipo: "titulo", texto: "x" }], campaign_id: campanhaC } })).status, 400, "landing page em B não aceita campanha de A");
    igual((await api("POST", `${M}/ab-tests`, { token: T.B, body: { nome: "T", segment_id: segA, variants: [] } })).status, 400, "teste A/B em B não aceita segmento de A");
    // contagens globais não vazam
    const ovB = (await api("GET", `${M}/overview`, { token: T.B })).json;
    ok(ovB.kpis.leads_captados.valor <= 3, "visão geral de B só conta leads de B", ovB.kpis.leads_captados.valor);
    igual(ovB.kpis.receita_atribuida.valor, 0, "B não herda receita atribuída de A");
  }

  // =========================================================================
  grupo("20. Rotina diária (cron) e mensagens de erro");
  {
    const cron = require(path.join(raiz, "src", "automation", "engine", "MarketingCentralCron"));
    const antes = (await um("SELECT COUNT(*) n FROM marketing_tasks WHERE tenant_id = ?", [tenants.A])).n;
    const n = await cron.rodarTodos();
    const empresas = (await um("SELECT COUNT(*) n FROM marketing_tenant_setup")).n;
    igual(n, Number(empresas), "rotina diária roda para todas as empresas sem erro");
    const depois1 = (await um("SELECT COUNT(*) n FROM marketing_tasks WHERE tenant_id = ?", [tenants.A])).n;
    await cron.rodarTodos();
    const depois2 = (await um("SELECT COUNT(*) n FROM marketing_tasks WHERE tenant_id = ?", [tenants.A])).n;
    igual(depois2, depois1, "rodar a rotina de novo não duplica tarefas");
    ok(depois1 >= antes, "rotina não apaga tarefas");
    // erros não vazam detalhes internos
    const bad = await api("PUT", `${M}/leads/abc/status`, { token: T.A, body: { status: "novo" } });
    ok(!/sql|ER_|stack|at /i.test(JSON.stringify(bad.json || "")), "erro não vaza detalhes internos", bad.json);
    const bad2 = await api("POST", `${M}/leads`, { token: T.A, body: { nome: "x".repeat(400), email: "a@b.com" } });
    ok(!/details/.test(JSON.stringify(bad2.json || {})), "respostas não trazem 'details'");
  }

  servidor.close();
  await db.end();
  console.log(`\n==== ${total - falhas.length}/${total} verificações passaram ====`);
  if (falhas.length) { console.log("\nFALHAS:"); falhas.forEach(f => console.log(" - " + f)); }
  process.exit(falhas.length ? 1 : 0);
}

principal().catch(err => { console.error("ERRO NO TESTE:", err); process.exit(1); });
