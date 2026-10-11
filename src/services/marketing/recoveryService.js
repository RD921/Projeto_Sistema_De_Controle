// Recuperação de oportunidades: regras configuráveis que procuram dinheiro parado
// (leads sem contato, negociações paradas, propostas, clientes inativos, recompra, pedidos pendentes)
// e transformam cada achado em tarefa e/ou em um evento para o motor de automações.
const pool = require("../../config/db");
const eventDispatcher = require("../../automation/engine/EventDispatcher");
const { prepararTenant } = require("../marketingSchema");
const { criarTarefa } = require("./taskService");

const TIPOS = {
  lead_sem_contato: { nome: "Leads sem resposta", acao: "Fazer contato", tipo_metrica: "observado" },
  negociacao_parada: { nome: "Negociações paradas", acao: "Retomar a negociação", tipo_metrica: "observado" },
  proposta_parada: { nome: "Propostas sem retorno", acao: "Cobrar retorno da proposta", tipo_metrica: "observado" },
  cliente_inativo: { nome: "Clientes inativos", acao: "Reativar o cliente", tipo_metrica: "observado" },
  recompra: { nome: "Potencial de recompra", acao: "Oferecer nova compra", tipo_metrica: "estimado" },
  pedido_pendente: { nome: "Pedidos pendentes (pagamento não confirmado)", acao: "Recuperar o pedido", tipo_metrica: "observado" },
};

const n = v => Number(v || 0);

async function detectar(tenantId, regra) {
  const dias = n(regra.dias);
  switch (regra.tipo) {
    case "lead_sem_contato": {
      const [rows] = await pool.query(
        `SELECT id, nome, score, valor_estimado, DATEDIFF(NOW(), COALESCE(ultimo_contato_em, created_at)) AS dias_parado
         FROM marketing_leads
         WHERE tenant_id = ? AND deal_id IS NULL AND status IN ('novo','contactado','engajado','qualificado') AND COALESCE(ultimo_contato_em, created_at) <= DATE_SUB(NOW(), INTERVAL ? DAY)
         ORDER BY score DESC LIMIT 200`, [tenantId, dias]);
      return rows.map(r => ({ ref: `lead:${r.id}`, lead_id: r.id, titulo: `Contatar ${r.nome}`, motivo: `${r.dias_parado} dia(s) sem contato, score ${r.score}`, valor: n(r.valor_estimado), dias_parado: r.dias_parado }));
    }
    case "negociacao_parada": {
      const [rows] = await pool.query(
        `SELECT d.id, d.titulo, d.valor, d.customer_id, DATEDIFF(NOW(), d.updated_at) AS dias_parado
         FROM crm_deals d WHERE d.tenant_id = ? AND d.estagio IN ('qualificacao','negociacao') AND d.updated_at <= DATE_SUB(NOW(), INTERVAL ? DAY)
         ORDER BY d.valor DESC LIMIT 200`, [tenantId, dias]);
      return rows.map(r => ({ ref: `deal:${r.id}`, customer_id: r.customer_id, titulo: `Retomar negociação: ${r.titulo}`, motivo: `Parada há ${r.dias_parado} dia(s) no CRM`, valor: n(r.valor), dias_parado: r.dias_parado }));
    }
    case "proposta_parada": {
      const [rows] = await pool.query(
        `SELECT d.id, d.titulo, d.valor, d.customer_id, DATEDIFF(NOW(), d.updated_at) AS dias_parado
         FROM crm_deals d WHERE d.tenant_id = ? AND d.estagio = 'proposta' AND d.updated_at <= DATE_SUB(NOW(), INTERVAL ? DAY)
         ORDER BY d.valor DESC LIMIT 200`, [tenantId, dias]);
      return rows.map(r => ({ ref: `deal:${r.id}`, customer_id: r.customer_id, titulo: `Cobrar retorno da proposta: ${r.titulo}`, motivo: `Proposta sem movimento há ${r.dias_parado} dia(s)`, valor: n(r.valor), dias_parado: r.dias_parado }));
    }
    case "cliente_inativo": {
      const [rows] = await pool.query(
        `SELECT c.id, c.nome, COUNT(o.id) AS pedidos, SUM(o.total) AS gasto, DATEDIFF(NOW(), MAX(o.created_at)) AS dias_sem_comprar
         FROM customers c JOIN orders o ON o.customer_id = c.id AND o.tenant_id = c.tenant_id AND o.status = 'pago'
         WHERE c.tenant_id = ? AND c.ativo = 1 GROUP BY c.id, c.nome
         HAVING dias_sem_comprar >= ? ORDER BY gasto DESC LIMIT 200`, [tenantId, dias]);
      return rows.map(r => ({ ref: `cliente:${r.id}`, customer_id: r.id, titulo: `Reativar ${r.nome}`, motivo: `${r.dias_sem_comprar} dia(s) sem comprar; ${r.pedidos} pedido(s), R$ ${n(r.gasto).toFixed(2)} gastos`, valor: n(r.gasto) / n(r.pedidos), dias_parado: r.dias_sem_comprar }));
    }
    case "recompra": {
      const [[inat]] = await pool.query("SELECT dias FROM marketing_recovery_rules WHERE tenant_id = ? AND tipo = 'cliente_inativo' AND ativa = TRUE", [tenantId]);
      const limiteInativo = inat ? n(inat.dias) : 999999;
      const [rows] = await pool.query(
        `SELECT c.id, c.nome, COUNT(o.id) AS pedidos, AVG(o.total) AS ticket,
                DATEDIFF(MAX(o.created_at), MIN(o.created_at)) / (COUNT(o.id) - 1) AS intervalo_medio,
                DATEDIFF(NOW(), MAX(o.created_at)) AS dias_sem_comprar
         FROM customers c JOIN orders o ON o.customer_id = c.id AND o.tenant_id = c.tenant_id AND o.status = 'pago'
         WHERE c.tenant_id = ? AND c.ativo = 1 GROUP BY c.id, c.nome HAVING pedidos >= 2 LIMIT 500`, [tenantId]);
      return rows
        .filter(r => n(r.dias_sem_comprar) >= Math.max(n(r.intervalo_medio), dias) && n(r.dias_sem_comprar) < limiteInativo)
        .map(r => ({ ref: `cliente:${r.id}`, customer_id: r.id, titulo: `Oferecer nova compra para ${r.nome}`, motivo: `Compra a cada ~${Math.round(n(r.intervalo_medio))} dia(s) e já faz ${r.dias_sem_comprar} sem comprar (estimativa)`, valor: n(r.ticket), dias_parado: r.dias_sem_comprar, estimado: true }));
    }
    case "pedido_pendente": {
      const [rows] = await pool.query(
        `SELECT o.id, o.total, o.customer_id, c.nome AS cliente, DATEDIFF(NOW(), o.created_at) AS dias_parado
         FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
         WHERE o.tenant_id = ? AND o.status = 'pendente' AND o.created_at <= DATE_SUB(NOW(), INTERVAL ? DAY) ORDER BY o.total DESC LIMIT 200`, [tenantId, dias]);
      return rows.map(r => ({ ref: `pedido:${r.id}`, customer_id: r.customer_id, titulo: `Recuperar pedido #${r.id}${r.cliente ? ` de ${r.cliente}` : ""}`, motivo: `Pedido pendente há ${r.dias_parado} dia(s)`, valor: n(r.total), dias_parado: r.dias_parado }));
    }
    default: return [];
  }
}

