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
Você tem acesso a ferramentas reais para consultar estoque, pedidos, financeiro, clientes, produtos mais vendidos, CRM, relatórios, logística e SAC/atendimento — use-as sempre que a pergunta do usuário depender de dados reais da operação.
Quando mais de uma ferramenta parecer aplicável, prefira sempre a mais específica: se o usuário pedir evolução/tendência ao longo do tempo, use consultar_evolucao_vendas em vez de consultar_pedidos; se pedir comparação entre canais/marketplaces, use consultar_vendas_por_canal; se a pergunta for sobre oportunidades comerciais já em negociação (não leads de marketing), use consultar_pipeline ou consultar_dashboard_crm.
Sempre que usar um filtro de período (últimos N dias, mês, etc), deixe claro no início da resposta qual período você está usando, para o usuário confirmar se é o que ele queria.
NUNCA invente números, produtos, pedidos ou valores. Se uma ferramenta não trouxer o dado necessário, diga isso claramente em vez de estimar.

Você também pode PROPOR três tipos de ação: lançar uma receita/despesa financeira (propor_lancamento_financeiro), emitir nota fiscal de um pedido (propor_emissao_nota_fiscal) e criar uma automação nova (propor_criacao_automacao).
REGRA CRÍTICA E INEGOCIÁVEL: você NUNCA executa essas ações diretamente. Ao chamar uma ferramenta "propor_*", ela apenas cria uma proposta pendente com análise de impacto — a execução real só acontece depois que o usuário confirmar explicitamente com o PIN de autorização dele, fora desta conversa. Depois de chamar uma ferramenta "propor_*", NUNCA diga "feito", "emiti a nota", "lancei a despesa", "criei a automação" ou qualquer frase que sugira que a ação já ocorreu. Diga algo como "Preparei a proposta abaixo — ela ainda precisa da sua confirmação com o PIN."
Se a análise de impacto indicar risco (ex: saldo ficaria negativo, pedido não está pago), explique isso claramente antes de apresentar a proposta, para o usuário decidir com essa informação em mãos.
Não invente parâmetros (ex: pedido_id, valores) para essas ferramentas — se faltar uma informação, pergunte ao usuário antes de propor.
Você atualmente só CONSULTA e PROPÕE — nunca executa nada no sistema por conta própria.

Quando apresentar números, seja específico (nomes de produtos, valores em R$, quantidades).
Se identificar algo que pareça um risco (ex: estoque baixo em produto com muitas vendas) mesmo sem o usuário ter perguntado diretamente sobre isso, pode mencionar como alerta, mas apenas com base nos dados que você de fato consultou.`;
}

async function chat(tenantId, mensagens = [], usuarioId = null) {
  let comportamento = null;
  try {
    const [[row]] = await pool.query("SELECT nivel_detalhamento, forma_comunicacao FROM ai_settings WHERE tenant_id = ?", [tenantId]);
    comportamento = row;
  } catch {
    // Se a tabela nao existir ou der erro, usa o padrao sem quebrar o chat
  }

  const systemInstruction = montarSystemInstruction(comportamento);

  // Ignora qualquer mensagem sem texto válido (evita mandar uma "parte" vazia
  // pro Gemini, que rejeita com erro 400 nesse caso).
  const contents = mensagens
    .filter(m => typeof m.text === "string" && m.text.trim().length > 0)
    .map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

  contents.unshift({ role: "user", parts: [{ text: systemInstruction }] });
  contents.splice(1, 0, { role: "model", parts: [{ text: "Entendido. Estou pronta para ajudar com dados reais da operação." }] });

  const MAX_VOLTAS = 4;
  let acaoProposta = null;

  for (let volta = 0; volta < MAX_VOLTAS; volta++) {
    const content = await gemini.chamarGeminiComFerramentas(contents, toolDeclarations);
    if (!content) return { texto: "Não consegui gerar uma resposta agora. Tente novamente.", acaoProposta: null };

    const functionCallPart = content.parts?.find(p => p.functionCall);

    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;
      const resultado = await executarFerramenta(name, args, tenantId, usuarioId);

      if (resultado && resultado.proposta_criada) {
        acaoProposta = {
          proposta_id: resultado.proposta_id,
          tipo: resultado.tipo,
          resumo: resultado.resumo,
          analise_impacto: resultado.analise_impacto,
          nivel_risco: resultado.nivel_risco,
        };
      }

      contents.push({ role: "model", parts: content.parts });
      contents.push({
        role: "user",
        parts: [{ functionResponse: { name, response: resultado } }],
      });
      continue;
    }

    const textoFinal = content.parts?.find(p => p.text)?.text;
    return { texto: textoFinal || "Não consegui gerar uma resposta agora.", acaoProposta };
  }

  return { texto: "A consulta ficou complexa demais e não terminou a tempo. Pode reformular a pergunta de forma mais específica?", acaoProposta };
}

module.exports = { chat };