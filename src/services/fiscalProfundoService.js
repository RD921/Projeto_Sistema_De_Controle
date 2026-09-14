const db = require("../config/db");

const ALIQUOTAS_SIMPLES_ANEXO1 = [
  { ate: 180000, aliquota: 0.04, deducao: 0 },
  { ate: 360000, aliquota: 0.073, deducao: 5940 },
  { ate: 720000, aliquota: 0.095, deducao: 13860 },
  { ate: 1800000, aliquota: 0.107, deducao: 22500 },
  { ate: 3600000, aliquota: 0.143, deducao: 87300 },
  { ate: 4800000, aliquota: 0.19, deducao: 378000 },
];

function calcularSimplesNacional(receitaBruta, rbt12) {
  const faixa = ALIQUOTAS_SIMPLES_ANEXO1.find(f => rbt12 <= f.ate) || ALIQUOTAS_SIMPLES_ANEXO1[ALIQUOTAS_SIMPLES_ANEXO1.length - 1];
  const aliquotaEfetiva = rbt12 > 0
    ? ((rbt12 * faixa.aliquota) - faixa.deducao) / rbt12
    : faixa.aliquota;
  const valor = receitaBruta * Math.max(aliquotaEfetiva, 0);
  return {
    detalhes: [
      { imposto: "DAS (Simples Nacional)", base_calculo: receitaBruta, aliquota: (aliquotaEfetiva * 100).toFixed(2) + "%", valor: Number(valor.toFixed(2)) },
    ],
    base_calculo: receitaBruta,
    total: Number(valor.toFixed(2)),
  };
}

function calcularLucroPresumido(receitaBruta, tipoAtividade = "comercio") {
  const percentualPresuncao = tipoAtividade === "servico" ? 0.32 : 0.08;
  const lucroPresumido = receitaBruta * percentualPresuncao;

  const irpjBase = lucroPresumido;
  const irpjNormal = irpjBase * 0.15;
  const limiteMensal = 20000;
  const excedente = Math.max(irpjBase - limiteMensal, 0);
  const irpjAdicional = excedente * 0.10;
  const irpjTotal = irpjNormal + irpjAdicional;

  const csll = lucroPresumido * 0.09;
  const pis = receitaBruta * 0.0065;
  const cofins = receitaBruta * 0.03;

  const detalhes = [
    { imposto: "IRPJ", base_calculo: Number(irpjBase.toFixed(2)), aliquota: "15% + adicional", valor: Number(irpjTotal.toFixed(2)) },
    { imposto: "CSLL", base_calculo: Number(lucroPresumido.toFixed(2)), aliquota: "9%", valor: Number(csll.toFixed(2)) },
    { imposto: "PIS", base_calculo: receitaBruta, aliquota: "0,65%", valor: Number(pis.toFixed(2)) },
    { imposto: "COFINS", base_calculo: receitaBruta, aliquota: "3%", valor: Number(cofins.toFixed(2)) },
  ];
  const total = irpjTotal + csll + pis + cofins;
  return { detalhes, base_calculo: Number(lucroPresumido.toFixed(2)), total: Number(total.toFixed(2)) };
}

function calcularLucroReal(receitaBruta, lucroContabil) {
  const base = Math.max(lucroContabil || 0, 0);
  const irpjNormal = base * 0.15;
  const limiteMensal = 20000;
  const excedente = Math.max(base - limiteMensal, 0);
  const irpjAdicional = excedente * 0.10;
  const irpjTotal = irpjNormal + irpjAdicional;
  const csll = base * 0.09;
  const pis = receitaBruta * 0.0165;
  const cofins = receitaBruta * 0.076;

  const detalhes = [
    { imposto: "IRPJ", base_calculo: Number(base.toFixed(2)), aliquota: "15% + adicional", valor: Number(irpjTotal.toFixed(2)) },
    { imposto: "CSLL", base_calculo: Number(base.toFixed(2)), aliquota: "9%", valor: Number(csll.toFixed(2)) },
    { imposto: "PIS (não-cumulativo)", base_calculo: receitaBruta, aliquota: "1,65%", valor: Number(pis.toFixed(2)) },
    { imposto: "COFINS (não-cumulativo)", base_calculo: receitaBruta, aliquota: "7,6%", valor: Number(cofins.toFixed(2)) },
  ];
  const total = irpjTotal + csll + pis + cofins;
  return { detalhes, base_calculo: Number(base.toFixed(2)), total: Number(total.toFixed(2)) };
}

function calcularMEI() {
  const valorFixo = 76.90;
  return {
    detalhes: [{ imposto: "DAS-MEI", base_calculo: 0, aliquota: "valor fixo", valor: valorFixo }],
    base_calculo: 0,
    total: valorFixo,
  };
}

async function obterReceitaBrutaCompetencia(tenantId, competencia) {
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(receita_bruta), 0) AS total
     FROM order_financial_breakdown
     WHERE tenant_id = ? AND DATE_FORMAT(processado_em, '%Y-%m') = ?`,
    [tenantId, competencia]
  );
  return Number(rows[0]?.total || 0);
}

async function obterRBT12(tenantId, competencia) {
  const [ano, mes] = competencia.split("-").map(Number);
  const dataFim = new Date(ano, mes - 1, 1);
  const dataInicio = new Date(ano, mes - 12, 1);
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(receita_bruta), 0) AS total
     FROM order_financial_breakdown
     WHERE tenant_id = ? AND processado_em >= ? AND processado_em < ?`,
    [tenantId, dataInicio, dataFim]
  );
  return Number(rows[0]?.total || 0);
}

