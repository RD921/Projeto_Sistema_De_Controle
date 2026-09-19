const pool = require("../config/db");
const eventDispatcher = require("../automation/engine/EventDispatcher");

// Mesma logica de calculo de SLA que ja existe em sacController.js - extraida
// para um servico reaproveitavel, ja que agora e chamada tanto pela rota manual
// (POST /sac/sla/verificar) quanto pelo cron automatico (SacSlaCron).
function calcularSlaStatus(ticket, regra) {
  if (!regra) return null;
  const agora = new Date();
  const criado = new Date(ticket.created_at);
  const minutosDecorridos = (agora - criado) / 60000;

  if (ticket.resolvido_em || ticket.encerrado_em) {
    const dataConclusao = new Date(ticket.resolvido_em || ticket.encerrado_em);
    const minutosAteConcluir = (dataConclusao - criado) / 60000;
    return minutosAteConcluir <= regra.resolucao_minutos ? "cumprido" : "vencido_mas_concluido";
  }

  if (!ticket.primeira_resposta_em && minutosDecorridos > regra.primeira_resposta_minutos) return "vencido";
  if (minutosDecorridos > regra.resolucao_minutos) return "vencido";
  if (minutosDecorridos > regra.resolucao_minutos * 0.8) return "proximo_vencimento";
  return "dentro_prazo";
}

// Verifica o SLA de todos os tenants de uma vez (o cron roda para o sistema
// inteiro, nao para uma empresa especifica - diferente da rota manual que
// verifica so o tenant de quem chamou).
async function verificarTodosTenants() {
  const [tenants] = await pool.query("SELECT DISTINCT tenant_id FROM sac_tickets WHERE status NOT IN ('resolvido','encerrado')");

  let totalDisparados = 0;
  for (const { tenant_id } of tenants) {
    const [tickets] = await pool.query(
      "SELECT id, prioridade, created_at, primeira_resposta_em, resolvido_em, encerrado_em FROM sac_tickets WHERE tenant_id = ? AND status NOT IN ('resolvido','encerrado')",
      [tenant_id]
    );
    const [regras] = await pool.query("SELECT * FROM sac_sla_rules WHERE tenant_id = ?", [tenant_id]);
    const mapaRegras = Object.fromEntries(regras.map(r => [r.prioridade, r]));

    for (const t of tickets) {
      const status = calcularSlaStatus(t, mapaRegras[t.prioridade]);
      if (status === "proximo_vencimento") {
        try { await eventDispatcher.dispatch("TICKET_SLA_PROXIMO", tenant_id, { ticket_id: t.id }); totalDisparados++; } catch {}
      } else if (status === "vencido") {
        try { await eventDispatcher.dispatch("TICKET_SLA_VENCIDO", tenant_id, { ticket_id: t.id }); totalDisparados++; } catch {}
      }
    }
  }

  return totalDisparados;
}

module.exports = { calcularSlaStatus, verificarTodosTenants };