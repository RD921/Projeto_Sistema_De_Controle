const service = require("../services/scenarioService");

const TIPOS_VALIDOS = ["variacao_percentual", "contratar_demitir", "novo_contrato", "livre"];

exports.simular = async (req, res) => {
  try {
    const { tipo, parametros, meses_projecao } = req.body;
    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: "Tipo de cenário inválido." });
    }
    if (!parametros) {
      return res.status(400).json({ error: "Parâmetros do cenário são obrigatórios." });
    }
    const resultado = await service.simular(req.tenant_id, { tipo, parametros, meses_projecao });
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao simular cenário.", details: err.message });
  }
};

exports.listar = async (req, res) => {
  try {
    const cenarios = await service.listar(req.tenant_id);
    res.json(cenarios);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar cenários." });
  }
};

exports.salvar = async (req, res) => {
  try {
    const { nome, tipo, parametros, meses_projecao } = req.body;
    if (!nome || !TIPOS_VALIDOS.includes(tipo) || !parametros) {
      return res.status(400).json({ error: "Preencha nome, tipo e parâmetros válidos." });
    }
    const cenario = await service.salvar(req.tenant_id, { nome, tipo, parametros, meses_projecao });
    res.status(201).json(cenario);
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar cenário." });
  }
};

exports.buscarPorId = async (req, res) => {
  try {
    const cenario = await service.buscarPorId(req.tenant_id, req.params.id);
    if (!cenario) return res.status(404).json({ error: "Cenário não encontrado." });
    res.json(cenario);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar cenário." });
  }
};

exports.excluir = async (req, res) => {
  try {
    await service.excluir(req.tenant_id, req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir cenário." });
  }
};