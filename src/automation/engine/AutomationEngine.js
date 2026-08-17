const pool = require("../../config/db");
const NodeRegistry = require("../nodes/NodeRegistry");

NodeRegistry.register("manual_trigger", require("../nodes/ManualTriggerNode"));
NodeRegistry.register("event_trigger", require("../nodes/EventTriggerNode"));
NodeRegistry.register("set", require("../nodes/SetNode"));
NodeRegistry.register("if", require("../nodes/IfNode"));
NodeRegistry.register("log", require("../nodes/LogNode"));
NodeRegistry.register("schedule_trigger", require("../nodes/ScheduleTriggerNode"));
NodeRegistry.register("webhook_trigger", require("../nodes/WebhookTriggerNode"));

const MAX_STEPS = 200;

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
  return nodes.find(n => n.type === "manual_trigger" || n.type === "event_trigger");
}

function proximosNodes(edges, nodeId, branch) {
  return edges.filter(e => e.source_node_id === nodeId && (branch ? e.source_handle === branch : true));
}

exports.execute = async (automationId, tenantId, triggerData = {}) => {
  const { automation, nodes, edges } = await carregarWorkflow(automationId, tenantId);

  const trigger = encontrarTrigger(nodes);
  if (!trigger) throw new Error("Workflow nao possui Manual Trigger ou Event Trigger");

  const inicio = Date.now();
  const [result] = await pool.query(
    "INSERT INTO automation_executions (automation_id, tenant_id, status, trigger_type, trigger_data, started_at) VALUES (?, ?, 'running', ?, ?, NOW())",
    [automationId, tenantId, trigger.type, JSON.stringify(triggerData)]
  );
  const executionId = result.insertId;

  const context = { trigger: { type: trigger.type, data: triggerData }, ultimoOutput: triggerData };
  let atual = trigger;
  let steps = 0;

  try {
    while (atual && steps < MAX_STEPS) {
      steps++;
      const handler = NodeRegistry.get(atual.type);
      if (!handler) throw new Error(`Node de tipo desconhecido: ${atual.type}`);

      const nodeInicio = Date.now();
      let resultado;
      try {
        resultado = await handler(
          { ...atual, config: typeof atual.config === "string" ? JSON.parse(atual.config) : atual.config },
          context
        );
      } catch (errNode) {
        await pool.query(
          "INSERT INTO automation_logs (execution_id, node_id, level, message, input_data, duration_ms) VALUES (?, ?, 'error', ?, ?, ?)",
          [executionId, atual.node_id, errNode.message, JSON.stringify(context.ultimoOutput), Date.now() - nodeInicio]
        );
        throw errNode;
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
      [Date.now() - inicio, executionId]
    );
    return { executionId, status: "success" };
  } catch (err) {
    await pool.query(
      "UPDATE automation_executions SET status = 'failed', finished_at = NOW(), duration_ms = ?, error_message = ? WHERE id = ?",
      [Date.now() - inicio, err.message, executionId]
    );
    return { executionId, status: "failed", error: err.message };
  }
};
