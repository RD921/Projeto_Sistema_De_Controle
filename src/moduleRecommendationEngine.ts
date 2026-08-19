/**
 * Motor de Recomendação de Módulos
 * ---------------------------------
 */

// ---------- Tipos ----------

export type Segmento =
  | "ecommerce"
  | "varejo_fisico"
  | "industria"
  | "distribuicao"
  | "servicos"
  | "infoprodutos"
  | "marketplace"
  | "outros";

export type Canal =
  | "loja_virtual"
  | "mercado_livre"
  | "shopee"
  | "amazon"
  | "magazine_luiza"
  | "americanas"
  | "aliexpress"
  | "outros_marketplaces"
  | "instagram"
  | "whatsapp"
  | "facebook"
  | "nenhum";

export type SistemaGestao = "bling" | "tiny" | "omie" | "sap" | "senior" | "nenhum" | "outro";

export type AreaDesejada =
  | "gestao_pedidos"
  | "estoque"
  | "financeiro"
  | "marketing"
  | "atendimento"
  | "crm"
  | "relatorios_bi"
  | "logistica"
  | "fiscal_contabil"
  | "compras"
  | "outros";

export type TamanhoOperacao = "iniciante" | "pequena" | "media" | "grande";

export type Objetivo = "reduzir_custos" | "aumentar_vendas" | "escalar_operacao" | "melhorar_controle";

export interface RespostasOnboarding {
  segmento: Segmento;
  canais: Canal[];
  sistemaGestao: SistemaGestao;
  areasDesejadas: AreaDesejada[];
  tamanhoOperacao: TamanhoOperacao;
  objetivo: Objetivo;
}

export interface HistoricoUso {
  modulosAtivos: string[];
  modulosMaisUsados?: string[];
}

export interface Plano {
  nome: "free" | "starter" | "profissional" | "enterprise";
  limiteModulos?: number;
}

export interface ModuloCatalogo {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
}

export interface ModuloRecomendado extends ModuloCatalogo {
  score: number;
  motivos: string[];
}

export interface OpcoesMotor {
  respostas: RespostasOnboarding;
  historico?: HistoricoUso;
  plano?: Plano;
  minScore?: number;
}

// ---------- Catálogo de módulos ----------

export const CATALOGO_MODULOS: ModuloCatalogo[] = [
  { id: "estoque", nome: "Estoque Inteligente", descricao: "Controle completo de estoque com alertas e relatórios", categoria: "operacao" },
  { id: "pedidos", nome: "Gestão de Pedidos", descricao: "Gerencie pedidos de todos os canais em um só lugar", categoria: "operacao" },
  { id: "financeiro", nome: "Financeiro", descricao: "Fluxo de caixa, contas a pagar e receber, conciliação", categoria: "financeiro" },
  { id: "crm", nome: "CRM", descricao: "Relacionamento com clientes, oportunidades e funil", categoria: "vendas" },
  { id: "automacao", nome: "Automação", descricao: "Crie automações e integrações entre sistemas", categoria: "operacao" },
  { id: "relatorios", nome: "Relatórios Avançados", descricao: "Dashboards e relatórios personalizados", categoria: "inteligencia" },
  { id: "marketing", nome: "Marketing", descricao: "Campanhas, e-mail marketing e gestão de leads", categoria: "vendas" },
  { id: "suporte", nome: "Suporte & SAC", descricao: "Atendimento ao cliente e gestão de chamados", categoria: "atendimento" },
  { id: "logistica", nome: "Logística", descricao: "Envios e rastreamento de entregas", categoria: "operacao" },
  { id: "fiscal", nome: "Fiscal e Contábil", descricao: "Notas fiscais e obrigações fiscais", categoria: "financeiro" },
  { id: "compras", nome: "Compras", descricao: "Gestão de fornecedores e compras", categoria: "operacao" },
];

// ---------- Regras ----------

const REGRAS_POR_SETOR: Record<Segmento, Record<string, number>> = {
  ecommerce: { estoque: 3, pedidos: 3, financeiro: 2, marketing: 2, relatorios: 2, automacao: 2, crm: 1, logistica: 2, suporte: 1 },
  varejo_fisico: { estoque: 3, pedidos: 2, financeiro: 2, crm: 2, relatorios: 1 },
  industria: { estoque: 3, compras: 3, financeiro: 2, logistica: 2, relatorios: 2 },
  distribuicao: { estoque: 3, logistica: 3, compras: 2, financeiro: 2, pedidos: 2 },
  servicos: { crm: 3, financeiro: 2, suporte: 2, marketing: 2, relatorios: 1 },
  infoprodutos: { marketing: 3, crm: 2, financeiro: 2, relatorios: 2, automacao: 1 },
  marketplace: { pedidos: 3, estoque: 2, financeiro: 2, relatorios: 2, automacao: 2 },
  outros: { pedidos: 1, estoque: 1, financeiro: 1 },
};

