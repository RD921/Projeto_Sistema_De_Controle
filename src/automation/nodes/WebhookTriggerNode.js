// src/automation/nodes/WebhookTriggerNode.js
module.exports = async function webhookTriggerNode(node, context) {
  return {
    output: context.trigger?.data || {},
    log: "Disparado por webhook externo",
  };
};