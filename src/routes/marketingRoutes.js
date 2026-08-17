const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const gemini = require("../services/geminiService");
const pool = require("../config/db");

router.post("/copy", auth, async (req, res) => {
  try {
    const { produto, publico, canal } = req.body;
    if (!produto || !publico || !canal)
      return res.status(400).json({ error: "produto, publico e canal são obrigatórios" });
    const copy = await gemini.gerarCopyMarketing(produto, publico, canal);
    res.json({ copy });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar copy", details: err.message });
  }
});

router.get("/prever/:id", auth, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM customers WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (rows.length === 0) return res.status(404).json({ error: "Cliente não encontrado" });
    const previsao = await gemini.preverVenda(rows[0]);
    res.json(previsao);
  } catch (err) {
    res.status(500).json({ error: "Erro ao prever venda", details: err.message });
  }
});

router.post("/scripts", auth, async (req, res) => {
  try {
    const { persona, produto } = req.body;
    if (!persona || !produto)
      return res.status(400).json({ error: "persona e produto são obrigatórios" });
    const scripts = await gemini.gerarScriptAbordagem(persona, produto);
    res.json({ scripts });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar scripts", details: err.message });
  }
});

router.get("/lead-scoring", auth, async (req, res) => {
  try {
    const [clientes] = await pool.query(
      "SELECT id, nome, email, telefone FROM customers WHERE tenant_id = ? LIMIT 20",
      [req.tenant_id]
    );
    if (clientes.length === 0) return res.json([]);
    const scores = await gemini.analisarLeadScore(clientes);
    const resultado = clientes.map(c => {
      const score = scores.find(s => s.id === c.id) || { score: 50, temperatura: "morno", proxima_acao: "Fazer contato" };
      return { ...c, ...score };
    });
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular lead scoring", details: err.message });
  }
});

router.post("/chat", auth, async (req, res) => {
  try {
    const { mensagens } = req.body;
    if (!mensagens || mensagens.length === 0)
      return res.status(400).json({ error: "Mensagens são obrigatórias" });
    const resposta = await gemini.chat(mensagens);
    res.json({ resposta });
  } catch (err) {
    console.error("[CHAT ERROR]", err.message);
    res.status(500).json({ error: "Erro no chat", details: err.message });
  }
});

module.exports = router;