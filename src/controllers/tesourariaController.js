const pool = require("../config/db");
const { registrar } = require("../services/auditoriaService");

// ── POSIÇÃO CONSOLIDADA ──

exports.posicao = async (req, res) => {
  try {
    const [contas] = await pool.query(
      `SELECT ba.id, ba.nome, ba.banco, ba.tipo,
         ba.saldo_inicial + COALESCE((
           SELECT SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END)
           FROM bank_transactions bt WHERE bt.bank_account_id = ba.id
         ), 0) AS saldo_atual
       FROM bank_accounts ba
       WHERE ba.tenant_id = ? AND ba.ativo = TRUE`,
      [req.tenant_id]
    );

    const [[investRow]] = await pool.query(
      `SELECT COALESCE(SUM(valor_atual), 0) AS total_investido,
              COALESCE(SUM(valor_atual - valor_aplicado), 0) AS rendimento_total
       FROM investments WHERE tenant_id = ? AND status = 'ativo'`,
      [req.tenant_id]
    );

    const totalCaixa = contas.reduce((a, c) => a + Number(c.saldo_atual), 0);
    const totalInvestido = Number(investRow.total_investido);

    res.json({
      contas: contas.map(c => ({ ...c, saldo_atual: Number(c.saldo_atual).toFixed(2) })),
      total_caixa: totalCaixa.toFixed(2),
      total_investido: totalInvestido.toFixed(2),
      rendimento_total: Number(investRow.rendimento_total).toFixed(2),
      disponibilidade_total: (totalCaixa + totalInvestido).toFixed(2),
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar posição de tesouraria", details: err.message });
  }
};

// ── TRANSFERÊNCIAS ──

exports.listarTransferencias = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, co.nome AS conta_origem_nome, cd.nome AS conta_destino_nome
       FROM bank_transfers t
       JOIN bank_accounts co ON co.id = t.conta_origem_id
       JOIN bank_accounts cd ON cd.id = t.conta_destino_id
       WHERE t.tenant_id = ?
       ORDER BY t.data DESC, t.id DESC`,
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar transferências", details: err.message });
  }
};

exports.criarTransferencia = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { conta_origem_id, conta_destino_id, valor, data, descricao } = req.body;
    if (!conta_origem_id || !conta_destino_id || !valor || !data) {
      conn.release();
      return res.status(400).json({ error: "conta_origem_id, conta_destino_id, valor e data são obrigatórios" });
    }
    if (conta_origem_id === conta_destino_id) {
      conn.release();
      return res.status(400).json({ error: "Conta de origem e destino não podem ser a mesma" });
    }

    await conn.beginTransaction();

    const [transferResult] = await conn.query(
      `INSERT INTO bank_transfers (tenant_id, conta_origem_id, conta_destino_id, valor, data, descricao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.tenant_id, conta_origem_id, conta_destino_id, valor, data, descricao || "Transferência entre contas"]
    );

    // Registra como duas movimentações bancárias (saída na origem, entrada no destino)
    await conn.query(
      `INSERT INTO bank_transactions (tenant_id, bank_account_id, data, descricao, tipo, valor)
       VALUES (?, ?, ?, ?, 'saida', ?)`,
      [req.tenant_id, conta_origem_id, data, `Transferência enviada${descricao ? ": " + descricao : ""}`, valor]
    );
    await conn.query(
      `INSERT INTO bank_transactions (tenant_id, bank_account_id, data, descricao, tipo, valor)
       VALUES (?, ?, ?, ?, 'entrada', ?)`,
      [req.tenant_id, conta_destino_id, data, `Transferência recebida${descricao ? ": " + descricao : ""}`, valor]
    );

    await conn.commit();
    conn.release();
    res.status(201).json({ id: transferResult.insertId, message: "Transferência realizada" });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: "Erro ao realizar transferência", details: err.message });
  }
};

// ── APLICAÇÕES / INVESTIMENTOS ──

exports.listarInvestimentos = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, ba.nome AS conta_nome
       FROM investments i
       JOIN bank_accounts ba ON ba.id = i.bank_account_id
       WHERE i.tenant_id = ?
       ORDER BY i.status ASC, i.data_aplicacao DESC`,
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar investimentos", details: err.message });
  }
};

exports.criarInvestimento = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { bank_account_id, nome, tipo, valor_aplicado, data_aplicacao, data_vencimento } = req.body;
    if (!bank_account_id || !nome || !valor_aplicado || !data_aplicacao) {
      conn.release();
      return res.status(400).json({ error: "bank_account_id, nome, valor_aplicado e data_aplicacao são obrigatórios" });
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO investments (tenant_id, bank_account_id, nome, tipo, valor_aplicado, valor_atual, data_aplicacao, data_vencimento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenant_id, bank_account_id, nome, tipo || "outro", valor_aplicado, valor_aplicado, data_aplicacao, data_vencimento || null]
    );

    // A aplicação sai do caixa da conta de origem
    await conn.query(
      `INSERT INTO bank_transactions (tenant_id, bank_account_id, data, descricao, tipo, valor)
       VALUES (?, ?, ?, ?, 'saida', ?)`,
      [req.tenant_id, bank_account_id, data_aplicacao, `Aplicação: ${nome}`, valor_aplicado]
    );

    await conn.commit();
    conn.release();
    res.status(201).json({ id: result.insertId, message: "Investimento registrado" });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: "Erro ao registrar investimento", details: err.message });
  }
};

exports.atualizarValorAtual = async (req, res) => {
  try {
    const { id } = req.params;
    const { valor_atual } = req.body;
    if (!valor_atual) return res.status(400).json({ error: "valor_atual é obrigatório" });

    const [result] = await pool.query(
      "UPDATE investments SET valor_atual = ? WHERE id = ? AND tenant_id = ? AND status = 'ativo'",
      [valor_atual, id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Investimento não encontrado ou já resgatado" });
    res.json({ message: "Valor atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar valor", details: err.message });
  }
};

exports.resgatarInvestimento = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const [[inv]] = await conn.query(
      "SELECT * FROM investments WHERE id = ? AND tenant_id = ? AND status = 'ativo'",
      [id, req.tenant_id]
    );
    if (!inv) { conn.release(); return res.status(404).json({ error: "Investimento não encontrado ou já resgatado" }); }

    await conn.beginTransaction();

    await conn.query(
      "UPDATE investments SET status = 'resgatado', data_resgate = CURDATE() WHERE id = ?",
      [id]
    );

    // O valor resgatado (já com rendimento) volta pro caixa da conta de origem
    await conn.query(
      `INSERT INTO bank_transactions (tenant_id, bank_account_id, data, descricao, tipo, valor)
       VALUES (?, ?, CURDATE(), ?, 'entrada', ?)`,
      [req.tenant_id, inv.bank_account_id, `Resgate: ${inv.nome}`, inv.valor_atual]
    );

    await registrar(req.tenant_id, req.user, "resgatar_investimento", "investment", id,
  `Resgatou "${inv.nome}" — valor resgatado: R$ ${inv.valor_atual}`);

    await conn.commit();
    conn.release();
    res.json({ message: "Investimento resgatado", valor_resgatado: Number(inv.valor_atual).toFixed(2) });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: "Erro ao resgatar investimento", details: err.message });
  }
};