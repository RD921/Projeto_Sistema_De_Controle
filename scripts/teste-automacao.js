// Teste do motor de automações (ramos paralelos, Merge, expressões, tentativas, erro, pausa).
//
// COMO RODAR (num MySQL/MariaDB de TESTE, nunca no banco de produção):
//   $env:TEST_DB_HOST="127.0.0.1"; $env:TEST_DB_PORT="3306"; $env:TEST_DB_USER="root"; $env:TEST_DB_PASS="senha"
//   node scripts/teste-automacao.js
// O banco se chama "ecomflow_auto_test" (o nome PRECISA conter "test") e é APAGADO e recriado a cada execução.
const fs = require("fs");
const path = require("path");

const cfg = {
  host: process.env.TEST_DB_HOST || "127.0.0.1", port: Number(process.env.TEST_DB_PORT) || 3306,
  user: process.env.TEST_DB_USER || "root", pass: process.env.TEST_DB_PASS || "", name: process.env.TEST_DB_NAME || "ecomflow_auto_test",
};
if (!/test/i.test(cfg.name)) { console.error(`RECUSADO: o nome do banco ("${cfg.name}") precisa conter "test".`); process.exit(2); }
if (/aiven|render\.com/i.test(cfg.host)) { console.error("RECUSADO: o host parece ser de produção."); process.exit(2); }
Object.assign(process.env, { DB_HOST: cfg.host, DB_PORT: String(cfg.port), DB_USER: cfg.user, DB_PASS: cfg.pass, DB_NAME: cfg.name, DB_SSL: "false", JWT_SECRET: "segredo-so-para-teste", NODE_ENV: "test", GEMINI_API_KEY: "" });

const raiz = path.join(__dirname, "..");
const mysql = require(path.join(raiz, "node_modules", "mysql2", "promise"));
const jwt = require(path.join(raiz, "node_modules", "jsonwebtoken"));

