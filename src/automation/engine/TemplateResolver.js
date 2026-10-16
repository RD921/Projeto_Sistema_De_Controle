const { avaliarExpressao, str } = require("./ExpressionEngine");

const RE = /\{\{([\s\S]*?)\}\}/g;

function aviso(context, expr, err) {
  if (context && Array.isArray(context.avisos) && context.avisos.length < 50) {
    context.avisos.push(`Expressão "{{${expr}}}" não pôde ser calculada: ${err.message}`);
  }
}

// Substitui cada {{ expressão }} do texto. Uma expressão inválida é mantida como está
// (e registrada como aviso), para não quebrar automações antigas com textos parecidos.
function resolverTemplate(texto, context) {
  if (typeof texto !== "string") return texto;
  return texto.replace(RE, (original, expr) => {
    try { return str(avaliarExpressao(expr, context)); }
    catch (err) { aviso(context, expr.trim(), err); return original; }
  });
}

// Quando o texto é UM único {{ expressão }}, devolve o valor real (array, objeto, número...).
// Necessário, por exemplo, para o For Each iterar sobre um array de verdade.
function resolverValor(texto, context) {
  if (typeof texto !== "string") return texto;
  const t = texto.trim();
  const m = t.match(/^\{\{([\s\S]*?)\}\}$/);
  if (!m || m[1].includes("{{")) return resolverTemplate(texto, context);
  try { return avaliarExpressao(m[1], context); }
  catch (err) { aviso(context, m[1].trim(), err); return undefined; }
}

module.exports = { resolverTemplate, resolverValor };
