const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const audit = require("../services/auditService");

const EXPIRACAO_MINUTOS = 30;

async function buscarAcao(id, tenantId) {
  const [[acao]] = await pool.query("SELECT * FROM aria_acoes WHERE id = ? AND tenant_id = ?", [id, tenantId]);
  return acao;
}

exports.confirmarAcao = async (req, res) => {
  try {
    const { pin } = req.body || {};
    if (!pin) return res.status(400).json({ error: "PIN é obrigatório." });

    const acao = await buscarAcao(req.params.id, req.tenant_id);
    if (!acao) return res.status(404).json({ error: "Ação não encontrada." });
    if (acao.status !== "pendente") {
      return res.status(409).json({ error: "Esta ação já foi processada anteriormente." });
    }

    const minutosDesdeCriacao = (Date.now() - new Date(acao.created_at).getTime()) / 60000;
    if (minutosDesdeCriacao > EXPIRACAO_MINUTOS) {
      await pool.query("UPDATE aria_acoes SET status = 'expirada' WHERE id = ?", [acao.id]);
      return res.status(410).json({ error: "Esta proposta expirou. Peça para a Aria gerar a proposta novamente." });
    }

    const [[usuario]] = await pool.query("SELECT id, nome, aria_pin_hash FROM users WHERE id = ? AND tenant_id = ?", [req.user.id, req.tenant_id]);
    if (!usuario?.aria_pin_hash) {
      return res.status(400).json({ error: "Você ainda não configurou um PIN de autorização. Configure em Configurações > IA." });
    }

    const pinValido = await bcrypt.compare(String(pin), usuario.aria_pin_hash);
    if (!pinValido) {
      return res.status(401).json({ error: "PIN incorreto." });
    }

    const parametros = typeof acao.parametros === "string" ? JSON.parse(acao.parametros) : acao.parametros;
    let resultado;

    switch (acao.tipo) {
      case "lancamento_financeiro":
        resultado = await executarLancamentoFinanceiro(parametros, req.tenant_id);
        break;
      case "emissao_nota_fiscal":
        resultado = await executarEmissaoNotaFiscal(parametros, req.tenant_id);
        break;
      case "criacao_automacao":
        resultado = await executarCriacaoAutomacao(parametros, req.tenant_id);
        break;
      default:
        return res.status(400).json({ error: `Tipo de ação desconhecido: ${acao.tipo}` });
    }

    await pool.query(
      "UPDATE aria_acoes SET status = 'confirmada', resultado = ?, confirmed_at = NOW() WHERE id = ?",
      [JSON.stringify(resultado), acao.id]
    );

    try {
      await audit.registrar({
        tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: usuario.nome,
        acao: `Confirmou ação da Aria: ${acao.resumo}`, origem: "Assistente Aria",
        valorNovo: JSON.stringify(resultado),
      });
    } catch { /* auditoria nao deve travar a execucao */ }

    res.json({ status: "confirmada", resultado });
  } catch (err) {
    res.status(500).json({ error: "Erro ao confirmar ação.", details: err.message });
  }
};

exports.negarAcao = async (req, res) => {
  try {
    const acao = await buscarAcao(req.params.id, req.tenant_id);
    if (!acao) return res.status(404).json({ error: "Ação não encontrada." });
    if (acao.status !== "pendente") {
      return res.status(409).json({ error: "Esta ação já foi processada anteriormente." });
    }
    await pool.query("UPDATE aria_acoes SET status = 'negada', confirmed_at = NOW() WHERE id = ?", [acao.id]);

    try {
      const [[usuario]] = await pool.query("SELECT nome FROM users WHERE id = ?", [req.user.id]);
      await audit.registrar({
        tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: usuario?.nome,
        acao: `Negou ação proposta pela Aria: ${acao.resumo}`, origem: "Assistente Aria",
      });
    } catch {}

    res.json({ status: "negada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao negar ação.", details: err.message });
  }
};