const MAPA_AREA_MODULO: Record<AreaDesejada, string> = {
  gestao_pedidos: "pedidos",
  estoque: "estoque",
  financeiro: "financeiro",
  marketing: "marketing",
  atendimento: "suporte",
  crm: "crm",
  relatorios_bi: "relatorios",
  logistica: "logistica",
  fiscal_contabil: "fiscal",
  compras: "compras",
  outros: "automacao",
};

const CANAIS_MARKETPLACE: Canal[] = ["mercado_livre", "shopee", "amazon", "magazine_luiza", "americanas", "aliexpress", "outros_marketplaces"];

const PESO_TAMANHO: Record<TamanhoOperacao, number> = {
  iniciante: 0,
  pequena: 1,
  media: 2,
  grande: 3,
};

const REGRAS_POR_OBJETIVO: Record<Objetivo, Record<string, number>> = {
  reduzir_custos: { automacao: 3, financeiro: 2, estoque: 1 },
  aumentar_vendas: { marketing: 3, crm: 2, pedidos: 1 },
  escalar_operacao: { automacao: 3, logistica: 2, relatorios: 2, pedidos: 1 },
  melhorar_controle: { relatorios: 3, financeiro: 2, estoque: 1, crm: 1 },
};

const LEGENDA_OBJETIVO: Record<Objetivo, string> = {
  reduzir_custos: "reduzir custos",
  aumentar_vendas: "aumentar vendas",
  escalar_operacao: "escalar a operação",
  melhorar_controle: "melhorar controle",
};

// ---------- Motor ----------

export function recomendarModulos(opcoes: OpcoesMotor): ModuloRecomendado[] {
  const { respostas, historico, plano, minScore = 1 } = opcoes;

  const pontuacao: Record<string, number> = {};
  const motivos: Record<string, string[]> = {};

  const somar = (id: string, pontos: number, motivo: string) => {
    pontuacao[id] = (pontuacao[id] || 0) + pontos;
    if (!motivos[id]) motivos[id] = [];
    if (!motivos[id].includes(motivo)) motivos[id].push(motivo);
  };

  Object.entries(REGRAS_POR_SETOR[respostas.segmento] || {}).forEach(([id, peso]) => {
    somar(id, peso, `Comum para negócios do setor "${respostas.segmento}"`);
  });

  respostas.areasDesejadas.forEach((area) => {
    const id = MAPA_AREA_MODULO[area];
    if (id) somar(id, 5, "Você indicou interesse direto nessa área");
  });

  const multiCanal = respostas.canais.filter((c) => CANAIS_MARKETPLACE.includes(c)).length >= 2;
  if (multiCanal) {
    somar("pedidos", 3, "Você vende em vários marketplaces — centralizar pedidos evita erro");
    somar("automacao", 2, "Multi-canal se beneficia de automações entre plataformas");
  }
  if (respostas.canais.includes("instagram") || respostas.canais.includes("whatsapp")) {
    somar("crm", 1, "Vendas via redes sociais pedem organização de contatos e leads");
  }

  if (respostas.sistemaGestao === "nenhum") {
    somar("estoque", 2, "Sem ERP hoje — estoque organizado é prioridade");
    somar("financeiro", 2, "Sem ERP hoje — controle financeiro básico é essencial");
  }

  const pesoTamanho = PESO_TAMANHO[respostas.tamanhoOperacao];
  if (pesoTamanho > 0) {
    somar("relatorios", pesoTamanho, "Operações maiores precisam de visibilidade com dashboards");
    somar("automacao", pesoTamanho, "Operações maiores ganham mais tempo automatizando tarefas");
  }

  Object.entries(REGRAS_POR_OBJETIVO[respostas.objetivo] || {}).forEach(([id, peso]) => {
    somar(id, peso, `Alinhado ao seu objetivo: ${LEGENDA_OBJETIVO[respostas.objetivo]}`);
  });

  if (historico?.modulosMaisUsados?.length) {
    historico.modulosMaisUsados.forEach((id, index) => {
      const peso = Math.max(3 - index, 1);
      somar(id, peso, "Você já usa módulos parecidos com frequência");
    });
  }

  const jaAtivos = new Set(historico?.modulosAtivos || []);

  let resultado: ModuloRecomendado[] = CATALOGO_MODULOS
    .filter((m) => !jaAtivos.has(m.id))
    .map((m) => ({ ...m, score: pontuacao[m.id] || 0, motivos: motivos[m.id] || [] }))
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score);

  if (plano?.limiteModulos) {
    resultado = resultado.slice(0, plano.limiteModulos);
  }

  return resultado;
}