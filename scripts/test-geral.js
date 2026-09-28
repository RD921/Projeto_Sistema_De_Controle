const jwt = require("jsonwebtoken");
const pool = require("../src/config/db");

const BASE_URL = "http://localhost:3000";

const ENDPOINTS = [
  "/api/auth/minhas-empresas",
  "/api/products",
  "/api/orders",
  "/api/customers",
  "/api/modules",
  "/api/financeiro",
  "/api/settings/overview",
  "/api/settings/ia",
  "/api/settings/seguranca",
  "/api/settings/checklist",
  "/api/sac/tickets",
  "/api/sac/filas",
  "/api/sac/respostas-rapidas",
  "/api/logistica/depositos",
  "/api/logistica/transportadoras",
  "/api/logistica/entregas",
  "/api/logistica/devolucoes",
  "/api/contabilidade",
  "/api/obrigacoes",
  "/api/documentos",
  "/api/bancos",
  "/api/centros-custo",
  "/api/motor-financeiro",
  "/api/rentabilidade",
  "/api/fluxo-preditivo",
  "/api/tesouraria",
  "/api/orcamento",
  "/api/automacao-financeira",
  "/api/alertas",
  "/api/fechamento",
  "/api/auditoria",
  "/api/fiscal-profundo",
  "/api/contratos",
  "/api/cartoes",
  "/api/cenarios",
  "/api/marketing/leads",
  "/api/marketing/segments",
  "/api/marketing/campaigns",
  "/api/marketing/scoring",
  "/api/marketing/attribution",
  "/api/marketing/journeys",
  "/api/marketing/dashboard",
  "/api/marketing/forms",
  "/api/marketing/landing-pages",
  "/api/marketing/ab-tests",
  "/api/stock",
  "/api/crm",
  "/api/crm/dashboard",
  "/api/bi",
  "/api/fiscal-documents",
  "/api/compras",
  "/api/certificado-digital",
  "/api/onboarding",
  "/api/automations",
  "/api/integrations",
  "/api/integrations-catalog",
  "/api/reports",
  "/api/tenants",
  "/api/plans",
  "/api/events",
  "/api/ai",
  "/api/users",
];

async function main() {
  const [[usuario]] = await pool.query("SELECT id, tenant_id, nome, email FROM users LIMIT 1");
  if (!usuario) {
    console.error("Nenhum usuário encontrado no banco pra gerar o token de teste.");
    process.exit(1);
  }

  const token = jwt.sign(
    { id: usuario.id, tenant_id: usuario.tenant_id, nome: usuario.nome, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  console.log(`Testando como usuário: ${usuario.nome} (id=${usuario.id}, tenant=${usuario.tenant_id})\n`);

  const erros500 = [];
  const outros = [];

  for (const rota of ENDPOINTS) {
    try {
      const resp = await fetch(BASE_URL + rota, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const status = resp.status;
      if (status === 500) {
        let corpo = "";
        try { corpo = JSON.stringify(await resp.json()); } catch {}
        erros500.push({ rota, corpo });
        console.log(`ERRO 500  ${rota}  ${corpo}`);
      } else if (status === 200 || status === 304) {
        console.log(`OK  ${status}  ${rota}`);
      } else {
        outros.push({ rota, status });
        console.log(`--  ${status}  ${rota}`);
      }
    } catch (err) {
      erros500.push({ rota, corpo: err.message });
      console.log(`FALHA DE CONEXAO  ${rota}  ${err.message}`);
    }
  }

  console.log("\n\n=== TESTANDO A ARIA (chat) ===");
  try {
    const resp = await fetch(BASE_URL + "/api/marketing/chat", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ mensagens: [{ role: "user", content: "Oi, isso é um teste automático. Responda só 'ok'." }] }),
    });
    const status = resp.status;
    let corpo = "";
    try { corpo = JSON.stringify(await resp.json()); } catch {}
    console.log(`Aria respondeu com status ${status}: ${corpo}`);
  } catch (err) {
    console.log(`Falha ao testar a Aria: ${err.message}`);
  }

  console.log("\n\n=== RESUMO ===");
  console.log(`Total de rotas testadas: ${ENDPOINTS.length}`);
  console.log(`Erros 500: ${erros500.length}`);
  if (erros500.length > 0) {
    erros500.forEach(e => console.log(`  - ${e.rota}: ${e.corpo}`));
  }
  console.log(`Outros status (404/401/403 etc — normalmente esperado se a rota não existe naquele caminho exato): ${outros.length}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });