const { avaliarFechamento } = require("../services/fechamentoService");

exports.checklist = async (req, res) => {
  try {
    const { competencia } = req.query;
    if (!competencia) return res.status(400).json({ error: "competencia é obrigatória (formato AAAA-MM)" });

    const resultado = await avaliarFechamento(req.tenant_id, competencia);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao avaliar fechamento", details: err.message });
  }
};