exports.definirPin = async (req, res) => {
  try {
    const { senha_atual, novo_pin } = req.body || {};
    if (!novo_pin) {
      return res.status(400).json({ error: "Novo PIN é obrigatório." });
    }
    if (!/^\d{4,6}$/.test(novo_pin)) {
      return res.status(400).json({ error: "O PIN deve ter entre 4 e 6 dígitos numéricos." });
    }

    const [[usuario]] = await pool.query("SELECT id, senha, nome, aria_pin_hash FROM users WHERE id = ? AND tenant_id = ?", [req.user.id, req.tenant_id]);
    if (!usuario) return res.status(404).json({ error: "Usuário não encontrado." });

    // Se o usuário já tem um PIN configurado, isso é uma TROCA e exige a senha
    // da conta para confirmar identidade. Se ainda não tem (primeira configuração,
    // normalmente feita durante o onboarding logo após o cadastro), não exige.
    if (usuario.aria_pin_hash) {
      if (!senha_atual) {
        return res.status(400).json({ error: "Senha atual é obrigatória para trocar o PIN." });
      }
      const senhaValida = await bcrypt.compare(senha_atual, usuario.senha);
      if (!senhaValida) return res.status(401).json({ error: "Senha atual incorreta." });
    }

    const hash = await bcrypt.hash(novo_pin, 10);
    await pool.query("UPDATE users SET aria_pin_hash = ? WHERE id = ?", [hash, usuario.id]);

    try {
      await audit.registrar({
        tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: usuario.nome,
        acao: usuario.aria_pin_hash ? "Alterou o PIN de autorização da Aria" : "Definiu o PIN de autorização da Aria",
        origem: usuario.aria_pin_hash ? "Configurações > IA" : "Onboarding",
      });
    } catch {}

    res.json({ message: "PIN definido com sucesso." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao definir PIN.", details: err.message });
  }
};

// --- Execução real das ações confirmadas ---
// Estes três blocos são o ponto de integração com os módulos que já existem
// (Financeiro, Fiscal e Automações). Ainda não tenho os services reais deles
// nesta conversa, então marquei com TODO onde a função de cada módulo entra,
// para eu não arriscar quebrar uma tabela com colunas que não conheço.

async function executarLancamentoFinanceiro(parametros, tenantId) {
  const { tipo, descricao, valor, data_vencimento, categoria } = parametros;
  // TODO: trocar por uma chamada ao service/controller real que já cria
  // lançamentos em Contas a Pagar/Receber, para garantir que todas as colunas
  // obrigatórias de financial_entries sejam preenchidas (forma de pagamento,
  // conta bancária, centro de custo etc.). Me manda esse arquivo que eu conecto.
  const [result] = await pool.query(
    `INSERT INTO financial_entries (tenant_id, tipo, descricao, valor, categoria, data_vencimento, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pendente')`,
    [tenantId, tipo, descricao, valor, categoria || null, data_vencimento]
  );
  return { financial_entry_id: result.insertId, mensagem: "Lançamento criado. Confira em Financeiro se campos como forma de pagamento/conta/centro de custo precisam de complemento." };
}

async function executarEmissaoNotaFiscal(parametros, tenantId) {
  const { pedido_id } = parametros;
  // TODO: plugar aqui a função real de emissão do módulo Fiscal.
  const [[pedido]] = await pool.query("SELECT id, status FROM orders WHERE id = ? AND tenant_id = ?", [pedido_id, tenantId]);
  if (!pedido) throw new Error(`Pedido ${pedido_id} não encontrado no momento da confirmação.`);
  return {
    pedido_id: pedido.id,
    status: "aguardando_integracao_fiscal",
    mensagem: "Confirmação registrada. A emissão automática ainda depende de conectar esta ação ao módulo Fiscal — por enquanto, emita manualmente em Financeiro > Notas Fiscais.",
  };
}

async function executarCriacaoAutomacao(parametros, tenantId) {
  const { nome, gatilho, acao_desejada } = parametros;
  // TODO: plugar aqui a função real de criação de automação (tabela `automations`
  // existe, mas não conheço a estrutura de gatilho/ação em JSON ainda).
  return {
    status: "aguardando_integracao_automacoes",
    nome, gatilho, acao_desejada,
    mensagem: "Confirmação registrada. A criação automática ainda depende de conectar esta ação ao motor de Automações — por enquanto, crie manualmente em Automações > Minhas Automações usando esses dados como referência.",
  };
}