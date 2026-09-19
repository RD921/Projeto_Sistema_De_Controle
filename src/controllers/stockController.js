const pool = require("../config/db");
const eventDispatcher = require("../automation/engine/EventDispatcher");
const { registrar } = require("../services/auditoriaService");

const LIMITE_ESTOQUE_BAIXO = 10;

// Ajusta o estoque de um produto de forma rastreavel: registra a movimentacao,
// atualiza o saldo, e dispara eventos reais (stock_movement sempre, STOCK_LOW
// quando cruzar o limiar - reaproveitando o evento que ja existe no e-commerce).
exports.ajustar = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { tipo, quantidade, motivo } = req.body;

    if (!["entrada", "saida", "ajuste"].includes(tipo)) {
      conn.release();
      return res.status(400).json({ error: "tipo deve ser entrada, saida ou ajuste" });
    }

    // "ajuste" define o valor absoluto final do estoque, entao zero e um valor
    // legitimo (ex: correcao de inventario, produto zerado). Ja "entrada" e
    // "saida" representam uma variacao, entao precisam ser estritamente positivas.
    const quantidadeValida = tipo === "ajuste"
      ? (typeof quantidade === "number" && quantidade >= 0)
      : (typeof quantidade === "number" && quantidade > 0);

    if (!quantidadeValida) {
      conn.release();
      return res.status(400).json({
        error: tipo === "ajuste"
          ? "quantidade deve ser zero ou um numero positivo"
          : "quantidade deve ser um numero positivo",
      });
    }

    await conn.beginTransaction();

    const [[produto]] = await conn.query(
      "SELECT id, nome, estoque FROM products WHERE id = ? AND tenant_id = ? FOR UPDATE",
      [id, req.tenant_id]
    );
    if (!produto) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: "Produto nao encontrado" });
    }

    const estoqueAnterior = produto.estoque;
    let estoqueNovo;
    if (tipo === "entrada") estoqueNovo = estoqueAnterior + quantidade;
    else if (tipo === "saida") estoqueNovo = estoqueAnterior - quantidade;
    else estoqueNovo = quantidade;

    if (estoqueNovo < 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: `Estoque insuficiente (atual: ${estoqueAnterior}, tentativa de saida: ${quantidade})` });
    }

    await conn.query("UPDATE products SET estoque = ? WHERE id = ?", [estoqueNovo, id]);
    await conn.query(
      "INSERT INTO stock_movements (tenant_id, product_id, tipo, quantidade, estoque_anterior, estoque_novo, motivo, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [req.tenant_id, id, tipo, quantidade, estoqueAnterior, estoqueNovo, motivo || null, req.user?.id || null]
    );

        await conn.commit();
    conn.release();

    try {
      await eventDispatcher.dispatch("stock_movement", req.tenant_id, {
        product_id: Number(id), nome: produto.nome, tipo, quantidade, estoque_anterior: estoqueAnterior, estoque_novo: estoqueNovo,
      });
    } catch { /* nao bloqueia o ajuste por erro de automacao */ }

    try {
      await registrar(req.tenant_id, req.user, "ajustar_estoque", "product", id,
        `${tipo} de ${quantidade} em "${produto.nome}" (${estoqueAnterior} -> ${estoqueNovo})${motivo ? `. Motivo: ${motivo}` : ""}`);
    } catch { /* nao bloqueia o ajuste por erro de auditoria */ }

    if (estoqueAnterior > LIMITE_ESTOQUE_BAIXO && estoqueNovo <= LIMITE_ESTOQUE_BAIXO) {
      try {
        await eventDispatcher.dispatch("STOCK_LOW", req.tenant_id, { id: Number(id), nome: produto.nome, estoque: estoqueNovo });
      } catch { /* nao bloqueia */ }
    }

    res.json({ message: "Estoque ajustado", estoque_anterior: estoqueAnterior, estoque_novo: estoqueNovo });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: "Erro ao ajustar estoque", details: err.message });
  }
};

exports.historico = async (req, res) => {
  try {
    const { id } = req.params;
    const [[produto]] = await pool.query("SELECT id FROM products WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (!produto) return res.status(404).json({ error: "Produto nao encontrado" });

    const [rows] = await pool.query(
      "SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC LIMIT 50",
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar historico", details: err.message });
  }
};

exports.produtosComEstoqueBaixo = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nome, sku, estoque FROM products WHERE tenant_id = ? AND ativo = TRUE AND estoque <= ? ORDER BY estoque ASC",
      [req.tenant_id, LIMITE_ESTOQUE_BAIXO]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar produtos com estoque baixo", details: err.message });
  }
};