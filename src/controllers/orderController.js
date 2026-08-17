const pool = require("../config/db");
const eventDispatcher = require("../automation/engine/EventDispatcher");

exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const tid = req.tenant_id;
    const [[countRows], [rows]] = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM orders WHERE tenant_id = ?", [tid]),
      pool.query(
        `SELECT o.id, o.total, o.status, o.created_at,
                c.nome as cliente, c.email as cliente_email
         FROM orders o
         JOIN customers c ON c.id = o.customer_id
         WHERE o.tenant_id = ?
         ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
        [tid, limit, offset]
      )
    ]);
    res.json({ data: rows, page, limit, total: countRows[0].total });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar pedidos", details: err.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.total, o.status, o.observacao, o.created_at,
              c.nome as cliente, c.email as cliente_email
       FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.id = ? AND o.tenant_id = ?`,
      [req.params.id, req.tenant_id]
    );
    if (orders.length === 0) return res.status(404).json({ error: "Pedido nao encontrado" });
    const [items] = await pool.query(
      `SELECT oi.quantidade, oi.preco_unitario,
              p.nome as produto, p.sku
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [req.params.id]
    );
    res.json({ ...orders[0], items });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar pedido", details: err.message });
  }
};

exports.createOrder = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { customer_id, items, observacao } = req.body || {};
    if (!customer_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "customer_id e items sao obrigatorios" });
    }
    await conn.beginTransaction();
    const [orderResult] = await conn.query(
      "INSERT INTO orders (customer_id, total, observacao, tenant_id) VALUES (?, 0, ?, ?)",
      [customer_id, observacao || null, req.tenant_id]
    );
    const orderId = orderResult.insertId;
    let total = 0;
    let estoqueBaixoDetectado = [];
    for (const item of items) {
      if (!item.product_id || !item.quantidade) {
        throw new Error("Cada item precisa de product_id e quantidade");
      }
      const [products] = await conn.query(
        "SELECT id, nome, preco, estoque FROM products WHERE id = ? AND tenant_id = ? AND ativo = TRUE",
        [item.product_id, req.tenant_id]
      );
      if (products.length === 0) throw new Error(`Produto ID ${item.product_id} nao encontrado`);
      const product = products[0];
      if (product.estoque < item.quantidade) {
        throw new Error(`Estoque insuficiente para produto ID ${item.product_id}`);
      }
      const subtotal = product.preco * item.quantidade;
      total += subtotal;
      await conn.query(
        "INSERT INTO order_items (order_id, product_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)",
        [orderId, item.product_id, item.quantidade, product.preco]
      );
      const novoEstoque = product.estoque - item.quantidade;
      await conn.query(
        "UPDATE products SET estoque = estoque - ? WHERE id = ? AND tenant_id = ?",
        [item.quantidade, item.product_id, req.tenant_id]
      );
      if (novoEstoque <= 10) {
        estoqueBaixoDetectado.push({ product_id: product.id, nome: product.nome, estoque: novoEstoque });
      }
    }
    await conn.query("UPDATE orders SET total = ? WHERE id = ?", [total, orderId]);
    await conn.commit();

    // Dispara os eventos para o Automation Engine (nao bloqueia a resposta ao usuario)
    eventDispatcher.dispatch("ORDER_CREATED", req.tenant_id, {
      orderId, customer_id, total, items
    }).catch(err => console.error("[EVENT] Falha ao disparar ORDER_CREATED:", err.message));

    for (const p of estoqueBaixoDetectado) {
      eventDispatcher.dispatch("STOCK_LOW", req.tenant_id, p)
        .catch(err => console.error("[EVENT] Falha ao disparar STOCK_LOW:", err.message));
    }

    res.status(201).json({ message: "Pedido criado com sucesso", orderId, total });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: "Erro ao criar pedido", details: err.message });
  } finally {
    conn.release();
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    const validos = ["pendente", "pago", "cancelado", "enviado", "finalizado"];
    if (!status || !validos.includes(status)) {
      return res.status(400).json({ error: `Status invalido. Use: ${validos.join(", ")}` });
    }
    const [existing] = await pool.query("SELECT id FROM orders WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (existing.length === 0) return res.status(404).json({ error: "Pedido nao encontrado" });
    await pool.query("UPDATE orders SET status = ? WHERE id = ? AND tenant_id = ?", [status, req.params.id, req.tenant_id]);

    if (status === "pago") {
      const eventDispatcher = require("../automation/engine/EventDispatcher");
      eventDispatcher.dispatch("ORDER_PAID", req.tenant_id, { orderId: req.params.id })
        .catch(err => console.error("[EVENT] Falha ao disparar ORDER_PAID:", err.message));
    }

    res.json({ message: "Status atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar status", details: err.message });
  }
};
