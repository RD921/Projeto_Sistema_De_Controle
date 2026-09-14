const pool = require("../../config/db");
const { resolverTemplate } = require("../engine/TemplateResolver");

// Apenas tabelas explicitamente liberadas podem ser acessadas por este node.
// Adicionar uma tabela nova aqui e uma decisao deliberada, nao um acidente.
const TABELAS_PERMITIDAS = ["financial_entries", "cost_centers", "financial_alerts", "contracts"];

const OPERADORES_FILTRO = {
  equals: "=", not_equals: "!=",
  greater_than: ">", greater_than_or_equal: ">=",
  less_than: "<", less_than_or_equal: "<=",
};

function validarTabela(nome) {
  if (!TABELAS_PERMITIDAS.includes(nome)) {
    throw new Error(`Tabela "${nome}" nao esta liberada para uso no node de banco de dados`);
  }
}

function validarNomeColuna(nome) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nome)) throw new Error(`Nome de coluna invalido: ${nome}`);
  return nome;
}

module.exports = async (node, context) => {
  const cfg = node.config || {};
  const operacao = (cfg.operation || "select").toLowerCase();
  const tabela = cfg.table;

  if (!tabela) throw new Error("Tabela nao configurada no node de banco de dados");
  validarTabela(tabela);
  if (!context.tenantId) throw new Error("Contexto sem tenant_id - execucao nao pode acessar banco de dados sem isolamento de empresa");

  const filtros = cfg.filters || [];
  const whereParts = ["tenant_id = ?"];
  const whereValues = [context.tenantId];
  for (const f of filtros) {
    const coluna = validarNomeColuna(f.field);
    const op = OPERADORES_FILTRO[f.operator || "equals"];
    if (!op) throw new Error(`Operador de filtro invalido: ${f.operator}`);
    whereParts.push(`${coluna} ${op} ?`);
    whereValues.push(resolverTemplate(String(f.value), context));
  }
  const whereClause = whereParts.join(" AND ");

  if (operacao === "select") {
    const limite = Math.min(Number(cfg.limit) || 100, 500);
    const [rows] = await pool.query(`SELECT * FROM \`${tabela}\` WHERE ${whereClause} LIMIT ?`, [...whereValues, limite]);
    return { output: { rows, count: rows.length }, log: `SELECT em ${tabela}: ${rows.length} linha(s)` };
  }

  if (operacao === "insert") {
    const campos = cfg.fields || {};
    const colunas = Object.keys(campos).map(validarNomeColuna);
    if (colunas.length === 0) throw new Error("Nenhum campo informado para insert");
    const valores = colunas.map(c => resolverTemplate(String(campos[c]), context));
    const [result] = await pool.query(
      `INSERT INTO \`${tabela}\` (tenant_id, ${colunas.map(c => `\`${c}\``).join(", ")}) VALUES (?, ${colunas.map(() => "?").join(", ")})`,
      [context.tenantId, ...valores]
    );
    return { output: { insertId: result.insertId }, log: `INSERT em ${tabela}: id ${result.insertId}` };
  }

  if (operacao === "update") {
    const campos = cfg.fields || {};
    const colunas = Object.keys(campos).map(validarNomeColuna);
    if (colunas.length === 0) throw new Error("Nenhum campo informado para update");
    if (filtros.length === 0) throw new Error("Update exige pelo menos um filtro, para evitar atualizar a tabela inteira");
    const setClause = colunas.map(c => `\`${c}\` = ?`).join(", ");
    const setValues = colunas.map(c => resolverTemplate(String(campos[c]), context));
    const [result] = await pool.query(`UPDATE \`${tabela}\` SET ${setClause} WHERE ${whereClause}`, [...setValues, ...whereValues]);
    return { output: { affectedRows: result.affectedRows }, log: `UPDATE em ${tabela}: ${result.affectedRows} linha(s)` };
  }

  if (operacao === "delete") {
    if (filtros.length === 0) throw new Error("Delete exige pelo menos um filtro, para evitar apagar a tabela inteira");
    const [result] = await pool.query(`DELETE FROM \`${tabela}\` WHERE ${whereClause}`, whereValues);
    return { output: { affectedRows: result.affectedRows }, log: `DELETE em ${tabela}: ${result.affectedRows} linha(s)` };
  }

  throw new Error(`Operacao de banco desconhecida: ${operacao}`);
};