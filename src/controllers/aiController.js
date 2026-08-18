// src/controllers/aiController.js
const aiService = require("../services/ai/AIService");

exports.chat = async (req, res) => {
  try {
    const { mensagens } = req.body;
    if (!Array.isArray(mensagens) || mensagens.length === 0) {
      return res.status(400).json({ error: "mensagens (array) e obrigatorio" });
    }

    const resposta = await aiService.chat(req.tenant_id, req.user?.role, mensagens);
    res.json(resposta);
  } catch (err) {
    console.error("[AI] Erro no chat:", err.message);
    res.status(500).json({ error: "Erro ao processar mensagem com IA", details: err.message });
  }
};