const pool = require("../../config/db");
const NodeRegistry = require("../nodes/NodeRegistry");
const { resolverValor } = require("./TemplateResolver");

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

const MAX_STEPS = 200;
const MAX_STEPS_LOOP_BODY = 50;

async function carregarWorkflow(automationId, tenantId) {
  const [[automation]] = await pool.query(
    "SELECT * FROM automations WHERE id = ? AND tenant_id = ?", [automationId, tenantId]
  );
  if (!automation) throw new Error("Automacao nao encontrada ou nao pertence a este tenant");

  const [nodes] = await pool.query("SELECT * FROM automation_nodes WHERE automation_id = ?", [automationId]);
  const [edges] = await pool.query("SELECT * FROM automation_edges WHERE automation_id = ?", [automationId]);
  return { automation, nodes, edges };
}

function encontrarTrigger(nodes) {
  return nodes.find(n => ["manual_trigger", "event_trigger", "schedule_trigger", "webhook_trigger"].includes(n.type));
}

function proximosNodes(edges, nodeId, branch) {
  return edges.filter(e => e.source_node_id === nodeId && (branch ? e.source_handle === branch : true));
}

async function executarHandler(node, context) {
  const handler = NodeRegistry.get(node.type);
  if (!handler) throw new Error(`Node de tipo desconhecido: ${node.type}`);
  return handler(
    { ...node, config: typeof node.config === "string" ? JSON.parse(node.config) : node.config },
    context
  );
}

// Executa a sub-cadeia de um For Each (a partir do node conectado em "loop_body")
// uma vez por item, sem permitir pausa (wait/aprovacao) dentro do loop.
async function executarForEach(node, context, nodes, edges, executionId) {
  const cfg = typeof node.config === "string" ? JSON.parse(node.config) : node.config || {};
  const itens = resolverValor(cfg.items, context);
  const arrayItens = Array.isArray(itens) ? itens : [];
  const itemVarName = cfg.itemVar || "item";

  await pool.query(
    "INSERT INTO automation_logs (execution_id, node_id, level, message, output_data) VALUES (?, ?, 'info', ?, ?)",
    [executionId, node.node_id, `For Each iniciado - ${arrayItens.length} item(ns)`, JSON.stringify({ total: arrayItens.length })]
  );

  const primeiroDoCorpo = proximosNodes(edges, node.node_id, "loop_body")[0];
  const noCorpoInicial = primeiroDoCorpo ? nodes.find(n => n.node_id === primeiroDoCorpo.target_node_id) : null;
  const resultados = [];

  for (let i = 0; i < arrayItens.length; i++) {
    const contextoIteracao = {
      ...context,
      ultimoOutput: { ...(typeof context.ultimoOutput === "object" ? context.ultimoOutput : {}), [itemVarName]: arrayItens[i], indice: i },
    };
    let noAtual = noCorpoInicial;
    let passos = 0;

    while (noAtual && passos < MAX_STEPS_LOOP_BODY) {
      passos++;
      const nodeInicio = Date.now();
      let resultado;
      try {
        resultado = await executarHandler(noAtual, contextoIteracao);
      } catch (errNode) {
        await pool.query(
          "INSERT INTO automation_logs (execution_id, node_id, level, message, duration_ms) VALUES (?, ?, 'error', ?, ?)",
          [executionId, `${noAtual.node_id}[${i}]`, errNode.message, Date.now() - nodeInicio]
        );
        throw new Error(`Erro na iteracao ${i} do For Each (node ${noAtual.node_id}): ${errNode.message}`);
      }

      if (resultado.waiting) {
        throw new Error(`Node ${noAtual.node_id} tentou pausar (wait/aprovacao) dentro de um For Each - isso nao e permitido`);
      }

      contextoIteracao.ultimoOutput = resultado.output;
      await pool.query(
        "INSERT INTO automation_logs (execution_id, node_id, level, message, output_data, duration_ms) VALUES (?, ?, 'info', ?, ?, ?)",
        [executionId, `${noAtual.node_id}[${i}]`, resultado.log || `Node ${noAtual.type} executado`, JSON.stringify(resultado.output), Date.now() - nodeInicio]
      );

      const proximos = proximosNodes(edges, noAtual.node_id, resultado.branch);
      noAtual = proximos.length > 0 ? nodes.find(n => n.node_id === proximos[0].target_node_id) : null;
    }

    if (passos >= MAX_STEPS_LOOP_BODY) throw new Error(`For Each: corpo do loop excedeu ${MAX_STEPS_LOOP_BODY} passos na iteracao ${i} (possivel loop infinito interno)`);

    resultados.push(contextoIteracao.ultimoOutput);
  }

  const outputFinal = { items: resultados, count: resultados.length };
  await pool.query(
    "INSERT INTO automation_logs (execution_id, node_id, level, message, output_data) VALUES (?, ?, 'info', ?, ?)",
    [executionId, node.node_id, `For Each concluido - ${resultados.length} iteracao(oes)`, JSON.stringify(outputFinal)]
  );

  return outputFinal;
}