async function regras(tenantId) {
  await prepararTenant(tenantId);
  const [rows] = await pool.query("SELECT * FROM marketing_recovery_rules WHERE tenant_id = ? ORDER BY id", [tenantId]);
  return rows.map(r => ({ ...r, ...TIPOS[r.tipo], ativa: !!r.ativa, criar_tarefa: !!r.criar_tarefa, disparar_automacao: !!r.disparar_automacao }));
}

// Lista o que as regras encontram AGORA (sem criar nada).
async function oportunidades(tenantId, { detalhes = true } = {}) {
  const lista = await regras(tenantId);
  const grupos = [];
  for (const r of lista.filter(x => x.ativa)) {
    const itens = await detectar(tenantId, r);
    grupos.push({
      tipo: r.tipo, nome: r.nome, dias: r.dias, tipo_metrica: r.tipo_metrica, quantidade: itens.length,
      valor_potencial: Number(itens.reduce((a, i) => a + i.valor, 0).toFixed(2)),
      itens: detalhes ? itens.slice(0, 50) : undefined,
    });
  }
  return grupos;
}

// Roda as regras: cria uma tarefa por oportunidade (sem repetir enquanto houver uma aberta)
// e/ou dispara o evento para o motor de automações enviar a abordagem.
async function executar(tenantId, { userId = null } = {}) {
  const lista = await regras(tenantId);
  const resumo = { tarefas_criadas: 0, eventos_disparados: 0, encontrados: 0 };
  for (const r of lista.filter(x => x.ativa)) {
    const itens = await detectar(tenantId, r);
    resumo.encontrados += itens.length;
    for (const item of itens) {
      if (r.criar_tarefa) {
        const t = await criarTarefa(tenantId, {
          titulo: item.titulo, descricao: `${item.motivo}. Valor em jogo: R$ ${item.valor.toFixed(2)}${item.estimado ? " (estimado)" : ""}.`,
          prioridade: item.valor >= 1000 || item.dias_parado >= 14 ? "alta" : "media", prazo_dias: 2, origem: "recuperacao",
          lead_id: item.lead_id, customer_id: item.customer_id, chave: `rec:${r.tipo}:${item.ref}`,
        }, { userId });
        if (!t.duplicada) resumo.tarefas_criadas++;
      }
      if (r.disparar_automacao && resumo.eventos_disparados < 200) {
        try {
          await eventDispatcher.dispatch("marketing_oportunidade_recuperacao", tenantId, {
            tipo: r.tipo, ref: item.ref, lead_id: item.lead_id || null, customer_id: item.customer_id || null, titulo: item.titulo, motivo: item.motivo, valor: item.valor,
          });
          resumo.eventos_disparados++;
        } catch { /* automação não trava a varredura */ }
      }
    }
  }
  return resumo;
}

async function atualizarRegra(tenantId, id, dados) {
  const sets = [], params = [];
  if (dados.dias !== undefined) {
    const d = Number(dados.dias);
    if (!Number.isInteger(d) || d < 0 || d > 3650) return { erro: "dias deve ser um número inteiro entre 0 e 3650" };
    sets.push("dias = ?"); params.push(d);
  }
  for (const k of ["ativa", "criar_tarefa", "disparar_automacao"]) if (dados[k] !== undefined) { sets.push(`${k} = ?`); params.push(dados[k] ? 1 : 0); }
  if (!sets.length) return { erro: "nada para atualizar" };
  const [r] = await pool.query(`UPDATE marketing_recovery_rules SET ${sets.join(", ")} WHERE id = ? AND tenant_id = ?`, [...params, id, tenantId]);
  return r.affectedRows ? { ok: true } : { naoEncontrada: true };
}

module.exports = { TIPOS, regras, oportunidades, executar, atualizarRegra, detectar };
