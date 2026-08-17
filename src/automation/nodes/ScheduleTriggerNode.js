// src/automation/nodes/ScheduleTriggerNode.js
module.exports = async function scheduleTriggerNode(node, context) {
  return {
    output: context.trigger?.data || {},
    log: `Disparado por agendamento (${node.config?.cron || "cron não definido"})`,
  };
};