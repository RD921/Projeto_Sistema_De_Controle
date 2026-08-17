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

module.exports = { resolverTemplate };