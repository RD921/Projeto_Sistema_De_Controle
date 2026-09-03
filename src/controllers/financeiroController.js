const pool = require("../config/db");

// Resumo: receita de pedidos pagos + receita manual - despesas, no período informado.
exports.resumo = async (req, res) => {
  try {
    const { de, ate } = req.query;
    const dataDe = de || "1970-01-01";
    const dataAte = ate || "2999-12-31";

    const [[pedidosRow]] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS receita_pedidos, COUNT(*) AS qtd_pedidos
       FROM orders
       WHERE tenant_id = ? AND status = 'pago' AND DATE(created_at) BETWEEN ? AND ?`,
      [req.tenant_id, dataDe, dataAte]
    );

    const [[manualRow]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'receita' AND status = 'pago' THEN valor ELSE 0 END), 0) AS receita_manual,
         COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status = 'pago' THEN valor ELSE 0 END), 0) AS despesas_pagas,
         COALESCE(SUM(CASE WHEN tipo = 'despesa' AND status != 'pago' THEN valor ELSE 0 END), 0) AS despesas_pendentes
       FROM financial_entries
       WHERE tenant_id = ? AND data_vencimento BETWEEN ? AND ?`,
      [req.tenant_id, dataDe, dataAte]
    );

    const receitaTotal = Number(pedidosRow.receita_pedidos) + Number(manualRow.receita_manual);
    const despesasTotal = Number(manualRow.despesas_pagas);
    const saldo = receitaTotal - despesasTotal;

    res.json({
      receita_pedidos: Number(pedidosRow.receita_pedidos),
      qtd_pedidos: pedidosRow.qtd_pedidos,
      receita_manual: Number(manualRow.receita_manual),
      receita_total: receitaTotal,
      despesas_pagas: despesasTotal,
      despesas_pendentes: Number(manualRow.despesas_pendentes),
      saldo,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar resumo financeiro", details: err.message });
  }
};

// Fluxo de caixa: agrupa por dia os pedidos pagos + lançamentos manuais pagos, últimos 30 dias por padrão.
exports.fluxoCaixa = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 30;

    const [pedidos] = await pool.query(
      `SELECT DATE(created_at) AS dia, SUM(total) AS valor
       FROM orders
       WHERE tenant_id = ? AND status = 'pago' AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)`,
      [req.tenant_id, dias]
    );

    const [entradas] = await pool.query(
      `SELECT data_pagamento AS dia, tipo, SUM(valor) AS valor
       FROM financial_entries
       WHERE tenant_id = ? AND status = 'pago' AND data_pagamento >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY data_pagamento, tipo`,
      [req.tenant_id, dias]
    );

    const mapa = {};
    const addDia = (dia, campo, valor) => {
      const chave = String(dia).slice(0, 10);
      if (!mapa[chave]) mapa[chave] = { dia: chave, receita: 0, despesa: 0 };
      mapa[chave][campo] += Number(valor);
    };

    pedidos.forEach(p => addDia(p.dia, "receita", p.valor));
    entradas.forEach(e => addDia(e.dia, e.tipo === "receita" ? "receita" : "despesa", e.valor));

    const resultado = Object.values(mapa).sort((a, b) => a.dia.localeCompare(b.dia));
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar fluxo de caixa", details: err.message });
  }
};

exports.listarLancamentos = async (req, res) => {
  try {
    const { tipo, status } = req.query;
    let sql = "SELECT * FROM financial_entries WHERE tenant_id = ?";
    const params = [req.tenant_id];

    if (tipo) { sql += " AND tipo = ?"; params.push(tipo); }
    if (status) { sql += " AND status = ?"; params.push(status); }
    sql += " ORDER BY data_vencimento DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar lançamentos", details: err.message });
  }
};

exports.criarLancamento = async (req, res) => {
  try {
    const { tipo, categoria, descricao, valor, data_vencimento } = req.body;
    if (!tipo || !descricao || !valor || !data_vencimento) {
      return res.status(400).json({ error: "tipo, descricao, valor e data_vencimento são obrigatórios" });
    }
    if (!["receita", "despesa"].includes(tipo)) {
      return res.status(400).json({ error: "tipo deve ser 'receita' ou 'despesa'" });
    }

    const [result] = await pool.query(
      `INSERT INTO financial_entries (tenant_id, tipo, categoria, descricao, valor, data_vencimento, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pendente')`,
      [req.tenant_id, tipo, categoria || "outros", descricao, valor, data_vencimento]
    );
    res.status(201).json({ id: result.insertId, message: "Lançamento criado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar lançamento", details: err.message });
  }
};

exports.marcarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "UPDATE financial_entries SET status = 'pago', data_pagamento = CURDATE() WHERE id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Lançamento não encontrado" });
    res.json({ message: "Lançamento marcado como pago" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao marcar como pago", details: err.message });
  }
};

exports.excluirLancamento = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "DELETE FROM financial_entries WHERE id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Lançamento não encontrado" });
    res.json({ message: "Lançamento excluído" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir lançamento", details: err.message });
  }
};

exports.getDadosFiscais = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM company_fiscal_data WHERE tenant_id = ?",
      [req.tenant_id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar dados fiscais", details: err.message });
  }
};

exports.salvarDadosFiscais = async (req, res) => {
  try {
    const campos = [
      "cnpj", "razao_social", "nome_fantasia", "inscricao_estadual", "inscricao_municipal",
      "regime_tributario", "natureza_juridica", "cnaes", "cep", "endereco", "numero",
      "complemento", "bairro", "cidade", "estado", "pais",
      "contador_nome", "contador_email", "contador_telefone", "contador_crc",
    ];
    const valores = campos.map(c => req.body[c] ?? null);

    await pool.query(
      `INSERT INTO company_fiscal_data (tenant_id, ${campos.join(", ")})
       VALUES (?, ${campos.map(() => "?").join(", ")})
       ON DUPLICATE KEY UPDATE ${campos.map(c => `${c} = VALUES(${c})`).join(", ")}`,
      [req.tenant_id, ...valores]
    );
    res.json({ message: "Dados fiscais salvos com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar dados fiscais", details: err.message });
  }
};