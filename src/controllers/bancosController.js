const pool = require("../config/db");

// ── CONTAS BANCÁRIAS ──

exports.listarContas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*,
        (SELECT COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END), 0)
         FROM bank_transactions WHERE bank_account_id = b.id) AS movimentado
       FROM bank_accounts b WHERE b.tenant_id = ? ORDER BY b.ativo DESC, b.nome`,
      [req.tenant_id]
    );
    const comSaldo = rows.map(r => ({ ...r, saldo_atual: (Number(r.saldo_inicial) + Number(r.movimentado)).toFixed(2) }));
    res.json(comSaldo);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar contas bancárias", details: err.message });
  }
};

exports.criarConta = async (req, res) => {
  try {
    const { nome, banco, agencia, numero_conta, tipo, conta_contabil_id, saldo_inicial } = req.body;
    if (!nome) return res.status(400).json({ error: "nome é obrigatório" });

    const [result] = await pool.query(
      `INSERT INTO bank_accounts (tenant_id, nome, banco, agencia, numero_conta, tipo, conta_contabil_id, saldo_inicial)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenant_id, nome, banco || null, agencia || null, numero_conta || null, tipo || "corrente", conta_contabil_id || null, saldo_inicial || 0]
    );
    res.status(201).json({ id: result.insertId, message: "Conta bancária criada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar conta bancária", details: err.message });
  }
};

exports.desativarConta = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "UPDATE bank_accounts SET ativo = FALSE WHERE id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Conta não encontrada" });
    res.json({ message: "Conta desativada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desativar conta", details: err.message });
  }
};

// ── MOVIMENTAÇÕES BANCÁRIAS ──

exports.listarTransacoes = async (req, res) => {
  try {
    const { bank_account_id, conciliado } = req.query;
    let sql = "SELECT * FROM bank_transactions WHERE tenant_id = ?";
    const params = [req.tenant_id];
    if (bank_account_id) { sql += " AND bank_account_id = ?"; params.push(bank_account_id); }
    if (conciliado !== undefined) { sql += " AND conciliado = ?"; params.push(conciliado === "true" ? 1 : 0); }
    sql += " ORDER BY data DESC, id DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar transações", details: err.message });
  }
};

exports.criarTransacao = async (req, res) => {
  try {
    const { bank_account_id, data, descricao, tipo, valor } = req.body;
    if (!bank_account_id || !data || !descricao || !tipo || !valor) {
      return res.status(400).json({ error: "bank_account_id, data, descricao, tipo e valor são obrigatórios" });
    }
    if (!["entrada", "saida"].includes(tipo)) {
      return res.status(400).json({ error: "tipo deve ser 'entrada' ou 'saida'" });
    }
    const [result] = await pool.query(
      `INSERT INTO bank_transactions (tenant_id, bank_account_id, data, descricao, tipo, valor)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.tenant_id, bank_account_id, data, descricao, tipo, valor]
    );
    res.status(201).json({ id: result.insertId, message: "Movimentação registrada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar movimentação", details: err.message });
  }
};

exports.excluirTransacao = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "DELETE FROM bank_transactions WHERE id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Movimentação não encontrada" });
    res.json({ message: "Movimentação excluída" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir movimentação", details: err.message });
  }
};

// ── CONCILIAÇÃO ──

// Sugere possíveis correspondências entre movimentações bancárias não conciliadas
// e lançamentos financeiros (aba Resumo) com valor e status compatíveis.
exports.sugerirConciliacao = async (req, res) => {
  try {
    const { bank_account_id } = req.query;
    if (!bank_account_id) return res.status(400).json({ error: "bank_account_id é obrigatório" });

    const [transacoes] = await pool.query(
      `SELECT * FROM bank_transactions
       WHERE tenant_id = ? AND bank_account_id = ? AND conciliado = FALSE
       ORDER BY data DESC`,
      [req.tenant_id, bank_account_id]
    );

    if (transacoes.length === 0) return res.json([]);

    const [entradasCandidatas] = await pool.query(
      `SELECT id, tipo, descricao, valor, data_pagamento AS data
       FROM financial_entries
       WHERE tenant_id = ? AND status = 'pago'`,
      [req.tenant_id]
    );

    const sugestoes = transacoes.map(t => {
      const candidatos = entradasCandidatas
        .filter(e => {
          const tipoCompativel = t.tipo === "entrada" ? e.tipo === "receita" : e.tipo === "despesa";
          const valorCompativel = Math.abs(Number(e.valor) - Number(t.valor)) < 0.01;
          return tipoCompativel && valorCompativel;
        })
        .map(e => {
          const diffDias = e.data ? Math.abs((new Date(t.data) - new Date(e.data)) / 86400000) : 99;
          const confianca = diffDias === 0 ? "alta" : diffDias <= 3 ? "media" : "baixa";
          return { financial_entry_id: e.id, descricao: e.descricao, valor: e.valor, data: e.data, confianca };
        })
        .sort((a, b) => (a.confianca === "alta" ? -1 : 1));

      return { transacao: t, candidatos };
    });

    res.json(sugestoes);
  } catch (err) {
    res.status(500).json({ error: "Erro ao sugerir conciliação", details: err.message });
  }
};

exports.conciliar = async (req, res) => {
  try {
    const { id } = req.params; // id da bank_transaction
    const { financial_entry_id } = req.body;
    if (!financial_entry_id) return res.status(400).json({ error: "financial_entry_id é obrigatório" });

    const [[transacao]] = await pool.query(
      "SELECT id FROM bank_transactions WHERE id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );
    if (!transacao) return res.status(404).json({ error: "Movimentação não encontrada" });

    const [[lancamento]] = await pool.query(
      "SELECT id FROM financial_entries WHERE id = ? AND tenant_id = ?",
      [financial_entry_id, req.tenant_id]
    );
    if (!lancamento) return res.status(404).json({ error: "Lançamento financeiro não encontrado" });

    await pool.query(
      "UPDATE bank_transactions SET conciliado = TRUE, financial_entry_id = ? WHERE id = ?",
      [financial_entry_id, id]
    );
    res.json({ message: "Movimentação conciliada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao conciliar", details: err.message });
  }
};

exports.desconciliar = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE bank_transactions SET conciliado = FALSE, financial_entry_id = NULL WHERE id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );
    res.json({ message: "Conciliação desfeita" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desconciliar", details: err.message });
  }
};