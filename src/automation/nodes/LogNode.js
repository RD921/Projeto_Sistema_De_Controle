const { resolverTemplate } = require("../engine/TemplateResolver");

module.exports = async (node, context) => {
  const mensagem = resolverTemplate(node.config?.message || "", context);
  return { output: context.ultimoOutput, log: mensagem };
};
