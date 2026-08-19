/**
 * Teste rápido do motor de recomendação.
 * Rodar com: npx ts-node src/testeMotor.ts
 */

import { recomendarModulos, RespostasOnboarding } from "./moduleRecommendationEngine";

const respostasExemplo: RespostasOnboarding = {
  segmento: "ecommerce",
  canais: ["loja_virtual", "mercado_livre", "shopee", "amazon", "instagram", "whatsapp"],
  sistemaGestao: "bling",
  areasDesejadas: ["gestao_pedidos", "estoque", "financeiro", "marketing"],
  tamanhoOperacao: "media",
  objetivo: "reduzir_custos",
};

const recomendacoes = recomendarModulos({ respostas: respostasExemplo });

console.log("=== Módulos recomendados ===\n");
recomendacoes.forEach((m, i) => {
  console.log(`${i + 1}. ${m.nome} (score: ${m.score})`);
  console.log(`   ${m.descricao}`);
  console.log(`   Motivos: ${m.motivos.join(" | ")}\n`);
});