async function rodarLoop(executionId, nodes, edges, noAtualInicial, context, startedAtMs) {
  let atual = noAtualInicial;
  let steps = 0;

  try {
    while (atual && steps < MAX_STEPS) {
      steps++;

      if (atual.type === "for_each") {
        const output = await executarForEach(atual, context, nodes, edges, executionId);
        context.ultimoOutput = output;
        const proximosDone = proximosNodes(edges, atual.node_id, "done");
        atual = proximosDone.length > 0 ? nodes.find(n => n.node_id === proximosDone[0].target_node_id) : null;
        continue;
      }

      const nodeInicio = Date.now();
      let resultado;
      try {
        resultado = await executarHandler(atual, context);
      } catch (errNode) {
        await pool.query(
          "INSERT INTO automation_logs (execution_id, node_id, level, message, input_data, duration_ms) VALUES (?, ?, 'error', ?, ?, ?)",
          [executionId, atual.node_id, errNode.message, JSON.stringify(context.ultimoOutput), Date.now() - nodeInicio]
        );
        throw errNode;
      }

      if (resultado.waiting) {
        await pool.query(
          "INSERT INTO automation_logs (execution_id, node_id, level, message, input_data, duration_ms) VALUES (?, ?, 'info', ?, ?, ?)",
          [executionId, atual.node_id, resultado.log || `Node ${atual.type} pausou a execucao`, JSON.stringify(context.ultimoOutput), Date.now() - nodeInicio]
        );
        context.ultimoOutput = resultado.output ?? context.ultimoOutput;
        await pool.query(
          `INSERT INTO automation_execution_state (execution_id, node_id, wait_reason, resume_at, branch, context_snapshot)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE node_id=VALUES(node_id), wait_reason=VALUES(wait_reason), resume_at=VALUES(resume_at), branch=VALUES(branch), context_snapshot=VALUES(context_snapshot)`,
          [executionId, atual.node_id, resultado.waitReason || "delay", resultado.resumeAt || null, resultado.branch || null, JSON.stringify(context)]
        );
        await pool.query("UPDATE automation_executions SET status = 'waiting' WHERE id = ?", [executionId]);
        return { executionId, status: "waiting" };
      }

      context.ultimoOutput = resultado.output;
      await pool.query(
        "INSERT INTO automation_logs (execution_id, node_id, level, message, input_data, output_data, duration_ms) VALUES (?, ?, 'info', ?, ?, ?, ?)",
        [executionId, atual.node_id, resultado.log || `Node ${atual.type} executado`, JSON.stringify(context.ultimoOutput), JSON.stringify(resultado.output), Date.now() - nodeInicio]
      );

      const proximos = proximosNodes(edges, atual.node_id, resultado.branch);
      if (proximos.length === 0) { atual = null; break; }
      atual = nodes.find(n => n.node_id === proximos[0].target_node_id);
    }

    if (steps >= MAX_STEPS) throw new Error("Limite maximo de passos atingido (possivel loop infinito)");

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
    return { executionId, status: "failed", error: err.message };
  }
}

exports.execute = async (automationId, tenantId, triggerData = {}) => {
  const { nodes, edges } = await carregarWorkflow(automationId, tenantId);
  const trigger = encontrarTrigger(nodes);
  if (!trigger) throw new Error("Workflow nao possui um trigger valido");

  const startedAtMs = Date.now();
  const [result] = await pool.query(
    "INSERT INTO automation_executions (automation_id, tenant_id, status, trigger_type, trigger_data, started_at) VALUES (?, ?, 'running', ?, ?, NOW())",
    [automationId, tenantId, trigger.type, JSON.stringify(triggerData)]
  );
  const executionId = result.insertId;
  const context = { trigger: { type: trigger.type, data: triggerData }, ultimoOutput: triggerData, tenantId };
  return rodarLoop(executionId, nodes, edges, trigger, context, startedAtMs);
};

exports.resume = async (executionId, decisao = null) => {
  const [[execRow]] = await pool.query("SELECT * FROM automation_executions WHERE id = ?", [executionId]);
  if (!execRow) throw new Error("Execucao nao encontrada");
  if (execRow.status !== "waiting") throw new Error(`Execucao nao esta aguardando (status atual: ${execRow.status})`);

  const [[state]] = await pool.query("SELECT * FROM automation_execution_state WHERE execution_id = ?", [executionId]);
  if (!state) throw new Error("Execucao marcada como waiting mas sem estado salvo - dado inconsistente");

  const { nodes, edges } = await carregarWorkflow(execRow.automation_id, execRow.tenant_id);
  const context = typeof state.context_snapshot === "string" ? JSON.parse(state.context_snapshot) : state.context_snapshot;
  const branch = state.wait_reason === "approval" ? decisao : (state.branch || null);
  const proximos = proximosNodes(edges, state.node_id, branch);
  const startedAtMs = new Date(execRow.started_at).getTime();

  await pool.query("UPDATE automation_executions SET status = 'running' WHERE id = ?", [executionId]);
  await pool.query("DELETE FROM automation_execution_state WHERE execution_id = ?", [executionId]);

  if (proximos.length === 0) {
    await pool.query(
      "UPDATE automation_executions SET status = 'success', finished_at = NOW(), duration_ms = ? WHERE id = ?",
      [Date.now() - startedAtMs, executionId]
    );
    return { executionId, status: "success" };
  }

  const proximoNode = nodes.find(n => n.node_id === proximos[0].target_node_id);
  return rodarLoop(executionId, nodes, edges, proximoNode, context, startedAtMs);
};