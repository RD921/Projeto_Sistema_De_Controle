const pool = require("../../config/db");
const NodeRegistry = require("../nodes/NodeRegistry");
const { resolverValor } = require("./TemplateResolver");
const { garantir: garantirSchema } = require("../../services/automationSchema");

NodeRegistry.register("manual_trigger", require("../nodes/ManualTriggerNode"));
NodeRegistry.register("event_trigger", require("../nodes/EventTriggerNode"));
NodeRegistry.register("set", require("../nodes/SetNode"));
NodeRegistry.register("if", require("../nodes/IfNode"));
NodeRegistry.register("log", require("../nodes/LogNode"));
NodeRegistry.register("schedule_trigger", require("../nodes/ScheduleTriggerNode"));
NodeRegistry.register("webhook_trigger", require("../nodes/WebhookTriggerNode"));
NodeRegistry.register("http_request", require("../nodes/HttpRequestNode"));
NodeRegistry.register("switch", require("../nodes/SwitchNode"));
NodeRegistry.register("database", require("../nodes/DatabaseNode"));
NodeRegistry.register("wait", require("../nodes/WaitNode"));
NodeRegistry.register("human_approval", require("../nodes/HumanApprovalNode"));
NodeRegistry.register("finance_create_entry", require("../nodes/FinanceCreateEntryNode"));
NodeRegistry.register("finance_get_entry", require("../nodes/FinanceGetEntryNode"));
NodeRegistry.register("finance_mark_paid", require("../nodes/FinanceMarkPaidNode"));
NodeRegistry.register("for_each", require("../nodes/ForEachNode"));
NodeRegistry.register("marketing_send_email", require("../nodes/MarketingSendEmailNode"));
NodeRegistry.register("marketing_lead_action", require("../nodes/MarketingLeadActionNode"));
NodeRegistry.register("merge", require("../nodes/MergeNode"));

const MAX_STEPS = 500;
const MAX_STEPS_LOOP_BODY = 50;
const TIMEOUT_PADRAO_MS = 5 * 60 * 1000;
const TIPOS_TRIGGER = ["manual_trigger", "event_trigger", "schedule_trigger", "webhook_trigger"];
const HANDLES_ESPECIAIS = ["error", "loop_body", "done"];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
function lerJSON(v, padrao) {
  if (v === null || v === undefined) return padrao;
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return padrao; } }
  return v;
}
const limitar = (v, min, max, padrao) => { const n = Number(v); return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : padrao; };
const dormir = ms => new Promise(r => setTimeout(r, ms));
const json = v => JSON.stringify(v === undefined ? null : v);

async function carregarWorkflow(automationId, tenantId) {
  const [[automation]] = await pool.query(
    "SELECT * FROM automations WHERE id = ? AND tenant_id = ?", [automationId, tenantId]
  );
  if (!automation) throw new Error("Automacao nao encontrada ou nao pertence a este tenant");

  const [nodes] = await pool.query("SELECT * FROM automation_nodes WHERE automation_id = ?", [automationId]);
  const [edges] = await pool.query("SELECT * FROM automation_edges WHERE automation_id = ?", [automationId]);
  return { automation, nodes, edges, settings: lerJSON(automation.settings, {}) || {} };
}

function encontrarTrigger(nodes) {
  return nodes.find(n => TIPOS_TRIGGER.includes(n.type));
}

// Arestas que saem de um nó. Com "branch" (if/switch/http...), só as daquela saída.
// Sem "branch", todas as saídas normais (as de erro e as do For Each têm tratamento próprio).
function saidas(edges, nodeId, branch) {
  const doNo = edges.filter(e => e.source_node_id === nodeId);
  if (branch) return doNo.filter(e => e.source_handle === branch);
  return doNo.filter(e => !HANDLES_ESPECIAIS.includes(e.source_handle));
}

// Configurações de execução de cada nó (guardadas em config.__settings):
// { retry: { max, waitMs, backoff }, onError: "stop" | "continue" | "error_branch" }
function ajustesDoNo(node) {
  const cfg = lerJSON(node.config, {}) || {};
  const s = cfg.__settings || {};
  return {
    tentativas: limitar(s.retry?.max, 1, 10, 1),
    esperaMs: limitar(s.retry?.waitMs, 0, 60000, 1000),
    backoff: s.retry?.backoff !== false,
    onError: ["continue", "error_branch"].includes(s.onError) ? s.onError : "stop",
  };
}

