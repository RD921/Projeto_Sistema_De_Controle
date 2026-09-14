const pool = require("../config/db");

exports.projecao = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 60;

    // Saldo atual: soma de todas as contas bancárias ativas
    const [[saldoRow]] = await pool.query(
      `SELECT COALESCE(SUM(
         saldo_inicial + (
           SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 0)
           FROM bank_transactions bt WHERE bt.bank_account_id = ba.id
         )
       ), 0) AS saldo_atual
       FROM bank_accounts ba
       WHERE ba.tenant_id = ? AND ba.ativo = TRUE`,
      [req.tenant_id]
    );
    const saldoAtual = Number(saldoRow.saldo_atual);

    // Movimentações futuras previstas (contas a pagar/receber ainda não pagas)
    const [movimentos] = await pool.query(
      `SELECT data_vencimento AS data, tipo,
         SUM(valor) AS valor
       FROM financial_entries
       WHERE tenant_id = ? AND status != 'pago'
         AND data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
       GROUP BY data_vencimento, tipo
       ORDER BY data_vencimento ASC`,
      [req.tenant_id, dias]
    );

    // Monta um mapa dia a dia, preenchendo os dias sem movimento com zero
    const mapaDias = {};
    for (let i = 0; i <= dias; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const chave = d.toISOString().slice(0, 10);
      mapaDias[chave] = { data: chave, entradas: 0, saidas: 0 };
    }
    movimentos.forEach(m => {
      const chave = new Date(m.data).toISOString().slice(0, 10);
      if (!mapaDias[chave]) return;
      if (m.tipo === "receita") mapaDias[chave].entradas += Number(m.valor);
      else mapaDias[chave].saidas += Number(m.valor);
    });

    // Calcula saldo acumulado dia a dia
    let saldoAcumulado = saldoAtual;
    const linhaDoTempo = Object.values(mapaDias).map(dia => {
      saldoAcumulado += dia.entradas - dia.saidas;
      return { ...dia, saldo_projetado: saldoAcumulado.toFixed(2) };
    });

    // Identifica períodos de risco (saldo projetado negativo)
    const diasCriticos = linhaDoTempo.filter(d => Number(d.saldo_projetado) < 0);

    // Marcos de referência: hoje, 7, 30, 60 dias
    const marco = (n) => linhaDoTempo[Math.min(n, linhaDoTempo.length - 1)]?.saldo_projetado || saldoAtual.toFixed(2);

    res.json({
      saldo_atual: saldoAtual.toFixed(2),
      marcos: {
        hoje: saldoAtual.toFixed(2),
        d7: marco(7),
        d30: marco(30),
        d60: marco(Math.min(60, dias)),
      },
      linha_do_tempo: linhaDoTempo,
      dias_criticos: diasCriticos,
      tem_risco: diasCriticos.length > 0,
      primeiro_dia_critico: diasCriticos[0]?.data || null,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar projeção de fluxo de caixa", details: err.message });
  }
};