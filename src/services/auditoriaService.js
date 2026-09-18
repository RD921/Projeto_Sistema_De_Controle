const pool = require("../config/db");
const auditService = require("./auditService");

// Este servico existia paralelo ao auditService.js (usado por Configuracoes/Logistica/SAC),
// gravando numa tabela audit_logs separada que a tela de Auditoria nunca chegava a mostrar.
// Unificado aqui: mesma assinatura de chamada (compatibilidade com quem ja usa: financeiro,
// contabilidade, tesouraria), mas agora grava na tabela audit_log central, visivel na tela.
async function registrar(tenantId, user, acao, entidadeTipo, entidadeId, detalhes) {
  let nomeUsuario = user?.email || null;
  try {
    if (user?.id) {
      const [[u]] = await pool.query("SELECT nome FROM users WHERE id = ?", [user.id]);
      if (u?.nome) nomeUsuario = u.nome;
    }
  } catch { /* mantem o fallback do email se a busca falhar */ }

    // Origem deduzida a partir do tipo de entidade, ja que este servico e
  // compartilhado por varios modulos (Financeiro, CRM, Contabilidade, Tesouraria).
  const mapaOrigem = {
    financial_entry: "Financeiro",
    company_fiscal_data: "Financeiro",
    crm_deal: "CRM",
    crm_interaction: "CRM",
    crm_task: "CRM",
  };
  const origem = mapaOrigem[entidadeTipo] || "Financeiro";

  await auditService.registrar({
    tenantId,
    usuarioId: user?.id || null,
    usuarioNome: nomeUsuario,
    acao: `${acao}${entidadeTipo ? ` (${entidadeTipo}${entidadeId ? ` #${entidadeId}` : ""})` : ""}`,
    origem,
    valorNovo: detalhes || null,
  });
}

module.exports = { registrar };