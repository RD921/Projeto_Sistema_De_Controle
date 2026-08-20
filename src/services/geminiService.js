const axios = require("axios");
const GEMINI_URL =
"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

async function chamarGemini(prompt, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const response = await axios.post(
        GEMINI_URL,
        { contents: [{ parts: [{ text: prompt }] }] },
        {
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY,
          },
        }
      );
      return response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err) {
      if (err.response?.status === 429 && i < tentativas - 1) {
        console.log(`[GEMINI] Rate limit, aguardando ${(i + 1) * 5}s...`);
        await new Promise(r => setTimeout(r, (i + 1) * 5000));
      } else {
        throw err;
      }
    }
  }
}

exports.gerarCopyMarketing = async (produto, publico, canal) => {
  const prompt = `Você é um especialista em marketing digital para o mercado brasileiro.
Crie uma mensagem de marketing persuasiva:
- Produto/Serviço: ${produto}
- Público-alvo: ${publico}
- Canal: ${canal}
Use gatilhos mentais, seja natural em português brasileiro, máximo 3 parágrafos com CTA claro.
Retorne apenas a mensagem.`;
  return await chamarGemini(prompt);
};

exports.preverVenda = async (cliente) => {
  const prompt = `Analise este cliente e preveja probabilidade de compra:
Nome: ${cliente.nome}, Email: ${cliente.email}, Telefone: ${cliente.telefone || "não informado"}
Responda APENAS em JSON válido:
{"probabilidade": 75, "classificacao": "quente", "motivo": "explicação", "acao_recomendada": "ação"}
Classificação: frio, morno ou quente.`;
  const texto = await chamarGemini(prompt);
  try {
    return JSON.parse(texto.replace(/```json|```/g, "").trim());
  } catch {
    return { probabilidade: 50, classificacao: "morno", motivo: "Análise indisponível", acao_recomendada: "Fazer contato manual" };
  }
};

exports.gerarScriptAbordagem = async (persona, produto) => {
  const prompt = `Crie 3 scripts de abordagem de vendas em português brasileiro:
- Persona: ${persona}
- Produto: ${produto}
Responda APENAS em JSON válido:
[{"canal": "WhatsApp", "script": "mensagem"}, {"canal": "Email", "script": "mensagem"}, {"canal": "Telefone", "script": "mensagem"}]`;
  const texto = await chamarGemini(prompt);
  try {
    return JSON.parse(texto.replace(/```json|```/g, "").trim());
  } catch {
    return [];
  }
};

exports.analisarLeadScore = async (leads) => {
  const prompt = `Analise estes leads e dê pontuação 0-100:
${JSON.stringify(leads)}
Responda APENAS em JSON válido:
[{"id": 1, "score": 85, "temperatura": "quente", "proxima_acao": "ação"}]
Temperatura: frio, morno ou quente.`;
  const texto = await chamarGemini(prompt);
  try {
    return JSON.parse(texto.replace(/```json|```/g, "").trim());
  } catch {
    return leads.map(l => ({ id: l.id, score: 50, temperatura: "morno", proxima_acao: "Fazer contato" }));
  }
};

exports.chat = async (mensagens) => {
  const historico = mensagens.map(m => `${m.role === "user" ? "Usuário" : "Aria"}: ${m.text}`).join("\n");
  const prompt = `Você é Aria, assistente virtual do EcomFlow, sistema de gestão de e-commerce brasileiro.
Responda sempre em português brasileiro, de forma natural, amigável e profissional.
Você conhece os módulos: Dashboard, Produtos, Pedidos, Clientes, Marketing com IA e Automações.
Histórico da conversa:
${historico}
Responda a última mensagem do usuário:`;
  return await chamarGemini(prompt);
};

exports.chamarGemini = chamarGemini;