// src/services/ai/AIContextBuilder.js
const pool = require("../../config/db");

const MODULE_CATALOG = [
  {
    id: "vendas",
    label: "Vendas / Pedidos",
    description: "Pedidos, pagamentos e status de venda.",
    events: ["ORDER_CREATED", "ORDER_PAID"],
  },
  {
    id: "estoque",
    label: "Estoque",
    description: "Controle e alertas de nível de estoque.",
    events: ["STOCK_LOW"],
  },
  {
    id: "clientes",
    label: "Clientes / CRM",
    description: "Cadastro e relacionamento com clientes.",
    events: [],
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Geração de copy, lead scoring e campanhas com IA.",
    events: [],
  },
];

const NODE_CATALOG = [
  { type: "manual_trigger", label: "Trigger Manual", category: "trigger" },
  { type: "event_trigger", label: "Trigger de Evento", category: "trigger" },
  { type: "schedule_trigger", label: "Trigger Agendado", category: "trigger" },
  { type: "webhook_trigger", label: "Trigger de Webhook", category: "trigger" },
  { type: "if", label: "If (condição)", category: "logic" },
  { type: "set", label: "Set (definir campo)", category: "action" },
  { type: "log", label: "Log", category: "action" },
];

async function build(tenantId, userRole) {
  const [eventos] = await pool.query(
    "SELECT code, label, category, description, module FROM event_types ORDER BY category, label"
  );

  const [automacoes] = await pool.query(
    "SELECT id, name, status FROM automations WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 20",
    [tenantId]
  );

  return {
    userRole: userRole || "user",
    modules: MODULE_CATALOG,
    nodes: NODE_CATALOG,
    events: eventos,
    existingAutomations: automacoes,
  };
}

function toPromptText(context) {
  const modulosTxt = context.modules
    .map((m) => `- ${m.label} (id: ${m.id}): ${m.description}${m.events.length ? ` [eventos: ${m.events.join(", ")}]` : ""}`)
    .join("\n");

  const eventosTxt = context.events
    .map((e) => `- ${e.code}: ${e.label} (categoria: ${e.category})`)
    .join("\n");

  const nodesTxt = context.nodes.map((n) => `- ${n.type} (${n.category}): ${n.label}`).join("\n");

  const automacoesTxt = context.existingAutomations.length
    ? context.existingAutomations.map((a) => `- #${a.id} "${a.name}" (${a.status})`).join("\n")
    : "Nenhuma automação criada ainda.";

  return `MÓDULOS DISPONÍVEIS NO SISTEMA:
${modulosTxt}

EVENTOS DISPONÍVEIS (Event Bus):
${eventosTxt}

TIPOS DE NODE DISPONÍVEIS NO EDITOR DE AUTOMAÇÃO:
${nodesTxt}

AUTOMAÇÕES JÁ CRIADAS PELO USUÁRIO:
${automacoesTxt}

REGRA IMPORTANTE: você só pode recomendar módulos, eventos e nodes
que estão listados acima. Nunca invente um módulo, evento ou node
que não exista nesta lista. Se o pedido do usuário não se encaixar
em nada disponível, diga isso claramente em vez de inventar.`;
}

module.exports = { build, toPromptText };