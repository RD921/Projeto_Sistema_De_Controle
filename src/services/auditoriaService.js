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

  await auditService.registrar({
    tenantId,
    usuarioId: user?.id || null,
    usuarioNome: nomeUsuario,
    acao: `${acao}${entidadeTipo ? ` (${entidadeTipo}${entidadeId ? ` #${entidadeId}` : ""})` : ""}`,
    origem: "Financeiro",
    valorNovo: detalhes || null,
  });
}

module.exports = { registrar };