let total = 0; const falhas = []; let grupoAtual = "";
const grupo = nome => { grupoAtual = nome; console.log(`\n== ${nome}`); };
function ok(cond, nome, detalhe) {
  total++;
  if (cond) { console.log(`  ok   ${nome}`); return true; }
  falhas.push(`[${grupoAtual}] ${nome}${detalhe !== undefined ? ` -> ${JSON.stringify(detalhe)}` : ""}`);
  console.log(`  FALHA ${nome}${detalhe !== undefined ? ` -> ${JSON.stringify(detalhe).slice(0, 300)}` : ""}`);
  return false;
}
const igual = (a, b, nome) => ok(JSON.stringify(a) === JSON.stringify(b), nome, `esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);

async function prepararBanco() {
  const admin = await mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.pass });
  await admin.query(`DROP DATABASE IF EXISTS \`${cfg.name}\``);
  await admin.query(`CREATE DATABASE \`${cfg.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.end();
  const c = await mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.pass, database: cfg.name });
  for (const arq of ["create_automation_engine.sql", "create_automation_events.sql", "create_execution_pause.sql"]) {
    const sql = fs.readFileSync(path.join(raiz, "src", "config", "migrations", arq), "utf8").replace(/^﻿/, "");
    for (const cmd of sql.split(/;\s*(?:\r?\n|$)/).map(s => s.replace(/^\s*--.*$/gm, "").trim()).filter(Boolean)) {
      if (/^use\s/i.test(cmd)) continue;
      try { await c.query(cmd); } catch (e) { if (!/already exists|Duplicate/i.test(e.message)) console.log(`  (aviso ${arq}: ${e.message.slice(0, 100)})`); }
    }
  }
  return c;
}

async function principal() {
  const db = await prepararBanco();
  const q = async (sql, p) => (await db.query(sql, p))[0];
  const um = async (sql, p) => (await q(sql, p))[0];

  const engine = require(path.join(raiz, "src", "automation", "engine", "AutomationEngine"));
  const NodeRegistry = require(path.join(raiz, "src", "automation", "nodes", "NodeRegistry"));
  const { resolverTemplate: R, resolverValor: V } = require(path.join(raiz, "src", "automation", "engine", "TemplateResolver"));
  const { garantir } = require(path.join(raiz, "src", "services", "automationSchema"));
  await garantir();

  // Nós que existem só no teste
  let marcas = [];
  const falhasPorChave = {};
  NodeRegistry.register("t_marca", async (node, ctx) => {
    marcas.push(node.config.nome);
    return { output: { ...(ctx.ultimoOutput && typeof ctx.ultimoOutput === "object" ? ctx.ultimoOutput : {}), ...(node.config.saida || {}), [`passou_${node.config.nome}`]: true }, log: `marca ${node.config.nome}` };
  });
  NodeRegistry.register("t_falha", async (node, ctx) => {
    const k = node.config.chave;
    falhasPorChave[k] = (falhasPorChave[k] || 0) + 1;
    if (falhasPorChave[k] <= (node.config.falhar ?? 999)) throw new Error(`falha proposital ${falhasPorChave[k]}`);
    return { output: { ...(ctx.ultimoOutput || {}), recuperou: true } };
  });
  NodeRegistry.register("t_dorme", async (node, ctx) => { await new Promise(r => setTimeout(r, node.config.ms)); return { output: ctx.ultimoOutput }; });
  NodeRegistry.register("t_lista", async () => ({ output: { lista: [1, 2, 3] } }));

  const tenants = { A: 101, B: 102 };
  async function criar(tenant, nome, nodes, edges, settings) {
    const id = (await db.query("INSERT INTO automations (tenant_id, name, status) VALUES (?, ?, 'active')", [tenants[tenant], nome]))[0].insertId;
    if (settings) await db.query("UPDATE automations SET settings = ? WHERE id = ?", [JSON.stringify(settings), id]);
    for (const n of nodes) await db.query("INSERT INTO automation_nodes (automation_id, node_id, type, label, config) VALUES (?, ?, ?, ?, ?)", [id, n.id, n.type, n.label || n.id, JSON.stringify(n.config || {})]);
    for (const [s, t, h] of edges) await db.query("INSERT INTO automation_edges (automation_id, source_node_id, target_node_id, source_handle) VALUES (?, ?, ?, ?)", [id, s, t, h || "default"]);
    return id;
  }
  const T = (id = "t") => ({ id, type: "manual_trigger", label: "Início" });
  const M = (id, nome, saida) => ({ id, type: "t_marca", label: id, config: { nome, saida } });
  const rodar = async (id, dados = {}, tenant = "A") => { marcas = []; return engine.execute(id, tenants[tenant], dados); };
  const logs = async exec => q("SELECT * FROM automation_logs WHERE execution_id = ? ORDER BY id", [exec]);
  const exe = async exec => um("SELECT * FROM automation_executions WHERE id = ?", [exec]);
  const saidaDe = async (exec, nodeId) => JSON.parse((await logs(exec)).find(x => x.node_id === nodeId).output_data);

  // =========================================================================
  grupo("1. Expressões: valores, funções e segurança");
  {
    const ctx = { ultimoOutput: { nome: "ana", total: 120, itens: [1, 2, 3], cli: { x: { y: 5 } } }, trigger: { type: "manual", data: { k: 9 } }, executionId: 7, vars: { taxa: 0.1 }, nodes: { n1: { output: { id: 42 }, label: "Buscar pedido", type: "x" } }, avisos: [] };
    igual(R("{{$json.nome}}", ctx), "ana", "formato antigo {{$json.campo}} continua funcionando");
    igual(R("Olá {{ upper($json.nome) }}!", ctx), "Olá ANA!", "função upper");
    igual(R("{{ $json.cli.x.y }}", ctx), "5", "caminho aninhado");
    igual(R("{{ $json.total > 100 ? 'alto' : 'baixo' }}", ctx), "alto", "condicional ?:");
    igual(R("{{ $node['Buscar pedido'].json.id + 1 }}", ctx), "43", "saída de outro nó pelo nome");
    igual(R("{{ $node.n1.json.id }}", ctx), "42", "saída de outro nó pelo id");
    igual(R("{{ $trigger.data.k }}", ctx), "9", "dados do gatilho");
    igual(R("{{ $vars.taxa * $json.total }}", ctx), "12", "variáveis do fluxo");
    igual(R("{{ $execution.id }}", ctx), "7", "id da execução");
    igual(R("{{ round($json.total / 7, 2) }}", ctx), "17.14", "round");
    igual(R("{{ formatBRL(1234.5) }}", ctx), "R$ 1.234,50", "formatBRL");
    igual(R("{{ dateFormat('2026-10-15T15:00:00Z', 'DD/MM/YYYY HH:mm') }}", ctx), "15/10/2026 12:00", "dateFormat no fuso de São Paulo");
    igual(R("{{ dateFormat(dateAdd('2026-10-15T15:00:00Z', 2, 'days'), 'DD/MM') }}", ctx), "17/10", "dateAdd");
    igual(R("{{ length($json.itens) }}/{{ $json.itens[1] }}", ctx), "3/2", "tamanho e índice de lista");
    igual(R("{{ $json.inexistente }}", ctx), "", "campo que não existe vira texto vazio");
    igual(V("{{ $json.itens }}", ctx), [1, 2, 3], "expressão única devolve o valor real (lista)");
    igual(V("{{ $json.total }}", ctx), 120, "expressão única devolve número");
    igual(R("{{ $json.constructor }}|{{ $json.__proto__ }}|{{ $json.nome.constructor }}", ctx), "||", "não acessa constructor/__proto__");
    ctx.avisos = [];
    igual(R("{{ nome }} e {{ 1 + }}", ctx), "{{ nome }} e {{ 1 + }}", "expressão inválida é mantida como está");
    ok(ctx.avisos.length === 2, "expressão inválida gera avisos", ctx.avisos);
    let quebrou = false;
    try { R("{{ process.exit(1) }}", ctx); R("{{ require('fs') }}", ctx); R("{{ (function(){ return 1 })() }}", ctx); R("{{ $json['constructor']['constructor']('return 1')() }}", ctx); } catch { quebrou = true; }
    ok(!quebrou, "tentativas de executar código não quebram nem executam");
    igual(R("{{ this.constructor }}", ctx), "{{ this.constructor }}", "'this' não é permitido");
    igual(R("{{ 5 / 0 }}", ctx), "", "divisão por zero não explode");
  }

  // =========================================================================
  grupo("2. Fluxo linear antigo continua igual");
  {
    const id = await criar("A", "linear", [T(), M("a", "A"), M("b", "B")], [["t", "a"], ["a", "b"]]);
    const r = await rodar(id, { x: 1 });
    igual(r.status, "success", "execução conclui");
    igual(marcas, ["A", "B"], "nós rodam em ordem");
    igual((await exe(r.executionId)).mode, "trigger", "modo padrão é 'trigger'");
    const l = await logs(r.executionId);
    ok(l.length === 3 && l.every(x => x.level === "info"), "um log por nó", l.map(x => x.level));
    ok((await saidaDe(r.executionId, "b")).x === 1, "dado do gatilho chega ao nó seguinte");
  }

  grupo("3. IF só segue o ramo escolhido");
  {
    const id = await criar("A", "if", [T(), { id: "i", type: "if", config: { field: "{{ $json.valor }}", operator: "greater_than", value: 10 } }, M("sim", "SIM"), M("nao", "NAO")],
      [["t", "i"], ["i", "sim", "true"], ["i", "nao", "false"]]);
    await rodar(id, { valor: 50 }); igual(marcas, ["SIM"], "valor alto -> ramo true");
    await rodar(id, { valor: 1 }); igual(marcas, ["NAO"], "valor baixo -> ramo false");
  }

  // =========================================================================
  grupo("4. Ramos paralelos e Merge");
  {
    const id = await criar("A", "paralelo", [T(), M("a", "A", { dado_a: 1 }), M("b", "B", { dado_b: 2 }), { id: "m", type: "merge", label: "Juntar", config: { mode: "merge" } }, M("fim", "FIM")],
      [["t", "a"], ["t", "b"], ["a", "m"], ["b", "m"], ["m", "fim"]]);
    const r = await rodar(id, { origem: "x" });
    igual(r.status, "success", "fluxo com dois ramos conclui");
    igual([...marcas].sort(), ["A", "B", "FIM"], "os dois ramos rodam e o nó final roda UMA vez");
    const s = await saidaDe(r.executionId, "fim");
    ok(s.dado_a === 1 && s.dado_b === 2, "Merge juntou os dados dos dois ramos", s);
    ok(!(await logs(r.executionId)).some(x => x.level === "warning"), "sem avisos quando os dois ramos chegam");

    const idAp = await criar("A", "append", [T(), M("a", "A", { v: 1 }), M("b", "B", { v: 2 }), { id: "m", type: "merge", config: { mode: "append" } }, M("fim", "FIM")],
      [["t", "a"], ["t", "b"], ["a", "m"], ["b", "m"], ["m", "fim"]]);
    const s2 = await saidaDe((await rodar(idAp)).executionId, "fim");
    ok(Array.isArray(s2.items) && s2.count === 2 && s2.items.map(i => i.v).sort().join() === "1,2", "modo append devolve lista com cada ramo", s2);

    const idKy = await criar("A", "keyed", [T(), { ...M("a", "A", { v: 1 }), label: "Ramo A" }, { ...M("b", "B", { v: 2 }), label: "Ramo B" }, { id: "m", type: "merge", config: { mode: "keyed" } }, M("fim", "FIM")],
      [["t", "a"], ["t", "b"], ["a", "m"], ["b", "m"], ["m", "fim"]]);
    const s3 = await saidaDe((await rodar(idKy)).executionId, "fim");
    ok(s3["Ramo A"]?.v === 1 && s3["Ramo B"]?.v === 2, "modo keyed separa por nome do nó", s3);
  }

  grupo("5. Merge com ramo que não chega (IF)");
  {
    const id = await criar("A", "merge-if", [T(), { id: "i", type: "if", config: { field: "{{ $json.v }}", operator: "equals", value: 1 } }, M("a", "A", { dado_a: 1 }), M("b", "B"), { id: "m", type: "merge", config: { mode: "merge" } }, M("fim", "FIM")],
      [["t", "i"], ["i", "a", "true"], ["i", "b", "false"], ["a", "m"], ["b", "m"], ["m", "fim"]]);
    const r = await rodar(id, { v: 1 });
    igual(r.status, "success", "não trava esperando o ramo que não veio");
    igual(marcas, ["A", "FIM"], "segue com o ramo que chegou");
    ok((await logs(r.executionId)).some(x => x.level === "warning" && /1 de 2/.test(x.message)), "aviso informa que o Merge recebeu 1 de 2 entradas");
  }

  grupo("6. Saída de qualquer nó anterior ($node) e variáveis");
  {
    const id = await criar("A", "node-ref", [T(), M("a", "A", { codigo: "ABC" }), M("b", "B", { outro: 1 }),
      { id: "s", type: "set", label: "Montar", config: { values: { msg: "{{ $node['a'].json.codigo }}-{{ $trigger.data.cliente }}-{{ $vars.loja }}-{{ $json.outro }}" } } }, M("fim", "FIM")],
      [["t", "a"], ["a", "b"], ["b", "s"], ["s", "fim"]], { vars: { loja: "Loja1" } });
    const r = await rodar(id, { cliente: "Zé" });
    igual((await saidaDe(r.executionId, "s")).msg, "ABC-Zé-Loja1-1", "usa saída de nó antigo, dados do gatilho, variável do fluxo e dado do nó anterior");
  }

  // =========================================================================
  grupo("7. Tentativas (retry)");
  {
    const id = await criar("A", "retry", [T(), { id: "f", type: "t_falha", config: { chave: "r1", falhar: 2, __settings: { retry: { max: 3, waitMs: 10, backoff: false } } } }, M("fim", "FIM")], [["t", "f"], ["f", "fim"]]);
    const r = await rodar(id);
    igual(r.status, "success", "sucesso na 3ª tentativa");
    igual(falhasPorChave.r1, 3, "o nó foi chamado 3 vezes");
    igual((await logs(r.executionId)).filter(x => x.level === "warning").length, 2, "2 avisos de tentativa registrados");
    igual(marcas, ["FIM"], "o fluxo continuou depois");

    const id2 = await criar("A", "retry-falha", [T(), { id: "f", type: "t_falha", config: { chave: "r2", falhar: 99, __settings: { retry: { max: 2, waitMs: 10 } } } }, M("fim", "FIM")], [["t", "f"], ["f", "fim"]]);
    const r2 = await rodar(id2);
    igual(r2.status, "failed", "falha depois de esgotar as tentativas");
    igual(falhasPorChave.r2, 2, "tentou só 2 vezes");
    ok(/falha proposital/.test((await exe(r2.executionId)).error_message), "mensagem do erro fica na execução");
    igual(marcas, [], "nós seguintes não rodam");
  }

  grupo("8. Tratamento de erro por nó");
  {
    let n = 0;
    const mk = async (onError, comArestaErro) => {
      const chave = `e${++n}`;
      const nodes = [T(), { id: "f", type: "t_falha", config: { chave, falhar: 99, __settings: { onError } } }, M("normal", "NORMAL"), M("erro", "ERRO")];
      const edges = [["t", "f"], ["f", "normal"]];
      if (comArestaErro) edges.push(["f", "erro", "error"]);
      return criar("A", `erro-${onError}-${comArestaErro}`, nodes, edges);
    };
    let r = await rodar(await mk("stop", true));
    igual(r.status, "failed", "padrão 'parar' falha a execução");
    igual(marcas, [], "e não segue nenhum ramo");

    r = await rodar(await mk("continue", false), { v: 1 });
    igual(r.status, "success", "'continuar' conclui a execução");
    igual(marcas, ["NORMAL"], "segue o caminho normal");
    const entrada = JSON.parse((await logs(r.executionId)).find(x => x.node_id === "normal").input_data);
    ok(entrada.error && /falha proposital/.test(entrada.error.message) && entrada.v === 1, "o próximo nó recebe os dados e o erro", entrada);

    r = await rodar(await mk("error_branch", true));
    igual(r.status, "success", "'saída de erro' conclui a execução");
    igual(marcas, ["ERRO"], "segue só pela saída de erro");

    r = await rodar(await mk("error_branch", false));
    igual(r.status, "failed", "'saída de erro' sem nada ligado nela falha (não engole o erro)");
  }

  grupo("9. Fluxo de erro entre automações");
  {
    const tratador = await criar("A", "tratador", [T(), { id: "reg", type: "log", config: { message: "ERRO: {{ $json.error.message }} em {{ $json.automation.name }}" } }], [["t", "reg"]]);
    const principalId = await criar("A", "principal", [T(), { id: "f", type: "t_falha", label: "Passo ruim", config: { chave: "z" } }], [["t", "f"]], { errorAutomationId: tratador });
    const r = await rodar(principalId);
    igual(r.status, "failed", "a automação principal falha");
    const filha = await um("SELECT * FROM automation_executions WHERE automation_id = ? ORDER BY id DESC", [tratador]);
    ok(!!filha, "a automação de erro foi executada");
    igual(filha?.mode, "error_flow", "marcada como fluxo de erro");
    igual(filha?.parent_execution_id, r.executionId, "ligada à execução que falhou");
    ok((await logs(filha.id)).some(x => /ERRO: falha proposital 1 em principal/.test(x.message)), "recebe a mensagem do erro e o nome da automação");
    igual(JSON.parse(filha.trigger_data).error.node, "Passo ruim", "informa em qual nó falhou");

    const outro = await criar("A", "outro-tratador", [T(), { id: "log", type: "log", config: { message: "x" } }], [["t", "log"]]);
    const tratadorRuim = await criar("A", "tratador-ruim", [T(), { id: "f", type: "t_falha", config: { chave: "w" } }], [["t", "f"]], { errorAutomationId: outro });
    const p2 = await criar("A", "principal2", [T(), { id: "f", type: "t_falha", config: { chave: "z2" } }], [["t", "f"]], { errorAutomationId: tratadorRuim });
    await rodar(p2);
    igual((await um("SELECT COUNT(*) n FROM automation_executions WHERE automation_id = ?", [outro])).n, 0, "falha dentro do fluxo de erro não dispara outro (sem cascata)");

    const deB = await criar("B", "tratador-B", [T(), { id: "log", type: "log", config: { message: "x" } }], [["t", "log"]]);
    const p3 = await criar("A", "principal3", [T(), { id: "f", type: "t_falha", config: { chave: "z3" } }], [["t", "f"]], { errorAutomationId: deB });
    const r3 = await rodar(p3);
    igual(r3.status, "failed", "falha normalmente");
    igual((await um("SELECT COUNT(*) n FROM automation_executions WHERE automation_id = ?", [deB])).n, 0, "automação de erro de OUTRA empresa não é executada");
  }

  grupo("10. Limites: loop infinito e tempo");
  {
    const id = await criar("A", "ciclo", [T(), M("a", "A"), M("b", "B")], [["t", "a"], ["a", "b"], ["b", "a"]]);
    const r = await rodar(id);
    igual(r.status, "failed", "ciclo infinito é interrompido");
    ok(/Limite maximo de passos/.test(r.error), "com mensagem clara", r.error);

    const id2 = await criar("A", "lento", [T(), { id: "d", type: "t_dorme", config: { ms: 1300 } }, M("fim", "FIM")], [["t", "d"], ["d", "fim"]], { timeoutMs: 1000 });
    const r2 = await rodar(id2);
    igual(r2.status, "failed", "tempo máximo do fluxo é respeitado");
    ok(/Tempo maximo/.test(r2.error), "com mensagem clara", r2.error);
    igual(marcas, [], "e não roda o nó seguinte");
  }

  // =========================================================================
  grupo("11. Pausa e retomada (espera e aprovação)");
  {
    const passado = new Date(Date.now() - 1000).toISOString();
    const id = await criar("A", "espera", [T(), { id: "w", type: "wait", config: { until: passado } }, M("x", "X"), M("y", "Y")], [["t", "w"], ["t", "y"], ["w", "x"]]);
    const r = await rodar(id);
    igual(r.status, "waiting", "pausa na espera");
    const est = await um("SELECT * FROM automation_execution_state WHERE execution_id = ?", [r.executionId]);
    ok(!!est && JSON.parse(est.context_snapshot).__v === 2, "estado salvo guarda a fila de ramos pendentes");
    marcas = [];
    const r2 = await engine.resume(r.executionId);
    igual(r2.status, "success", "retoma e conclui");
    igual([...marcas].sort(), ["X", "Y"], "o ramo da espera E o ramo paralelo pendente rodam, cada um uma vez");
    igual((await um("SELECT COUNT(*) n FROM automation_execution_state WHERE execution_id = ?", [r.executionId])).n, 0, "estado é limpo no fim");

    const ap = await criar("A", "aprovacao", [T(), { id: "h", type: "human_approval", config: {} }, M("ok", "APROVADO"), M("no", "REJEITADO")], [["t", "h"], ["h", "ok", "approved"], ["h", "no", "rejected"]]);
    let ra = await rodar(ap); igual(ra.status, "waiting", "aprovação pausa");
    marcas = []; await engine.resume(ra.executionId, "approved"); igual(marcas, ["APROVADO"], "aprovar segue o ramo 'approved'");
    ra = await rodar(ap); marcas = []; await engine.resume(ra.executionId, "rejected"); igual(marcas, ["REJEITADO"], "rejeitar segue o ramo 'rejected'");

    // execução pausada ANTES da atualização (estado antigo, só com o contexto)
    const legado = await criar("A", "legado", [T(), { id: "w", type: "wait", config: { until: passado } }, M("x", "X")], [["t", "w"], ["w", "x"]]);
    const rl = await rodar(legado);
    await db.query("UPDATE automation_execution_state SET context_snapshot = ? WHERE execution_id = ?", [JSON.stringify({ trigger: { type: "manual_trigger", data: { a: 1 } }, ultimoOutput: { a: 1 }, tenantId: tenants.A }), rl.executionId]);
    marcas = [];
    const rl2 = await engine.resume(rl.executionId);
    igual(rl2.status, "success", "execução pausada no formato antigo ainda retoma");
    igual(marcas, ["X"], "e segue o fluxo");
    let erro = null; try { await engine.resume(rl.executionId); } catch (e) { erro = e.message; }
    ok(/nao esta aguardando/.test(erro || ""), "não retoma duas vezes", erro);
  }

  grupo("12. For Each continua funcionando");
  {
    const id = await criar("A", "foreach", [T(), { id: "l", type: "t_lista", config: {} }, { id: "fe", type: "for_each", config: { items: "{{ $json.lista }}", itemVar: "n" } },
      { id: "dobra", type: "set", config: { values: { dobro: "{{ $json.n * 2 }}" } } }, M("fim", "FIM")],
      [["t", "l"], ["l", "fe"], ["fe", "dobra", "loop_body"], ["fe", "fim", "done"]]);
    const r = await rodar(id);
    igual(r.status, "success", "conclui");
    const concl = JSON.parse((await logs(r.executionId)).find(x => x.node_id === "fe" && /concluido/.test(x.message)).output_data);
    igual(concl.items.map(i => Number(i.dobro)), [2, 4, 6], "expressão dentro do loop calcula por item");
    igual(marcas, ["FIM"], "depois do loop segue pela saída 'done'");
  }

  grupo("13. Isolamento e modo");
  {
    const id = await criar("A", "iso", [T(), M("a", "A")], [["t", "a"]]);
    let erro = null; try { await engine.execute(id, tenants.B, {}); } catch (e) { erro = e.message; }
    ok(/nao pertence/.test(erro || ""), "empresa B não executa automação da empresa A", erro);
    const r = await engine.execute(id, tenants.A, {}, { mode: "manual" });
    igual((await exe(r.executionId)).mode, "manual", "modo 'manual' fica registrado");
  }

  grupo("14. Rotas: configurações do fluxo");
  {
    const app = require(path.join(raiz, "src", "app"));
    const servidor = await new Promise(res => { const s = app.listen(0, "127.0.0.1", () => res(s)); });
    const base = `http://127.0.0.1:${servidor.address().port}`;
    const tk = t => jwt.sign({ id: 1, role: "admin", email: "a@t.com", tenant_id: tenants[t] }, process.env.JWT_SECRET);
    const api = async (metodo, rota, token, body) => {
      const r = await fetch(base + rota, { method: metodo, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
      let j = null; try { j = await r.json(); } catch { /* sem corpo */ } return { status: r.status, json: j };
    };
    const a = await criar("A", "rota", [T(), M("a", "A")], [["t", "a"]]);
    const alvo = await criar("A", "alvo", [T()], []);
    const deB = await criar("B", "alvoB", [T()], []);
    const defn = { nodes: [{ node_id: "t", type: "manual_trigger", label: "Início", config: {} }, { node_id: "a", type: "t_marca", label: "A", config: { nome: "A", __settings: { retry: { max: 2 } } } }], edges: [{ source_node_id: "t", target_node_id: "a" }] };
    let r = await api("PUT", `/api/automations/${a}/definicao`, tk("A"), { ...defn, settings: { timeoutMs: 60000, vars: { loja: "X" }, errorAutomationId: alvo } });
    igual(r.status, 200, "salva definição com configurações");
    r = await api("GET", `/api/automations/${a}/definicao`, tk("A"));
    igual(r.json?.settings, { timeoutMs: 60000, vars: { loja: "X" }, errorAutomationId: alvo }, "configurações voltam na leitura");
    igual(r.json?.nodes?.find(n => n.node_id === "a")?.config?.__settings?.retry?.max, 2, "ajustes por nó (retry) são preservados");
    r = await api("PUT", `/api/automations/${a}/definicao`, tk("A"), { ...defn, settings: { timeoutMs: 5 } });
    igual(r.status, 400, "tempo máximo inválido é recusado");
    r = await api("PUT", `/api/automations/${a}/definicao`, tk("A"), { ...defn, settings: { errorAutomationId: deB } });
    igual(r.status, 400, "automação de erro de outra empresa é recusada");
    r = await api("PUT", `/api/automations/${a}/definicao`, tk("A"), { ...defn, settings: { errorAutomationId: a } });
    igual(r.status, 400, "automação não pode tratar o próprio erro");
    r = await api("PUT", `/api/automations/${a}/definicao`, tk("A"), defn);
    igual(r.status, 200, "salvar sem 'settings' não apaga as configurações");
    igual((await api("GET", `/api/automations/${a}/definicao`, tk("A"))).json?.settings?.vars, { loja: "X" }, "configurações continuam lá");
    r = await api("POST", `/api/automations/${a}/execute`, tk("A"), { data: { z: 1 } });
    igual(r.json?.status, "success", "executar pela rota funciona");
    igual((await exe(r.json.executionId)).mode, "manual", "execução pela rota fica como 'manual'");
    r = await api("POST", `/api/automations/${a}/execute`, tk("B"), {});
    igual(r.status, 400, "outra empresa não executa");
    servidor.close();
  }

  console.log(`\n==== ${total - falhas.length}/${total} verificações passaram ====`);
  if (falhas.length) { console.log("\nFALHAS:"); falhas.forEach(f => console.log(" - " + f)); }
  await db.end();
  process.exit(falhas.length ? 1 : 0);
}
principal().catch(e => { console.error("ERRO NO TESTE:", e); process.exit(2); });
