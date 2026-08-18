// src/services/ai/AIService.js
const gemini = require("../geminiService");
const contextBuilder = require("./AIContextBuilder");

async function chat(tenantId, userRole, mensagens = []) {
  const context = await contextBuilder.build(tenantId, userRole);
  const contextoTexto = contextBuilder.toPromptText(context);

  const historico = mensagens
    .map((m) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.text}`)
    .join("\n");

  const prompt = `Você é o assistente de IA do M-Winner, uma plataforma de gestão
empresarial com automações. Seu papel aqui é entender o que o
usuário quer automatizar ou resolver, e RECOMENDAR o módulo, evento
e tipo de node mais adequados dentre os que já existem no sistema
(listados abaixo). Você NUNCA gera código, nunca inventa módulos ou
eventos que não estejam na lista.

${contextoTexto}

Histórico da conversa:
${historico}

Responda a última mensagem do usuário em português brasileiro, de
forma natural e objetiva. Se fizer sentido, termine sugerindo qual
módulo e evento usar para criar a automação (ex: "Isso pode ser
automatizado usando o evento STOCK_LOW do módulo Estoque, com um
node 'if' para checar a quantidade e um node 'log' para registrar
o alerta.").`;

  const respostaTexto = await gemini.chamarGemini(prompt);

  const recommendations = context.modules
    .filter((m) => respostaTexto.toLowerCase().includes(m.label.toLowerCase().split(" ")[0]))
    .map((m) => ({ moduleId: m.id, label: m.label, events: m.events }));

  return {
    type: "answer",
    message: respostaTexto,
    insights: [],
    recommendations,
    actions: [],
    data: null,
  };
}

module.exports = { chat };