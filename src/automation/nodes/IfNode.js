const { resolverTemplate } = require("../engine/TemplateResolver");

const OPERADORES = {
  equals: (a, b) => a == b,
  not_equals: (a, b) => a != b,
  greater_than: (a, b) => Number(a) > Number(b),
  greater_than_or_equal: (a, b) => Number(a) >= Number(b),
  less_than: (a, b) => Number(a) < Number(b),
  less_than_or_equal: (a, b) => Number(a) <= Number(b),
  contains: (a, b) => String(a).includes(b),
  not_contains: (a, b) => !String(a).includes(b),
  is_empty: (a) => a === "" || a === null || a === undefined,
  is_not_empty: (a) => a !== "" && a !== null && a !== undefined,
};

module.exports = async (node, context) => {
  const { field, operator, value } = node.config || {};
  const campoResolvido = resolverTemplate(field, context);
  const fn = OPERADORES[operator];
  if (!fn) throw new Error(`Operador desconhecido: ${operator}`);
  const resultado = fn(campoResolvido, value);
  return { output: context.ultimoOutput, branch: resultado ? "true" : "false" };
};
