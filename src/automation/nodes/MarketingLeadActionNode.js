const { resolverTemplate } = require("../engine/TemplateResolver");

// Ações de marketing dentro de uma automação: atualizar o lead, pontuar, criar tarefa ou enviar ao CRM.
// Reaproveita os mesmos serviços das telas, então tudo fica no histórico do lead.
// (os serviços são carregados na hora do uso para não criar dependência circular com o motor)
module.exports = async (node, context) => {
  const cfg = node.config || {};
  const leadSvc = require("../../services/marketing/leadService");
  const taskSvc = require("../../services/marketing/taskService");
  const pool = require("../../config/db");
  const tenantId = context.tenantId;

  const bruto = resolverTemplate(cfg.lead_id, context) || context.ultimoOutput?.lead_id || context.trigger?.data?.lead_id;
  const leadId = Number(bruto);
  const precisaLead = ["set_status", "add_score", "send_to_crm", "register_interaction"].includes(cfg.action) || (cfg.action === "create_task" && cfg.lead_id);
  if (precisaLead && !leadId) throw new Error("Não encontrei o lead desta execução (informe lead_id ou use um gatilho de lead)");

  switch (cfg.action) {
    case "set_status": {
      const r = await leadSvc.mudarStatus(tenantId, leadId, cfg.status, { motivo: "Automação" });
      if (!r) throw new Error(`Lead ${leadId} não encontrado`);
      return { output: { ...context.ultimoOutput, lead_id: leadId, status: cfg.status }, log: `Lead ${leadId} -> ${cfg.status}` };
    }
    case "add_score": {
      const pontos = Number(cfg.pontos);
      if (!Number.isInteger(pontos) || Math.abs(pontos) > 100) throw new Error("pontos deve ser um inteiro entre -100 e 100");
      const [[l]] = await pool.query("SELECT score FROM marketing_leads WHERE id = ? AND tenant_id = ?", [leadId, tenantId]);
      if (!l) throw new Error(`Lead ${leadId} não encontrado`);
      const { calcularTemperatura } = require("../../services/marketingScoringService");
      const novo = Math.max(0, l.score + pontos);
      await pool.query("UPDATE marketing_leads SET score = ?, temperatura = ? WHERE id = ?", [novo, calcularTemperatura(novo), leadId]);
      await pool.query("INSERT INTO marketing_lead_score_history (lead_id, tenant_id, rule_id, pontos_aplicados, score_resultante, motivo) VALUES (?, ?, NULL, ?, ?, 'Automação')", [leadId, tenantId, pontos, novo]);
      return { output: { ...context.ultimoOutput, lead_id: leadId, score: novo }, log: `Lead ${leadId}: ${pontos > 0 ? "+" : ""}${pontos} pontos (score ${novo})` };
    }
    case "create_task": {
      const t = await taskSvc.criarTarefa(tenantId, {
        titulo: resolverTemplate(cfg.titulo, context), descricao: resolverTemplate(cfg.descricao, context), prioridade: cfg.prioridade,
        prazo_dias: cfg.prazo_dias === "" || cfg.prazo_dias === undefined ? 2 : Number(cfg.prazo_dias), lead_id: leadId || null, origem: "manual",
      });
      return { output: { ...context.ultimoOutput, task_id: t.id }, log: `Tarefa de marketing #${t.id} criada` };
    }
    case "send_to_crm": {
      const r = await leadSvc.enviarParaCRM(tenantId, leadId);
      if (!r) throw new Error(`Lead ${leadId} não encontrado`);
      return { output: { ...context.ultimoOutput, lead_id: leadId, deal_id: r.deal_id }, log: `Lead ${leadId} enviado ao CRM (oportunidade ${r.deal_id})` };
    }
    case "register_interaction": {
      await leadSvc.registrarInteracao(tenantId, leadId, cfg.tipo || "nota", resolverTemplate(cfg.descricao, context) || "Registrado por automação");
      return { output: { ...context.ultimoOutput, lead_id: leadId }, log: `Interação registrada no lead ${leadId}` };
    }
    default:
      throw new Error(`Ação de marketing desconhecida: "${cfg.action}"`);
  }
};
