const pool = require("../config/db");

async function listar(tenant_id, { tipo, status } = {}) {
  let sql = `SELECT c.*, cc.codigo AS cost_center_codigo, cc.nome AS cost_center_nome
             FROM contracts c
             LEFT JOIN cost_centers cc ON cc.id = c.cost_center_id
             WHERE c.tenant_id = ?`;
  const params = [tenant_id];
  if (tipo) { sql += " AND c.tipo = ?"; params.push(tipo); }
  if (status) { sql += " AND c.status = ?"; params.push(status); }
  sql += " ORDER BY c.status = 'ativo' DESC, c.nome_contraparte ASC";
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function buscarPorId(tenant_id, id) {
  const [rows] = await pool.query(
    `SELECT c.*, cc.codigo AS cost_center_codigo, cc.nome AS cost_center_nome
     FROM contracts c
     LEFT JOIN cost_centers cc ON cc.id = c.cost_center_id
     WHERE c.tenant_id = ? AND c.id = ?`,
    [tenant_id, id]
  );
  return rows[0] || null;
}

async function criar(tenant_id, dados) {
  const {
    tipo, nome_contraparte, documento, descricao, categoria, cost_center_id,
    valor, tipo_recorrencia, dia_vencimento, data_inicio, data_fim,
    renovacao_automatica, alerta_dias_antes, observacoes,
  } = dados;

  const [result] = await pool.query(
    `INSERT INTO contracts
     (tenant_id, tipo, nome_contraparte, documento, descricao, categoria, cost_center_id,
      valor, tipo_recorrencia, dia_vencimento, data_inicio, data_fim,
      renovacao_automatica, alerta_dias_antes, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tenant_id, tipo, nome_contraparte, documento || null, descricao, categoria || "outros", cost_center_id,
      valor, tipo_recorrencia || "mensal", dia_vencimento || 10, data_inicio, data_fim || null,
      renovacao_automatica ? 1 : 0, alerta_dias_antes || 30, observacoes || null,
    ]
  );
  return buscarPorId(tenant_id, result.insertId);
}

async function atualizar(tenant_id, id, dados) {
  const atual = await buscarPorId(tenant_id, id);
  if (!atual) return null;

  const {
    tipo, nome_contraparte, documento, descricao, categoria, cost_center_id,
    valor, tipo_recorrencia, dia_vencimento, data_inicio, data_fim,
    renovacao_automatica, alerta_dias_antes, observacoes,
  } = dados;

  await pool.query(
    `UPDATE contracts SET
      tipo = ?, nome_contraparte = ?, documento = ?, descricao = ?, categoria = ?, cost_center_id = ?,
      valor = ?, tipo_recorrencia = ?, dia_vencimento = ?, data_inicio = ?, data_fim = ?,
      renovacao_automatica = ?, alerta_dias_antes = ?, observacoes = ?
     WHERE tenant_id = ? AND id = ?`,
    [
      tipo, nome_contraparte, documento || null, descricao, categoria || "outros", cost_center_id,
      valor, tipo_recorrencia || "mensal", dia_vencimento || 10, data_inicio, data_fim || null,
      renovacao_automatica ? 1 : 0, alerta_dias_antes || 30, observacoes || null,
      tenant_id, id,
    ]
  );
  return buscarPorId(tenant_id, id);
}

async function mudarStatus(tenant_id, id, status) {
  await pool.query(`UPDATE contracts SET status = ? WHERE tenant_id = ? AND id = ?`, [status, tenant_id, id]);
  return buscarPorId(tenant_id, id);
}

async function excluir(tenant_id, id) {
  await pool.query(`DELETE FROM contracts WHERE tenant_id = ? AND id = ?`, [tenant_id, id]);
}

// Contratos vencendo (contrato com data_fim se aproximando e sem renovação automática)
async function vencimentosProximos(tenant_id) {
  const [rows] = await pool.query(
    `SELECT c.*, DATEDIFF(c.data_fim, CURDATE()) AS dias_restantes
     FROM contracts c
     WHERE c.tenant_id = ? AND c.status = 'ativo' AND c.data_fim IS NOT NULL
       AND c.renovacao_automatica = 0
       AND DATEDIFF(c.data_fim, CURDATE()) <= c.alerta_dias_antes
     ORDER BY c.data_fim ASC`,
    [tenant_id]
  );
  return rows;
}

function mesesEntre(dataInicio, competencia) {
  const inicio = new Date(dataInicio);
  const [ano, mes] = competencia.split("-").map(Number);
  return (ano - inicio.getFullYear()) * 12 + (mes - (inicio.getMonth() + 1));
}

function contratoDeveGerarNaCompetencia(contrato, competencia) {
  const diff = mesesEntre(contrato.data_inicio, competencia);
  if (diff < 0) return false;

  const [ano, mes] = competencia.split("-").map(Number);
  if (contrato.data_fim) {
    const fim = new Date(contrato.data_fim);
    const competenciaData = new Date(ano, mes - 1, 1);
    const fimData = new Date(fim.getFullYear(), fim.getMonth(), 1);
    if (competenciaData > fimData) return false;
  }

  switch (contrato.tipo_recorrencia) {
    case "unico": return diff === 0;
    case "mensal": return true;
    case "trimestral": return diff % 3 === 0;
    case "semestral": return diff % 6 === 0;
    case "anual": return diff % 12 === 0;
    default: return false;
  }
}

async function gerarLancamentosPendentes(tenant_id, competencia) {
  const [contratos] = await pool.query(
    `SELECT * FROM contracts WHERE tenant_id = ? AND status = 'ativo'`,
    [tenant_id]
  );

  let gerados = 0;
  const [ano, mes] = competencia.split("-").map(Number);

  for (const contrato of contratos) {
    if (!contratoDeveGerarNaCompetencia(contrato, competencia)) continue;

    const [jaGerado] = await pool.query(
      `SELECT id FROM contract_generated_entries WHERE contract_id = ? AND competencia = ?`,
      [contrato.id, competencia]
    );
    if (jaGerado.length > 0) continue;

    const diaVenc = Math.min(contrato.dia_vencimento, 28);
    const dataVencimento = `${ano}-${String(mes).padStart(2, "0")}-${String(diaVenc).padStart(2, "0")}`;
    const tipoLancamento = contrato.tipo === "fornecedor" ? "despesa" : "receita";

    const [result] = await pool.query(
      `INSERT INTO financial_entries
       (tenant_id, tipo, categoria, cost_center_id, descricao, entidade_nome, valor,
        data_vencimento, total_parcelas, parcela_atual, status, aprovacao_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'pendente', 'nao_requer')`,
      [
        tenant_id, tipoLancamento, contrato.categoria, contrato.cost_center_id,
        `${contrato.descricao} (contrato)`, contrato.nome_contraparte, contrato.valor, dataVencimento,
      ]
    );

    await pool.query(
      `INSERT INTO contract_generated_entries (contract_id, competencia, financial_entry_id) VALUES (?, ?, ?)`,
      [contrato.id, competencia, result.insertId]
    );
    gerados++;
  }

  return { gerados };
}

module.exports = {
  listar, buscarPorId, criar, atualizar, mudarStatus, excluir,
  vencimentosProximos, gerarLancamentosPendentes,
};