const service = require("../services/cardsService");

exports.listarCartoes = async (req, res) => {
  try {
    const cartoes = await service.listarCartoes(req.tenant_id);
    res.json(cartoes);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar cartões." });
  }
};

exports.buscarCartao = async (req, res) => {
  try {
    const cartao = await service.buscarCartao(req.tenant_id, req.params.id);
    if (!cartao) return res.status(404).json({ error: "Cartão não encontrado." });
    res.json(cartao);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar cartão." });
  }
};

exports.criarCartao = async (req, res) => {
  try {
    const { nome, limite, cost_center_id } = req.body;
    if (!nome || !limite || !cost_center_id) {
      return res.status(400).json({ error: "Preencha nome, limite e centro de custo." });
    }
    const cartao = await service.criarCartao(req.tenant_id, req.body);
    res.status(201).json(cartao);
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar cartão." });
  }
};

exports.atualizarCartao = async (req, res) => {
  try {
    const cartao = await service.atualizarCartao(req.tenant_id, req.params.id, req.body);
    if (!cartao) return res.status(404).json({ error: "Cartão não encontrado." });
    res.json(cartao);
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar cartão." });
  }
};

exports.desativarCartao = async (req, res) => {
  try {
    await service.desativarCartao(req.tenant_id, req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao desativar cartão." });
  }
};

exports.lancarTransacao = async (req, res) => {
  try {
    const { card_id, data, descricao, valor } = req.body;
    if (!card_id || !data || !descricao || !valor) {
      return res.status(400).json({ error: "Preencha cartão, data, descrição e valor." });
    }
    const transacao = await service.lancarTransacao(req.tenant_id, req.body);
    res.status(201).json(transacao);
  } catch (err) {
    res.status(400).json({ error: err.message || "Erro ao lançar transação." });
  }
};

exports.excluirTransacao = async (req, res) => {
  try {
    await service.excluirTransacao(req.tenant_id, req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir transação." });
  }
};

exports.listarTransacoes = async (req, res) => {
  try {
    const { card_id, competencia } = req.query;
    if (!card_id || !competencia) return res.status(400).json({ error: "Informe cartão e competência." });
    const transacoes = await service.listarTransacoes(req.tenant_id, card_id, competencia);
    res.json(transacoes);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar transações." });
  }
};

exports.listarFaturas = async (req, res) => {
  try {
    const faturas = await service.listarFaturas(req.tenant_id, req.params.cardId);
    res.json(faturas);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar faturas." });
  }
};

exports.fecharFatura = async (req, res) => {
  try {
    const { card_id, competencia } = req.body;
    if (!card_id || !competencia) return res.status(400).json({ error: "Informe cartão e competência." });
    const fatura = await service.fecharFatura(req.tenant_id, card_id, competencia);
    res.json({ message: "Fatura fechada e lançada em Contas a Pagar.", fatura });
  } catch (err) {
    res.status(400).json({ error: err.message || "Erro ao fechar fatura." });
  }
};

exports.limiteDisponivel = async (req, res) => {
  try {
    const dados = await service.limiteDisponivel(req.tenant_id, req.params.id);
    if (!dados) return res.status(404).json({ error: "Cartão não encontrado." });
    res.json(dados);
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular limite." });
  }
};