async function executarHandler(node, context) {
  const handler = NodeRegistry.get(node.type);
  if (!handler) throw new Error(`Node de tipo desconhecido: ${node.type}`);
  return handler({ ...node, config: lerJSON(node.config, {}) || {} }, context);
}

async function gravarLog(executionId, nodeId, nivel, mensagem, entrada, saida, ms) {
  await pool.query(
    "INSERT INTO automation_logs (execution_id, node_id, level, message, input_data, output_data, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [executionId, nodeId, nivel, mensagem, entrada === undefined ? null : json(entrada), saida === undefined ? null : json(saida), ms ?? null]
  );
}

async function descarregarAvisos(executionId, nodeId, ctx) {
  const avisos = ctx.avisos || [];
  ctx.avisos = [];
  for (const a of avisos) await gravarLog(executionId, nodeId, "warning", a);
}

function registrarSaida(context, node, output) {
  context.nodes[node.node_id] = { output, label: node.label || node.node_id, type: node.type, em: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// For Each: executa a sub-cadeia ligada em "loop_body" uma vez por item
// (sem pausa dentro do loop; o corpo segue a primeira ligação de cada nó).
// ---------------------------------------------------------------------------
async function executarForEach(node, context, nodes, edges, executionId) {
  const cfg = lerJSON(node.config, {}) || {};
  const ctxItens = { ...context, avisos: [] };
  const itens = resolverValor(cfg.items, ctxItens);
  const arrayItens = Array.isArray(itens) ? itens : [];
  const itemVarName = cfg.itemVar || "item";

  await gravarLog(executionId, node.node_id, "info", `For Each iniciado - ${arrayItens.length} item(ns)`, undefined, { total: arrayItens.length });
  await descarregarAvisos(executionId, node.node_id, ctxItens);

  const primeiroDoCorpo = edges.filter(e => e.source_node_id === node.node_id && e.source_handle === "loop_body")[0];
  const noCorpoInicial = primeiroDoCorpo ? nodes.find(n => n.node_id === primeiroDoCorpo.target_node_id) : null;
  const resultados = [];

  for (let i = 0; i < arrayItens.length; i++) {
    const base = typeof context.ultimoOutput === "object" && context.ultimoOutput ? context.ultimoOutput : {};
    const ctxIter = { ...context, itemIndex: i, avisos: [], ultimoOutput: { ...base, [itemVarName]: arrayItens[i], indice: i } };
    let noAtual = noCorpoInicial;
    let passos = 0;

    while (noAtual && passos < MAX_STEPS_LOOP_BODY) {
      passos++;
      const inicio = Date.now();
      let resultado;
      try {
        resultado = await executarHandler(noAtual, ctxIter);
      } catch (errNode) {
        await gravarLog(executionId, `${noAtual.node_id}[${i}]`, "error", errNode.message, undefined, undefined, Date.now() - inicio);
        throw new Error(`Erro na iteracao ${i} do For Each (node ${noAtual.node_id}): ${errNode.message}`);
      }
      if (resultado.waiting) {
        throw new Error(`Node ${noAtual.node_id} tentou pausar (wait/aprovacao) dentro de um For Each - isso nao e permitido`);
      }
      ctxIter.ultimoOutput = resultado.output;
      registrarSaida(context, noAtual, resultado.output);
      await gravarLog(executionId, `${noAtual.node_id}[${i}]`, "info", resultado.log || `Node ${noAtual.type} executado`, undefined, resultado.output, Date.now() - inicio);
      await descarregarAvisos(executionId, `${noAtual.node_id}[${i}]`, ctxIter);

      const proximos = saidas(edges, noAtual.node_id, resultado.branch);
      noAtual = proximos.length > 0 ? nodes.find(n => n.node_id === proximos[0].target_node_id) : null;
    }
    if (passos >= MAX_STEPS_LOOP_BODY) throw new Error(`For Each: corpo do loop excedeu ${MAX_STEPS_LOOP_BODY} passos na iteracao ${i} (possivel loop infinito interno)`);
    resultados.push(ctxIter.ultimoOutput);
  }

  const outputFinal = { items: resultados, count: resultados.length };
  await gravarLog(executionId, node.node_id, "info", `For Each concluido - ${resultados.length} iteracao(oes)`, undefined, outputFinal);
  return outputFinal;
}

// ---------------------------------------------------------------------------
// Executor em fila: ramos paralelos, Merge, tentativas e tratamento de erro
// ---------------------------------------------------------------------------
function novoEstado(context, fila) {
  return { context, fila, merges: {}, passos: 0 };
}

function esperadasDoMerge(edges, nodeId) {
  return new Set(edges.filter(e => e.target_node_id === nodeId).map(e => e.source_node_id)).size;
}

// Executa um nó (com tentativas). Devolve { resultado } ou lança erro com err.nodeId.
async function rodarNo(node, entrada, estado, executionId, extra = {}) {
  const ajustes = ajustesDoNo(node);
  const ctx = { ...estado.context, ultimoOutput: entrada, avisos: [], ...extra };
  const inicio = Date.now();
  let ultimoErro;

  for (let tentativa = 1; tentativa <= ajustes.tentativas; tentativa++) {
    try {
      const resultado = await executarHandler(node, ctx);
      await descarregarAvisos(executionId, node.node_id, ctx);
      return { resultado, ms: Date.now() - inicio, ajustes };
    } catch (err) {
      ultimoErro = err;
      if (tentativa < ajustes.tentativas) {
        await gravarLog(executionId, node.node_id, "warning", `Tentativa ${tentativa}/${ajustes.tentativas} falhou: ${err.message}`);
        await dormir(ajustes.esperaMs * (ajustes.backoff ? tentativa : 1));
      }
    }
  }
  await descarregarAvisos(executionId, node.node_id, ctx);
  ultimoErro.ajustes = ajustes;
  ultimoErro.entrada = entrada;
  ultimoErro.ms = Date.now() - inicio;
  ultimoErro.tentativas = ajustes.tentativas;
  throw ultimoErro;
}

async function salvarPausa(executionId, estado, node, resultado) {
  const snapshot = { __v: 2, context: estado.context, fila: estado.fila, merges: estado.merges, passos: estado.passos };
  await pool.query(
    `INSERT INTO automation_execution_state (execution_id, node_id, wait_reason, resume_at, branch, context_snapshot)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE node_id=VALUES(node_id), wait_reason=VALUES(wait_reason), resume_at=VALUES(resume_at), branch=VALUES(branch), context_snapshot=VALUES(context_snapshot)`,
    [executionId, node.node_id, resultado.waitReason || "delay", resultado.resumeAt || null, resultado.branch || null, json(snapshot)]
  );
  await pool.query("UPDATE automation_executions SET status = 'waiting' WHERE id = ?", [executionId]);
}

async function rodarFila(executionId, grafo, estado, startedAtMs, modo) {
  const { nodes, edges, settings, automation } = grafo;
  const porId = new Map(nodes.map(n => [n.node_id, n]));
  const timeoutMs = limitar(settings.timeoutMs, 1000, 30 * 60 * 1000, TIMEOUT_PADRAO_MS);
  const context = estado.context;
  const refTimeout = Date.now(); // o limite vale para esta rodada (uma espera de dias não conta)
  context.executionId = executionId;
  context.nodes = context.nodes || {};

  try {
    for (;;) {
      // Fila vazia: se algum Merge ficou esperando ramos que não vieram, ele segue com o que recebeu.
      if (estado.fila.length === 0) {
        const pendente = Object.keys(estado.merges).find(id => porId.has(id));
        if (!pendente) break;
        estado.fila.push({ nodeId: pendente, input: null, fromId: null, parcial: true });
      }

      if (estado.passos++ >= MAX_STEPS) throw new Error("Limite maximo de passos atingido (possivel loop infinito)");
      if (Date.now() - refTimeout > timeoutMs) throw new Error(`Tempo maximo de execucao excedido (${Math.round(timeoutMs / 1000)}s)`);

      const item = estado.fila.shift();
      const node = porId.get(item.nodeId);
      if (!node) continue;

      let entrada = item.input;
      let extra = {};

      if (node.type === "merge") {
        const reg = estado.merges[node.node_id] || (estado.merges[node.node_id] = { entradas: [] });
        if (!item.parcial) {
          const origem = porId.get(item.fromId);
          reg.entradas = reg.entradas.filter(e => e.fromId !== item.fromId);
          reg.entradas.push({ fromId: item.fromId, label: origem?.label || item.fromId, data: item.input });
        }
        const esperadas = esperadasDoMerge(edges, node.node_id);
        if (!item.parcial && reg.entradas.length < esperadas) continue; // ainda esperando os outros ramos
        extra = { mergeEntradas: reg.entradas, mergeEsperadas: esperadas };
        entrada = reg.entradas.length ? reg.entradas[reg.entradas.length - 1].data : {};
        delete estado.merges[node.node_id];
        if (reg.entradas.length < esperadas) {
          await gravarLog(executionId, node.node_id, "warning", `Merge executado com ${reg.entradas.length} de ${esperadas} entrada(s): os outros ramos não chegaram até aqui`);
        }
      }

      if (node.type === "for_each") {
        const output = await executarForEach(node, { ...context, ultimoOutput: entrada }, nodes, edges, executionId);
        registrarSaida(context, node, output);
        for (const e of saidas(edges, node.node_id, "done")) estado.fila.push({ nodeId: e.target_node_id, input: output, fromId: node.node_id });
        continue;
      }

      let executado;
      try {
        executado = await rodarNo(node, entrada, estado, executionId, extra);
      } catch (err) {
        const { onError } = err.ajustes || ajustesDoNo(node);
        const info = { message: err.message, node: node.label || node.node_id, nodeId: node.node_id, tentativas: err.tentativas || 1 };
        await gravarLog(executionId, node.node_id, "error", err.message, err.entrada, undefined, err.ms);
        if (onError === "continue" || (onError === "error_branch" && saidas(edges, node.node_id, "error").length > 0)) {
          const output = { ...(entrada && typeof entrada === "object" && !Array.isArray(entrada) ? entrada : {}), error: info };
          registrarSaida(context, node, output);
          const destinos = onError === "continue" ? saidas(edges, node.node_id) : saidas(edges, node.node_id, "error");
          await gravarLog(executionId, node.node_id, "warning", onError === "continue" ? "Erro ignorado (configurado para continuar)" : "Erro enviado para a saída de erro");
          for (const e of destinos) estado.fila.push({ nodeId: e.target_node_id, input: output, fromId: node.node_id });
          continue;
        }
        err.nodeId = node.node_id;
        err.nodeLabel = node.label || node.node_id;
        err.jaRegistrado = true;
        throw err;
      }

      const { resultado, ms } = executado;
      if (resultado.waiting) {
        registrarSaida(context, node, resultado.output ?? entrada);
        await gravarLog(executionId, node.node_id, "info", resultado.log || `Node ${node.type} pausou a execucao`, entrada, undefined, ms);
        await salvarPausa(executionId, estado, node, resultado);
        return { executionId, status: "waiting" };
      }

      registrarSaida(context, node, resultado.output);
      await gravarLog(executionId, node.node_id, "info", resultado.log || `Node ${node.type} executado`, entrada, resultado.output, ms);
      for (const e of saidas(edges, node.node_id, resultado.branch)) {
        estado.fila.push({ nodeId: e.target_node_id, input: resultado.output, fromId: node.node_id });
      }
    }

    await pool.query(
      "UPDATE automation_executions SET status = 'success', finished_at = NOW(), duration_ms = ? WHERE id = ?",
      [Date.now() - startedAtMs, executionId]
    );
    await pool.query("DELETE FROM automation_execution_state WHERE execution_id = ?", [executionId]);
    return { executionId, status: "success" };
  } catch (err) {
    await pool.query(
      "UPDATE automation_executions SET status = 'failed', finished_at = NOW(), duration_ms = ?, error_message = ? WHERE id = ?",
      [Date.now() - startedAtMs, err.message, executionId]
    );
    await pool.query("DELETE FROM automation_execution_state WHERE execution_id = ?", [executionId]);
    await dispararFluxoDeErro(automation, settings, executionId, err, modo);
    return { executionId, status: "failed", error: err.message };
  }
}

// Fluxo de erro: se a automação tem outra automação escolhida para tratar falhas, ela é executada
// com os dados do erro. Uma automação disparada por um fluxo de erro não dispara outro (evita cascata).
async function dispararFluxoDeErro(automation, settings, executionId, err, modo) {
  const idErro = Number(settings?.errorAutomationId);
  if (!idErro || idErro === automation.id || modo === "error_flow") return;
  try {
    await exports.execute(idErro, automation.tenant_id, {
      error: { message: err.message, node: err.nodeLabel || null, nodeId: err.nodeId || null },
      automation: { id: automation.id, name: automation.name },
      execution_id: executionId,
    }, { mode: "error_flow", parentExecutionId: executionId });
  } catch (e) {
    console.error(`[AUTOMACAO] Fluxo de erro ${idErro} não pôde ser executado:`, e.message);
  }
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
exports.execute = async (automationId, tenantId, triggerData = {}, opts = {}) => {
  const schemaOk = await garantirSchema();
  const grafo = await carregarWorkflow(automationId, tenantId);
  const trigger = encontrarTrigger(grafo.nodes);
  if (!trigger) throw new Error("Workflow nao possui um trigger valido");

  const modo = opts.mode || "trigger";
  const startedAtMs = Date.now();
  const [result] = schemaOk
    ? await pool.query(
      "INSERT INTO automation_executions (automation_id, tenant_id, status, trigger_type, trigger_data, started_at, mode, parent_execution_id, retry_of) VALUES (?, ?, 'running', ?, ?, NOW(), ?, ?, ?)",
      [automationId, tenantId, trigger.type, json(triggerData), modo, opts.parentExecutionId || null, opts.retryOf || null])
    : await pool.query(
      "INSERT INTO automation_executions (automation_id, tenant_id, status, trigger_type, trigger_data, started_at) VALUES (?, ?, 'running', ?, ?, NOW())",
      [automationId, tenantId, trigger.type, json(triggerData)]);
  const executionId = result.insertId;

  const context = {
    trigger: { type: trigger.type, data: triggerData }, ultimoOutput: triggerData, tenantId, executionId,
    vars: grafo.settings.vars && typeof grafo.settings.vars === "object" ? grafo.settings.vars : {}, nodes: {},
  };
  const estado = novoEstado(context, [{ nodeId: trigger.node_id, input: triggerData, fromId: null }]);
  return rodarFila(executionId, grafo, estado, startedAtMs, modo);
};

exports.resume = async (executionId, decisao = null) => {
  await garantirSchema();
  const [[execRow]] = await pool.query("SELECT * FROM automation_executions WHERE id = ?", [executionId]);
  if (!execRow) throw new Error("Execucao nao encontrada");
  if (execRow.status !== "waiting") throw new Error(`Execucao nao esta aguardando (status atual: ${execRow.status})`);

  const [[state]] = await pool.query("SELECT * FROM automation_execution_state WHERE execution_id = ?", [executionId]);
  if (!state) throw new Error("Execucao marcada como waiting mas sem estado salvo - dado inconsistente");

  const grafo = await carregarWorkflow(execRow.automation_id, execRow.tenant_id);
  const snap = lerJSON(state.context_snapshot, {});
  const branch = state.wait_reason === "approval" ? decisao : (state.branch || null);

  // Execuções pausadas antes desta versão guardavam só o contexto; as novas guardam também a fila.
  const estado = snap && snap.__v === 2
    ? { context: snap.context, fila: snap.fila || [], merges: snap.merges || {}, passos: snap.passos || 0 }
    : novoEstado(snap || {}, []);
  estado.context.nodes = estado.context.nodes || {};
  const saidaDoNo = estado.context.nodes[state.node_id]?.output ?? estado.context.ultimoOutput;

  const proximos = saidas(grafo.edges, state.node_id, branch);
  estado.fila = [...proximos.map(e => ({ nodeId: e.target_node_id, input: saidaDoNo, fromId: state.node_id })), ...estado.fila];

  const startedAtMs = new Date(execRow.started_at).getTime();
  await pool.query("UPDATE automation_executions SET status = 'running' WHERE id = ?", [executionId]);
  await pool.query("DELETE FROM automation_execution_state WHERE execution_id = ?", [executionId]);
  return rodarFila(executionId, grafo, estado, startedAtMs, execRow.mode || "trigger");
};

// Usados pelos testes e pela depuração
exports._internals = { saidas, ajustesDoNo, lerJSON };
