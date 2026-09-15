const gemini = require("../geminiService");
const pool = require("../../config/db");
const { toolDeclarations, executarFerramenta } = require("./businessTools");

const DESCRICAO_DETALHAMENTO = {
  objetivo: "Seja extremamente objetiva e curta. Va direto ao ponto, sem explicacoes extras.",
  equilibrado: "Seja clara e completa, mas sem ser prolixa. Equilibrio entre objetividade e contexto.",
  detalhado: "De explicacoes completas, com contexto adicional e possiveis causas/consequencias.",
  executivo: "Fale como se estivesse reportando para um executivo: resuma o essencial primeiro, detalhes depois.",
};

const DESCRICAO_COMUNICACAO = {
  direta: "Tom direto e pratico, sem rodeios.",
  executiva: "Tom formal e executivo, como um relatorio para a diretoria.",
  tecnica: "Tom tecnico e preciso, use termos especificos do negocio quando fizer sentido.",
  explicativa: "Tom didatico, explique o raciocinio por tras dos numeros quando relevante.",
};

function montarSystemInstruction(comportamento) {
  const detalhamento = DESCRICAO_DETALHAMENTO[comportamento?.nivel_detalhamento] || DESCRICAO_DETALHAMENTO.equilibrado;
  const comunicacao = DESCRICAO_COMUNICACAO[comportamento?.forma_comunicacao] || DESCRICAO_COMUNICACAO.direta;

  return `Você é Aria, assistente executiva do EcomFlow, sistema de gestão de e-commerce brasileiro.
Responda sempre em português brasileiro, de forma natural e profissional.
${detalhamento}
${comunicacao}
Você tem acesso a ferramentas reais para consultar estoque, pedidos, financeiro, clientes, produtos mais vendidos, CRM, relatórios e logística — use-as sempre que a pergunta do usuário depender de dados reais da operação.
NUNCA invente números, produtos, pedidos ou valores. Se uma ferramenta não trouxer o dado necessário, diga isso claramente em vez de estimar.
Você atualmente só CONSULTA dados — não executa nenhuma ação no sistema (não altera estoque, não cria pedidos, não muda cadastros). Se o usuário pedir para você executar alguma ação, explique com clareza que ainda não tem essa capacidade.
Quando apresentar números, seja específico (nomes de produtos, valores em R$, quantidades).
Se identificar algo que pareça um risco (ex: estoque baixo em produto com muitas vendas) mesmo sem o usuário ter perguntado diretamente sobre isso, pode mencionar como alerta, mas apenas com base nos dados que você de fato consultou.`;
}

async function chat(tenantId, mensagens = []) {
  let comportamento = null;
  try {
    const [[row]] = await pool.query("SELECT nivel_detalhamento, forma_comunicacao FROM ai_settings WHERE tenant_id = ?", [tenantId]);
    comportamento = row;
  } catch {
    // Se a tabela nao existir ou der erro, usa o padrao sem quebrar o chat
  }

  const systemInstruction = montarSystemInstruction(comportamento);

  const contents = mensagens.map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));

  contents.unshift({ role: "user", parts: [{ text: systemInstruction }] });
  contents.splice(1, 0, { role: "model", parts: [{ text: "Entendido. Estou pronta para ajudar com dados reais da operação." }] });

  const MAX_VOLTAS = 4;
  for (let volta = 0; volta < MAX_VOLTAS; volta++) {
    const content = await gemini.chamarGeminiComFerramentas(contents, toolDeclarations);
    if (!content) return "Não consegui gerar uma resposta agora. Tente novamente.";

    const functionCallPart = content.parts?.find(p => p.functionCall);

    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;
      const resultado = await executarFerramenta(name, args, tenantId);

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