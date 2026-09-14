const { resolverTemplate } = require("../engine/TemplateResolver");

module.exports = async (node, context) => {
  const { field, cases = [], defaultBranch = "default" } = node.config || {};
  const valorResolvido = resolverTemplate(field, context);

  for (const c of cases) {
    if (String(valorResolvido) === String(c.value)) {
      return { output: context.ultimoOutput, branch: c.branch || c.value };
    }
  }
  return { output: context.ultimoOutput, branch: defaultBranch };
};