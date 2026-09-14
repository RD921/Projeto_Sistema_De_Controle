function resolverTemplate(texto, context) {
  if (typeof texto !== "string") return texto;
  return texto.replace(/\{\{\s*\$json\.([\w.]+)\s*\}\}/g, (_, caminho) => {
    const partes = caminho.split(".");
    let valor = context.ultimoOutput;
    for (const parte of partes) {
      if (valor == null) return "";
      valor = valor[parte];
    }
    return valor ?? "";
  });
}

// Diferente do resolverTemplate (que sempre devolve string), esta funcao
// devolve o VALOR REAL (array, objeto, numero) quando o texto e exatamente
// um unico placeholder {{$json.caminho}}. Necessario para o For Each,
// que precisa iterar sobre um array de verdade, nao sobre uma string.
function resolverValor(texto, context) {
  if (typeof texto !== "string") return texto;
  const match = texto.trim().match(/^\{\{\s*\$json\.([\w.]+)\s*\}\}$/);
  if (!match) return resolverTemplate(texto, context);
  const partes = match[1].split(".");
  let valor = context.ultimoOutput;
  for (const parte of partes) {
    if (valor == null) return undefined;
    valor = valor[parte];
  }
  return valor;
}

module.exports = { resolverTemplate, resolverValor };