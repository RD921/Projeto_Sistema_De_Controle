const pool = require("../config/db");

// ══════════════ BASELINE: dados reais do negócio ══════════════

async function obterSaldoAtual(tenant_id) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(
       saldo_inicial + (SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 0)
                         FROM bank_transactions bt WHERE bt.bank_account_id = ba.id)
     ), 0) AS saldo
     FROM bank_accounts ba WHERE ba.tenant_id = ? AND ba.ativo = TRUE`,
    [tenant_id]
  );
  return Number(rows[0]?.saldo || 0);
}

async function obterMediaMensal(tenant_id) {
  // Média dos últimos 3 meses de lançamentos pagos, separando receita e despesa
  const [rows] = await pool.query(
    `SELECT tipo, AVG(total_mes) AS media
     FROM (
       SELECT tipo, DATE_FORMAT(data_pagamento, '%Y-%m') AS mes, SUM(valor) AS total_mes
       FROM financial_entries
       WHERE tenant_id = ? AND status = 'pago' AND data_pagamento >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
       GROUP BY tipo, mes
     ) sub
     GROUP BY tipo`,
    [tenant_id]
  );

  const medias = { receita: 0, despesa: 0 };
  rows.forEach(r => { medias[r.tipo] = Number(r.media || 0); });
  return medias;
}

// ══════════════ MOTOR DE PROJEÇÃO ══════════════

function nomeMes(dataBase, offset) {
  const d = new Date(dataBase.getFullYear(), dataBase.getMonth() + offset, 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function competenciaDe(dataBase, offset) {
  const d = new Date(dataBase.getFullYear(), dataBase.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Calcula o ajuste (delta de receita/despesa) que o cenário aplica em cada mês da projeção
function calcularAjustePorMes(tipo, parametros, mesIndex, dataBase, mediaReceita, mediaDespesa) {
  let deltaReceita = 0;
  let deltaDespesa = 0;

  if (tipo === "variacao_percentual") {
    const { alvo, percentual } = parametros;
    const pct = Number(percentual) / 100;
    if (alvo === "receita" || alvo === "ambos") deltaReceita += mediaReceita * pct;
    if (alvo === "despesa" || alvo === "ambos") deltaDespesa += mediaDespesa * pct;
  }

  if (tipo === "contratar_demitir") {
    const { acao, valor_mensal, data_inicio } = parametros;
    const inicio = new Date(data_inicio + "T00:00:00");
    const mesAtualData = new Date(dataBase.getFullYear(), dataBase.getMonth() + mesIndex, 1);
    const inicioMes = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    if (mesAtualData >= inicioMes) {
      const sinal = acao === "contratar" ? 1 : -1;
      deltaDespesa += sinal * Number(valor_mensal);
    }
  }

  if (tipo === "novo_contrato") {
    const { tipo: tipoContrato, valor, recorrencia, data_inicio } = parametros;
    const inicio = new Date(data_inicio + "T00:00:00");
    const mesAtualData = new Date(dataBase.getFullYear(), dataBase.getMonth() + mesIndex, 1);
    const inicioMes = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    const diffMeses = (mesAtualData.getFullYear() - inicioMes.getFullYear()) * 12 + (mesAtualData.getMonth() - inicioMes.getMonth());

    let ocorre = false;
    if (diffMeses >= 0) {
      if (recorrencia === "unico") ocorre = diffMeses === 0;
      else if (recorrencia === "mensal") ocorre = true;
      else if (recorrencia === "trimestral") ocorre = diffMeses % 3 === 0;
      else if (recorrencia === "semestral") ocorre = diffMeses % 6 === 0;
      else if (recorrencia === "anual") ocorre = diffMeses % 12 === 0;
    }

    if (ocorre) {
      if (tipoContrato === "fornecedor") deltaDespesa += Number(valor);
      else deltaReceita += Number(valor);
    }
  }

  if (tipo === "livre") {
    deltaReceita += Number(parametros.receita_mensal_ajuste || 0);
    deltaDespesa += Number(parametros.despesa_mensal_ajuste || 0);
  }

  return { deltaReceita, deltaDespesa };
}

async function simular(tenant_id, { tipo, parametros, meses_projecao }) {
  const meses = Math.min(Math.max(Number(meses_projecao) || 6, 1), 24);
  const saldoAtual = await obterSaldoAtual(tenant_id);
  const { receita: mediaReceita, despesa: mediaDespesa } = await obterMediaMensal(tenant_id);

  const dataBase = new Date();
  dataBase.setDate(1);

  let saldoBase = saldoAtual;
  let saldoCenario = saldoAtual;
  const timeline = [];

  for (let i = 0; i < meses; i++) {
    const fluxoBase = mediaReceita - mediaDespesa;
    saldoBase += fluxoBase;

    const { deltaReceita, deltaDespesa } = calcularAjustePorMes(tipo, parametros, i, dataBase, mediaReceita, mediaDespesa);
    const fluxoCenario = (mediaReceita + deltaReceita) - (mediaDespesa + deltaDespesa);
    saldoCenario += fluxoCenario;

    timeline.push({
      mes: nomeMes(dataBase, i),
      competencia: competenciaDe(dataBase, i),
      receita_base: Number(mediaReceita.toFixed(2)),
      despesa_base: Number(mediaDespesa.toFixed(2)),
      saldo_base: Number(saldoBase.toFixed(2)),
      receita_cenario: Number((mediaReceita + deltaReceita).toFixed(2)),
      despesa_cenario: Number((mediaDespesa + deltaDespesa).toFixed(2)),
      saldo_cenario: Number(saldoCenario.toFixed(2)),
      diferenca: Number((saldoCenario - saldoBase).toFixed(2)),
    });
  }

  const ultimoMes = timeline[timeline.length - 1];
  return {
    saldo_atual: Number(saldoAtual.toFixed(2)),
    media_receita_mensal: Number(mediaReceita.toFixed(2)),
    media_despesa_mensal: Number(mediaDespesa.toFixed(2)),
    timeline,
    resumo: {
      saldo_final_base: ultimoMes.saldo_base,
      saldo_final_cenario: ultimoMes.saldo_cenario,
      impacto_total: ultimoMes.diferenca,
      impacto_positivo: ultimoMes.diferenca >= 0,
    },
  };
}

// ══════════════ CRUD de cenários salvos ══════════════

async function listar(tenant_id) {
  const [rows] = await pool.query(
    `SELECT id, nome, tipo, parametros, meses_projecao, created_at FROM scenarios WHERE tenant_id = ? ORDER BY created_at DESC`,
    [tenant_id]
  );
  return rows.map(r => ({ ...r, parametros: typeof r.parametros === "string" ? JSON.parse(r.parametros) : r.parametros }));
}

async function salvar(tenant_id, { nome, tipo, parametros, meses_projecao }) {
  const [result] = await pool.query(
    `INSERT INTO scenarios (tenant_id, nome, tipo, parametros, meses_projecao) VALUES (?, ?, ?, ?, ?)`,
    [tenant_id, nome, tipo, JSON.stringify(parametros), meses_projecao || 6]
  );
  return { id: result.insertId, nome, tipo, parametros, meses_projecao: meses_projecao || 6 };
}

async function excluir(tenant_id, id) {
  await pool.query(`DELETE FROM scenarios WHERE tenant_id = ? AND id = ?`, [tenant_id, id]);
}

async function buscarPorId(tenant_id, id) {
  const [rows] = await pool.query(`SELECT * FROM scenarios WHERE tenant_id = ? AND id = ?`, [tenant_id, id]);
  if (!rows[0]) return null;
  return { ...rows[0], parametros: typeof rows[0].parametros === "string" ? JSON.parse(rows[0].parametros) : rows[0].parametros };
}

module.exports = { simular, listar, salvar, excluir, buscarPorId };