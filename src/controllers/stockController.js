const pool = require("../config/db");
const eventDispatcher = require("../automation/engine/EventDispatcher");
const { registrar } = require("../services/auditoriaService");
const { ajustarEstoque } = require("../services/estoqueService");

const LIMITE_ESTOQUE_BAIXO = 10;

exports.ajustar = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo, quantidade, motivo } = req.body;

    const quantidadeValida = tipo === "ajuste"
      ? (typeof quantidade === "number" && quantidade >= 0)
      : (typeof quantidade === "number" && quantidade > 0);

    if (!quantidadeValida) {
      return res.status(400).json({
        error: tipo === "ajuste" ? "quantidade deve ser zero ou um numero positivo" : "quantidade deve ser um numero positivo",
      });
    }

    const resultado = await ajustarEstoque({ tenantId: req.tenant_id, userId: req.user?.id, productId: Number(id), tipo, quantidade, motivo });

    try {
      await registrar(req.tenant_id, req.user, "ajustar_estoque", "product", id, `${tipo} de ${quantidade} (${resultado.estoque_anterior} -> ${resultado.estoque_novo})${motivo ? `. Motivo: ${motivo}` : ""}`);
    } catch {}

    res.json({ message: "Estoque ajustado", ...resultado });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.status ? err.message : "Erro ao ajustar estoque", details: err.status ? undefined : err.message });
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
