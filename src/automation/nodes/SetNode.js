const { resolverTemplate } = require("../engine/TemplateResolver");

module.exports = async (node, context) => {
  const valores = node.config?.values || {};
  const output = {};
  for (const chave in valores) {
    output[chave] = resolverTemplate(valores[chave], context);
  }
  return { output: { ...context.ultimoOutput, ...output } };
};
