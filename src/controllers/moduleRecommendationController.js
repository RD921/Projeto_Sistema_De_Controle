const { recomendarModulos } = require("../moduleRecommendationEngine");

async function recomendarModulosController(req, res) {
  try {
    const respostas = req.body;

    const camposObrigatorios = [
      "segmento",
      "canais",
      "sistemaGestao",
      "areasDesejadas",
      "tamanhoOperacao",
      "objetivo",
    ];
    const faltando = camposObrigatorios.filter((campo) => respostas[campo] === undefined);
    if (faltando.length > 0) {
      return res.status(400).json({
        erro: `Campos obrigatórios faltando: ${faltando.join(", ")}`,
      });
    }

    const recomendacoes = recomendarModulos({ respostas });

    return res.json({ recomendacoes });
  } catch (err) {
    console.error("Erro ao gerar recomendação de módulos:", err);
    return res.status(500).json({ erro: "Não foi possível gerar a recomendação de módulos." });
  }
}

module.exports = { recomendarModulosController };
