const service = require("../services/contractsService");

exports.listar = async (req, res) => {
  try {
    const { tipo, status } = req.query;
    const dados = await service.listar(req.tenant_id, { tipo, status });
    res.json(dados);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar contratos." });
  }
};

exports.buscarPorId = async (req, res) => {
  try {
    const contrato = await service.buscarPorId(req.tenant_id, req.params.id);
    if (!contrato) return res.status(404).json({ error: "Contrato não encontrado." });
    res.json(contrato);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar contrato." });
  }
};

exports.criar = async (req, res) => {
  try {
    const { tipo, nome_contraparte, descricao, cost_center_id, valor, data_inicio } = req.body;
    if (!tipo || !nome_contraparte || !descricao || !cost_center_id || !valor || !data_inicio) {
      return res.status(400).json({ error: "Preencha tipo, contraparte, descrição, centro de custo, valor e data de início." });
    }
    const contrato = await service.criar(req.tenant_id, req.body);
    res.status(201).json(contrato);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar contrato." });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const contrato = await service.atualizar(req.tenant_id, req.params.id, req.body);
    if (!contrato) return res.status(404).json({ error: "Contrato não encontrado." });
    res.json(contrato);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar contrato." });
  }
};

exports.mudarStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["ativo", "suspenso", "encerrado"].includes(status)) {
      return res.status(400).json({ error: "Status inválido." });
    }
    const contrato = await service.mudarStatus(req.tenant_id, req.params.id, status);
    res.json(contrato);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar status." });
  }
};

exports.excluir = async (req, res) => {
  try {
    await service.excluir(req.tenant_id, req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir contrato." });
  }
};

exports.vencimentosProximos = async (req, res) => {
  try {
    const dados = await service.vencimentosProximos(req.tenant_id);
    res.json(dados);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar vencimentos." });
  }
};

exports.gerarLancamentos = async (req, res) => {
  try {
    const { competencia } = req.body;
    if (!competencia) return res.status(400).json({ error: "Informe a competência." });
    const resultado = await service.gerarLancamentosPendentes(req.tenant_id, competencia);
    res.json({ message: `${resultado.gerados} lançamento(s) gerado(s) a partir de contratos.`, ...resultado });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar lançamentos." });
  }
};