// Junta os dados de vários ramos. O motor entrega as entradas em context.mergeEntradas.
// Modos: "merge" (junta os campos num objeto), "append" (lista com a saída de cada ramo),
//        "keyed" (um campo por ramo, com o nome do nó de origem).
module.exports = async (node, context) => {
  const cfg = node.config || {};
  const entradas = context.mergeEntradas || [];
  const modo = ["merge", "append", "keyed"].includes(cfg.mode) ? cfg.mode : "merge";
  const ehObjeto = v => v && typeof v === "object" && !Array.isArray(v);
  let output;
  if (modo === "append") {
    output = { items: entradas.map(e => e.data), count: entradas.length };
  } else if (modo === "keyed") {
    output = {};
    for (const e of entradas) output[e.label || e.fromId] = e.data;
  } else {
    output = {};
    for (const e of entradas) {
      if (ehObjeto(e.data)) Object.assign(output, e.data);
      else output[e.label || e.fromId] = e.data;
    }
  }
  return { output, log: `Merge (${modo}): ${entradas.length} de ${context.mergeEsperadas ?? entradas.length} entrada(s)` };
};
