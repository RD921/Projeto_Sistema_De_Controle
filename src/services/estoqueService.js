const pool = require("../config/db");
const eventDispatcher = require("../automation/engine/EventDispatcher");

const LIMITE_ESTOQUE_BAIXO = 10;

// Logica de ajuste de estoque extraida do stockController.ajustar, para ser
// reaproveitada tambem pelo Recebimento de Compras (e qualquer outro modulo
// futuro que precise mexer no estoque de forma rastreavel).
async function ajustarEstoque({ tenantId, userId, productId, tipo, quantidade, motivo }) {
  const conn = await pool.getConnection();
  try {
    if (!["entrada", "saida", "ajuste"].includes(tipo)) {
      throw new Error("tipo deve ser entrada, saida ou ajuste");
    }

    await conn.beginTransaction();

    const [[produto]] = await conn.query(
      "SELECT id, nome, estoque FROM products WHERE id = ? AND tenant_id = ? FOR UPDATE",
      [productId, tenantId]
    );
    if (!produto) {
      await conn.rollback();
      throw Object.assign(new Error("Produto nao encontrado"), { status: 404 });
    }

    const estoqueAnterior = produto.estoque;
    let estoqueNovo;
    if (tipo === "entrada") estoqueNovo = estoqueAnterior + quantidade;
    else if (tipo === "saida") estoqueNovo = estoqueAnterior - quantidade;
    else estoqueNovo = quantidade;

    if (estoqueNovo < 0) {
      await conn.rollback();
      throw Object.assign(new Error(`Estoque insuficiente (atual: ${estoqueAnterior})`), { status: 400 });
    }

    await conn.query("UPDATE products SET estoque = ? WHERE id = ?", [estoqueNovo, productId]);
    await conn.query(
      "INSERT INTO stock_movements (tenant_id, product_id, tipo, quantidade, estoque_anterior, estoque_novo, motivo, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [tenantId, productId, tipo, quantidade, estoqueAnterior, estoqueNovo, motivo || null, userId || null]
    );

    await conn.commit();
    conn.release();

    try {
      await eventDispatcher.dispatch("stock_movement", tenantId, {
        product_id: productId, nome: produto.nome, tipo, quantidade, estoque_anterior: estoqueAnterior, estoque_novo: estoqueNovo,
      });
    } catch {}

    if (estoqueAnterior > LIMITE_ESTOQUE_BAIXO && estoqueNovo <= LIMITE_ESTOQUE_BAIXO) {
      try { await eventDispatcher.dispatch("STOCK_LOW", tenantId, { id: productId, nome: produto.nome, estoque: estoqueNovo }); } catch {}
    }

    return { estoque_anterior: estoqueAnterior, estoque_novo: estoqueNovo };
  } catch (err) {
    try { await conn.rollback(); } catch {}
    conn.release();
    throw err;
  }
}

module.exports = { ajustarEstoque };