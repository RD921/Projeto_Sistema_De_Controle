const pool = require("../config/db");
const { registrar } = require("../services/auditoriaService");

// ── Fornecedores ──
exports.listarFornecedores = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM compras_fornecedores WHERE tenant_id = ? ORDER BY nome", [req.tenant_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar fornecedores", details: err.message });
  }
};

exports.criarFornecedor = async (req, res) => {
  try {
    const { nome, cnpj, contato, telefone, email, prazo_entrega_dias } = req.body;
    if (!nome) return res.status(400).json({ error: "nome e obrigatorio" });
    const [result] = await pool.query(
      "INSERT INTO compras_fornecedores (tenant_id, nome, cnpj, contato, telefone, email, prazo_entrega_dias) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [req.tenant_id, nome, cnpj || null, contato || null, telefone || null, email || null, prazo_entrega_dias || null]
    );
    await registrar(req.tenant_id, req.user, "criar_fornecedor", "compras_fornecedor", result.insertId, `Criou fornecedor "${nome}"`);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar fornecedor", details: err.message });
  }
};

exports.atualizarFornecedor = async (req, res) => {
  try {
    const { nome, cnpj, contato, telefone, email, prazo_entrega_dias } = req.body;
    const [[fornecedor]] = await pool.query("SELECT nome FROM compras_fornecedores WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!fornecedor) return res.status(404).json({ error: "Fornecedor nao encontrado" });

    await pool.query(
      "UPDATE compras_fornecedores SET nome = ?, cnpj = ?, contato = ?, telefone = ?, email = ?, prazo_entrega_dias = ? WHERE id = ? AND tenant_id = ?",
      [nome, cnpj || null, contato || null, telefone || null, email || null, prazo_entrega_dias || null, req.params.id, req.tenant_id]
    );
    await registrar(req.tenant_id, req.user, "editar_fornecedor", "compras_fornecedor", req.params.id, `Editou fornecedor "${fornecedor.nome}"`);
    res.json({ message: "Fornecedor atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar fornecedor", details: err.message });
  }
};

exports.desativarFornecedor = async (req, res) => {
  try {
    const [[fornecedor]] = await pool.query("SELECT nome FROM compras_fornecedores WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    await pool.query("UPDATE compras_fornecedores SET ativo = FALSE WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    await registrar(req.tenant_id, req.user, "desativar_fornecedor", "compras_fornecedor", req.params.id, fornecedor ? `Desativou fornecedor "${fornecedor.nome}"` : "Desativou fornecedor");
    res.json({ message: "Fornecedor desativado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desativar fornecedor", details: err.message });
  }
};

// ── Pedidos de Compra ──
exports.listarPedidos = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT p.*, f.nome AS fornecedor_nome FROM compras_pedidos p
               JOIN compras_fornecedores f ON f.id = p.fornecedor_id WHERE p.tenant_id = ?`;
    const params = [req.tenant_id];
    if (status) { sql += " AND p.status = ?"; params.push(status); }
    sql += " ORDER BY p.created_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar pedidos de compra", details: err.message });
  }
};

exports.buscarPedido = async (req, res) => {
  try {
    const [[pedido]] = await pool.query(
      `SELECT p.*, f.nome AS fornecedor_nome, f.contato AS fornecedor_contato FROM compras_pedidos p
       JOIN compras_fornecedores f ON f.id = p.fornecedor_id WHERE p.id = ? AND p.tenant_id = ?`,
      [req.params.id, req.tenant_id]
    );
    if (!pedido) return res.status(404).json({ error: "Pedido nao encontrado" });

    const [itens] = await pool.query(
      `SELECT i.*, pr.nome AS produto_nome, pr.sku FROM compras_itens i
       JOIN products pr ON pr.id = i.product_id WHERE i.pedido_id = ?`,
      [pedido.id]
    );

    res.json({ ...pedido, itens });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar pedido", details: err.message });
  }
};

exports.criarPedido = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { fornecedor_id, data_prevista, observacoes, itens } = req.body;
    if (!fornecedor_id) { conn.release(); return res.status(400).json({ error: "fornecedor_id e obrigatorio" }); }
    if (!Array.isArray(itens) || itens.length === 0) { conn.release(); return res.status(400).json({ error: "informe ao menos um item" }); }

    const [[fornecedor]] = await conn.query("SELECT id FROM compras_fornecedores WHERE id = ? AND tenant_id = ?", [fornecedor_id, req.tenant_id]);
    if (!fornecedor) { conn.release(); return res.status(400).json({ error: "fornecedor_id invalido para este tenant" }); }

    let valorTotal = 0;
    for (const item of itens) {
      if (!item.product_id || !item.quantidade || item.preco_unitario == null) {
        conn.release();
        return res.status(400).json({ error: "cada item precisa de product_id, quantidade e preco_unitario" });
      }
      valorTotal += item.quantidade * item.preco_unitario;
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      "INSERT INTO compras_pedidos (tenant_id, fornecedor_id, data_prevista, observacoes, valor_total, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [req.tenant_id, fornecedor_id, data_prevista || null, observacoes || null, valorTotal, req.user?.id || null]
    );
    const pedidoId = result.insertId;

    for (const item of itens) {
      const [[produto]] = await conn.query("SELECT id FROM products WHERE id = ? AND tenant_id = ?", [item.product_id, req.tenant_id]);
      if (!produto) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: `product_id ${item.product_id} invalido para este tenant` });
      }
      await conn.query(
        "INSERT INTO compras_itens (pedido_id, product_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)",
        [pedidoId, item.product_id, item.quantidade, item.preco_unitario]
      );
    }

    await conn.commit();
    conn.release();

    await registrar(req.tenant_id, req.user, "criar_pedido_compra", "compras_pedido", pedidoId, `Criou pedido de compra no valor de R$ ${valorTotal.toFixed(2)}`);

    res.status(201).json({ id: pedidoId, valor_total: valorTotal });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: "Erro ao criar pedido de compra", details: err.message });
  }
};

exports.mudarStatusPedido = async (req, res) => {
  try {
    const { status } = req.body;
    const validos = ["rascunho", "enviado", "confirmado", "parcialmente_recebido", "recebido", "cancelado"];
    if (!validos.includes(status)) return res.status(400).json({ error: `status deve ser um de: ${validos.join(", ")}` });

    const [[pedido]] = await pool.query("SELECT status FROM compras_pedidos WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!pedido) return res.status(404).json({ error: "Pedido nao encontrado" });

    await pool.query("UPDATE compras_pedidos SET status = ? WHERE id = ? AND tenant_id = ?", [status, req.params.id, req.tenant_id]);
    await registrar(req.tenant_id, req.user, "mudar_status_pedido_compra", "compras_pedido", req.params.id, `Status: ${pedido.status} -> ${status}`);

    res.json({ message: "Status atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao mudar status", details: err.message });
  }
};