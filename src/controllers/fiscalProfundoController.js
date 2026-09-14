const fiscalProfundoService = require("../services/fiscalProfundoService");

exports.calcular = async (req, res) => {
  try {
    const { competencia } = req.query;
    if (!competencia) return res.status(400).json({ error: "Informe a competência (AAAA-MM)." });
    const resultado = await fiscalProfundoService.calcular(req.tenant_id, competencia);
    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao calcular impostos." });
  }
};

exports.buscarCalculo = async (req, res) => {
  try {
    const { competencia } = req.query;
    const calculo = await fiscalProfundoService.buscarCalculo(req.tenant_id, competencia);
    if (calculo && typeof calculo.detalhes === "string") calculo.detalhes = JSON.parse(calculo.detalhes);
    res.json(calculo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar cálculo." });
  }
};

exports.historico = async (req, res) => {
  try {
    const historico = await fiscalProfundoService.listarHistorico(req.tenant_id);
    res.json(historico.map(h => ({ ...h, detalhes: typeof h.detalhes === "string" ? JSON.parse(h.detalhes) : h.detalhes })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar histórico." });
  }
};

exports.gerarGuia = async (req, res) => {
  try {
    const { competencia, cost_center_id } = req.body;
    if (!competencia || !cost_center_id) return res.status(400).json({ error: "Informe competência e centro de custo." });
    const resultado = await fiscalProfundoService.gerarGuia(req.tenant_id, competencia, cost_center_id);
    res.json({ message: "Guia gerada com sucesso e adicionada em Contas a Pagar.", ...resultado });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Erro ao gerar guia." });
  }
};