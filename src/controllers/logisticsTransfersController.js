const pool = require("../config/db");

exports.listar = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, p.nome AS product_nome, wo.nome AS origem_nome, wd.nome AS destino_nome
       FROM logistics_transfers t
       JOIN products p ON p.id = t.product_id
       JOIN logistics_warehouses wo ON wo.id = t.warehouse_origem_id
       JOIN logistics_warehouses wd ON wd.id = t.warehouse_destino_id
       WHERE t.tenant_id = ? ORDER BY t.created_at DESC`,
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar transferencias", details: err.message });
  }
};

exports.criar = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { product_id, warehouse_origem_id, warehouse_destino_id, quantidade, data_prevista, observacoes } = req.body;
    if (!product_id || !warehouse_origem_id || !warehouse_destino_id || !quantidade) {
      conn.release();
      return res.status(400).json({ error: "product_id, warehouse_origem_id, warehouse_destino_id e quantidade sao obrigatorios" });
    }
    if (warehouse_origem_id === warehouse_destino_id) {
      conn.release();
      return res.status(400).json({ error: "deposito de origem e destino nao podem ser o mesmo" });
    }
    if (quantidade <= 0) {
      conn.release();
      return res.status(400).json({ error: "quantidade deve ser positiva" });
    }

    await conn.beginTransaction();

    // Garante que existe saldo suficiente na origem (saldo por deposito comeca em 0 se nunca foi inicializado)
    const [[saldoOrigem]] = await conn.query(
      "SELECT quantidade FROM logistics_stock_by_warehouse WHERE product_id = ? AND warehouse_id = ? FOR UPDATE",
      [product_id, warehouse_origem_id]
    );
    const quantidadeDisponivel = saldoOrigem?.quantidade || 0;
    if (quantidadeDisponivel < quantidade) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: `Saldo insuficiente no deposito de origem (disponivel: ${quantidadeDisponivel})` });
    }

    const [result] = await conn.query(
      `INSERT INTO logistics_transfers (tenant_id, product_id, warehouse_origem_id, warehouse_destino_id, quantidade, responsavel_id, data_prevista, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenant_id, product_id, warehouse_origem_id, warehouse_destino_id, quantidade, req.user?.id || null, data_prevista || null, observacoes || null]
    );

    await conn.commit();
    conn.release();
    res.status(201).json({ id: result.insertId, status: "pendente" });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: "Erro ao criar transferencia", details: err.message });
  }
};

exports.concluir = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [[transferencia]] = await conn.query(
      "SELECT * FROM logistics_transfers WHERE id = ? AND tenant_id = ? FOR UPDATE",
      [req.params.id, req.tenant_id]
    );
    if (!transferencia) {
      conn.release();
      return res.status(404).json({ error: "Transferencia nao encontrada" });
    }
    if (transferencia.status !== "pendente" && transferencia.status !== "em_transito") {
      conn.release();
      return res.status(409).json({ error: "So e possivel concluir transferencias pendentes ou em transito" });
    }

    await conn.beginTransaction();

    // Debita da origem (permite negativo tecnicamente, mas confia na checagem feita na criacao;
    // se o saldo mudou entre criar e concluir, isso pode gerar saldo negativo - risco aceito nesta Fase 3)
    await conn.query(
      `INSERT INTO logistics_stock_by_warehouse (tenant_id, product_id, warehouse_id, quantidade)
       VALUES (?, ?, ?, -?)
       ON DUPLICATE KEY UPDATE quantidade = quantidade - ?`,
      [req.tenant_id, transferencia.product_id, transferencia.warehouse_origem_id, transferencia.quantidade, transferencia.quantidade]
    );

    // Credita no destino
    await conn.query(
      `INSERT INTO logistics_stock_by_warehouse (tenant_id, product_id, warehouse_id, quantidade)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantidade = quantidade + ?`,
      [req.tenant_id, transferencia.product_id, transferencia.warehouse_destino_id, transferencia.quantidade, transferencia.quantidade]
    );

    await conn.query(
      "UPDATE logistics_transfers SET status = 'concluida', data_conclusao = NOW() WHERE id = ?",
      [transferencia.id]
    );

    await conn.commit();
    conn.release();
    res.json({ message: "Transferencia concluida" });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: "Erro ao concluir transferencia", details: err.message });
  }
};

exports.cancelar = async (req, res) => {
  try {
    const [[transferencia]] = await pool.query("SELECT status FROM logistics_transfers WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!transferencia) return res.status(404).json({ error: "Transferencia nao encontrada" });
    if (transferencia.status === "concluida") return res.status(409).json({ error: "Nao e possivel cancelar transferencia ja concluida" });
    await pool.query("UPDATE logistics_transfers SET status = 'cancelada' WHERE id = ?", [req.params.id]);
    res.json({ message: "Transferencia cancelada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao cancelar transferencia", details: err.message });
  }
};

// Saldo por deposito de um produto (para exibir onde ele esta fisicamente)
exports.saldoPorDeposito = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.warehouse_id, w.nome AS warehouse_nome, s.quantidade
       FROM logistics_stock_by_warehouse s
       JOIN logistics_warehouses w ON w.id = s.warehouse_id
       WHERE s.product_id = ? AND s.tenant_id = ?`,
      [req.params.productId, req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar saldo por deposito", details: err.message });
  }
};

// Ajuste manual de saldo inicial por deposito (necessario porque a tabela
// comeca zerada - sem isso, nenhuma transferencia teria de onde sair)
exports.ajustarSaldoInicial = async (req, res) => {
  try {
    const { product_id, warehouse_id, quantidade } = req.body;
    if (!product_id || !warehouse_id || quantidade == null) {
      return res.status(400).json({ error: "product_id, warehouse_id e quantidade sao obrigatorios" });
    }
    await pool.query(
      `INSERT INTO logistics_stock_by_warehouse (tenant_id, product_id, warehouse_id, quantidade)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantidade = ?`,
      [req.tenant_id, product_id, warehouse_id, quantidade, quantidade]
    );
    res.json({ message: "Saldo por deposito ajustado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao ajustar saldo", details: err.message });
  }
};