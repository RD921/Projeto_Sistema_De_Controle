const axios = require("axios");

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

function ehErroTemporario(status) {
  return status === 429 || status === 503;
}

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
      if (ehErroTemporario(err.response?.status) && i < tentativas - 1) {
        console.log(`[GEMINI] Erro ${err.response?.status} (temporario), tentativa ${i + 1}/${tentativas}, aguardando ${(i + 1) * 5}s...`);
        await new Promise(r => setTimeout(r, (i + 1) * 5000));
      } else {
        throw err;
      }
    }
  }
}

async function chamarGeminiComFerramentas(contents, tools, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const response = await axios.post(
        GEMINI_URL,
        { contents, tools: [{ functionDeclarations: tools }] },
        {
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY,
          },
        }
      );
      return response.data.candidates?.[0]?.content;
    } catch (err) {
      if (ehErroTemporario(err.response?.status) && i < tentativas - 1) {
        console.log(`[GEMINI] Erro ${err.response?.status} (temporario) nas ferramentas, tentativa ${i + 1}/${tentativas}, aguardando ${(i + 1) * 5}s...`);
        await new Promise(r => setTimeout(r, (i + 1) * 5000));
        continue;
      }
      console.error("[GEMINI TOOLS ERROR]", JSON.stringify(err.response?.data || err.message, null, 2));
      throw err;
    }
  }
}

exports.gerarCopyMarketing = async (produto, publico, canal) => {
  const prompt = `VocÃª Ã© um especialista em marketing digital para o mercado brasileiro.
Crie uma mensagem de marketing persuasiva:
- Produto/ServiÃ§o: ${produto}
- PÃºblico-alvo: ${publico}
- Canal: ${canal}
Use gatilhos mentais, seja natural em portuguÃªs brasileiro, mÃ¡ximo 3 parÃ¡grafos com CTA claro.
Retorne apenas a mensagem.`;
  return await chamarGemini(prompt);
};

exports.preverVenda = async (cliente) => {
  const prompt = `Analise este cliente e preveja probabilidade de compra:
Nome: ${cliente.nome}, Email: ${cliente.email}, Telefone: ${cliente.telefone || "nÃ£o informado"}
Responda APENAS em JSON vÃ¡lido:
{"probabilidade": 75, "classificacao": "quente", "motivo": "explicaÃ§Ã£o", "acao_recomendada": "aÃ§Ã£o"}
ClassificaÃ§Ã£o: frio, morno ou quente.`;
  const texto = await chamarGemini(prompt);
  try {
    return JSON.parse(texto.replace(/```json|```/g, "").trim());
  } catch {
    return { probabilidade: 50, classificacao: "morno", motivo: "AnÃ¡lise indisponÃ­vel", acao_recomendada: "Fazer contato manual" };
  }
};

exports.gerarScriptAbordagem = async (persona, produto) => {
  const prompt = `Crie 3 scripts de abordagem de vendas em portuguÃªs brasileiro:
- Persona: ${persona}
- Produto: ${produto}
Responda APENAS em JSON vÃ¡lido:
[{"canal": "WhatsApp", "script": "mensagem"}, {"canal": "Email", "script": "mensagem"}, {"canal": "Telefone", "script": "mensagem"}]`;
  const texto = await chamarGemini(prompt);
  try {
    return JSON.parse(texto.replace(/```json|```/g, "").trim());
  } catch {
    return [];
  }
};

exports.analisarLeadScore = async (leads) => {
  const prompt = `Analise estes leads e dÃª pontuaÃ§Ã£o 0-100:
${JSON.stringify(leads)}
Responda APENAS em JSON vÃ¡lido:
[{"id": 1, "score": 85, "temperatura": "quente", "proxima_acao": "aÃ§Ã£o"}]
Temperatura: frio, morno ou quente.`;
  const texto = await chamarGemini(prompt);
  try {
    return JSON.parse(texto.replace(/```json|```/g, "").trim());
  } catch {
    return leads.map(l => ({ id: l.id, score: 50, temperatura: "morno", proxima_acao: "Fazer contato" }));
  }
};

exports.chat = async (mensagens) => {
  const historico = mensagens.map(m => `${m.role === "user" ? "UsuÃ¡rio" : "Aria"}: ${m.text}`).join("\n");
  const prompt = `VocÃª Ã© Aria, assistente virtual do EcomFlow, sistema de gestÃ£o de e-commerce brasileiro.
Responda sempre em portuguÃªs brasileiro, de forma natural, amigÃ¡vel e profissional.
VocÃª conhece os mÃ³dulos: Dashboard, Produtos, Pedidos, Clientes, Marketing com IA e AutomaÃ§Ãµes.
HistÃ³rico da conversa:
${historico}
Responda a Ãºltima mensagem do usuÃ¡rio:`;
  return await chamarGemini(prompt);
};

exports.chamarGemini = chamarGemini;
exports.chamarGeminiComFerramentas = chamarGeminiComFerramentas;