async function obterLucroContabilCompetencia(tenantId, competencia) {
  const [rows] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN c.tipo = 'receita' THEN al.valor ELSE 0 END), 0) -
       COALESCE(SUM(CASE WHEN c.tipo = 'despesa' THEN al.valor ELSE 0 END), 0) AS lucro
     FROM accounting_entry_lines al
     JOIN accounting_entries e ON e.id = al.entry_id
     JOIN chart_of_accounts c ON c.id = al.conta_id
     WHERE e.tenant_id = ? AND DATE_FORMAT(e.data, '%Y-%m') = ?`,
    [tenantId, competencia]
  );
  return Number(rows[0]?.lucro || 0);
}

exports.calcular = async (tenantId, competencia) => {
  const [fiscalRows] = await db.query(
    `SELECT regime_tributario FROM company_fiscal_data WHERE tenant_id = ?`,
    [tenantId]
  );
  const regime = fiscalRows[0]?.regime_tributario || "simples_nacional";
  const receitaBruta = await obterReceitaBrutaCompetencia(tenantId, competencia);

  let resultado;
  let lucroContabilParaSalvar = null;

  if (regime === "mei") {
    resultado = calcularMEI();
  } else if (regime === "isento") {
    resultado = { detalhes: [], base_calculo: 0, total: 0 };
  } else if (regime === "simples_nacional") {
    const rbt12 = await obterRBT12(tenantId, competencia);
    resultado = calcularSimplesNacional(receitaBruta, rbt12 || receitaBruta * 12);
  } else if (regime === "lucro_presumido") {
    resultado = calcularLucroPresumido(receitaBruta);
  } else if (regime === "lucro_real") {
    lucroContabilParaSalvar = await obterLucroContabilCompetencia(tenantId, competencia);
    resultado = calcularLucroReal(receitaBruta, lucroContabilParaSalvar);
  } else {
    resultado = { detalhes: [], base_calculo: 0, total: 0 };
  }

  await db.query(
    `INSERT INTO fiscal_calculos (tenant_id, competencia, regime_tributario, receita_bruta, lucro_contabil, base_calculo, detalhes, total_impostos)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       regime_tributario = VALUES(regime_tributario),
       receita_bruta = VALUES(receita_bruta),
       lucro_contabil = VALUES(lucro_contabil),
       base_calculo = VALUES(base_calculo),
       detalhes = VALUES(detalhes),
       total_impostos = VALUES(total_impostos),
       status = 'calculado',
       financial_entry_id = NULL,
       obrigacao_id = NULL`,
    [
      tenantId, competencia, regime, receitaBruta,
      lucroContabilParaSalvar,
      resultado.base_calculo, JSON.stringify(resultado.detalhes), resultado.total,
    ]
  );

  return { regime, receita_bruta: receitaBruta, ...resultado };
};

exports.buscarCalculo = async (tenantId, competencia) => {
  const [rows] = await db.query(
    `SELECT * FROM fiscal_calculos WHERE tenant_id = ? AND competencia = ?`,
    [tenantId, competencia]
  );
  return rows[0] || null;
};

exports.listarHistorico = async (tenantId) => {
  const [rows] = await db.query(
    `SELECT * FROM fiscal_calculos WHERE tenant_id = ? ORDER BY competencia DESC LIMIT 24`,
    [tenantId]
  );
  return rows;
};

exports.gerarGuia = async (tenantId, competencia, costCenterId) => {
  const calculo = await exports.buscarCalculo(tenantId, competencia);
  if (!calculo) throw new Error("Nenhum cálculo encontrado para essa competência. Calcule antes de gerar a guia.");
  if (calculo.status === "guia_gerada") throw new Error("A guia já foi gerada para essa competência.");
  if (Number(calculo.total_impostos) <= 0) throw new Error("Não há valor de impostos a pagar nessa competência.");

  const [ano, mes] = competencia.split("-").map(Number);
  const vencimento = new Date(ano, mes, 20);

  const [entryResult] = await db.query(
    `INSERT INTO financial_entries
       (tenant_id, tipo, categoria, cost_center_id, descricao, valor, data_vencimento, status, aprovacao_status, total_parcelas, parcela_atual)
     VALUES (?, 'despesa', 'impostos', ?, ?, ?, ?, 'pendente', 'nao_requer', 1, 1)`,
    [tenantId, costCenterId, `Impostos - Competência ${competencia}`, calculo.total_impostos, vencimento]
  );
  const financialEntryId = entryResult.insertId;

  const [obrigRows] = await db.query(
    `SELECT id FROM fiscal_obligations WHERE tenant_id = ? AND competencia = ? LIMIT 1`,
    [tenantId, competencia]
  );
  const obrigacaoId = obrigRows[0]?.id || null;

  await db.query(
    `UPDATE fiscal_calculos SET status = 'guia_gerada', financial_entry_id = ?, obrigacao_id = ? WHERE id = ?`,
    [financialEntryId, obrigacaoId, calculo.id]
  );

  return { financial_entry_id: financialEntryId, obrigacao_id: obrigacaoId };
};