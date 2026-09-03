const gemini = require("../geminiService");
const { toolDeclarations, executarFerramenta } = require("./businessTools");

const SYSTEM_INSTRUCTION = `Você é Aria, assistente executiva do EcomFlow, sistema de gestão de e-commerce brasileiro.
Responda sempre em português brasileiro, de forma natural, direta e profissional.
Você tem acesso a ferramentas reais para consultar estoque, pedidos, financeiro, clientes e produtos mais vendidos — use-as sempre que a pergunta do usuário depender de dados reais da operação.
NUNCA invente números, produtos, pedidos ou valores. Se uma ferramenta não trouxer o dado necessário, diga isso claramente em vez de estimar.
Quando apresentar números, seja específico (nomes de produtos, valores em R$, quantidades).
Se identificar algo que pareça um risco (ex: estoque baixo em produto com muitas vendas) mesmo sem o usuário ter perguntado diretamente sobre isso, pode mencionar como alerta, mas apenas com base nos dados que você de fato consultou.`;

async function chat(tenantId, mensagens = []) {
  const contents = mensagens.map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));

  contents.unshift({ role: "user", parts: [{ text: SYSTEM_INSTRUCTION }] });
  contents.splice(1, 0, { role: "model", parts: [{ text: "Entendido. Estou pronta para ajudar com dados reais da operação." }] });

  const MAX_VOLTAS = 4;
  for (let volta = 0; volta < MAX_VOLTAS; volta++) {
    const content = await gemini.chamarGeminiComFerramentas(contents, toolDeclarations);
    if (!content) return "Não consegui gerar uma resposta agora. Tente novamente.";

    const functionCallPart = content.parts?.find(p => p.functionCall);

    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;
      const resultado = await executarFerramenta(name, args, tenantId);

      // Reenvia os parts EXATAMENTE como vieram da API (preserva thoughtSignature)
      contents.push({ role: "model", parts: content.parts });
      contents.push({
        role: "user",
        parts: [{ functionResponse: { name, response: resultado } }],
      });
      continue;
    }

    const textoFinal = content.parts?.find(p => p.text)?.text;
    return textoFinal || "Não consegui gerar uma resposta agora.";
  }

  return "A consulta ficou complexa demais e não terminou a tempo. Pode reformular a pergunta de forma mais específica?";
}

module.exports = { chat };