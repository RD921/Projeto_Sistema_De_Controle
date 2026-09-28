const jwt = require("jsonwebtoken");
const pool = require("../src/config/db");

const BASE_URL = "http://localhost:3000";

const MOUNTS = [
  ["/api/automations", "../src/automation/routes/automationRoutes"],
  ["/api/auth", "../src/routes/authRoutes"],
  ["/api/users", "../src/routes/userRoutes"],
  ["/api/products", "../src/routes/productRoutes"],
  ["/api/orders", "../src/routes/orderRoutes"],
  ["/api/customers", "../src/routes/customerRoutes"],
  ["/api/integrations", "../src/routes/integrationRoutes"],
  ["/api/webhooks/automation", "../src/automation/routes/automationWebhookRoutes"],
  ["/api/webhooks", "../src/routes/webhookRoutes"],
  ["/api/reports", "../src/routes/reportRoutes"],
  ["/api/tenants", "../src/routes/tenantRoutes"],
  ["/api/plans", "../src/routes/planRoutes"],
  ["/api/marketing", "../src/routes/marketingRoutes"],
  ["/api/events", "../src/routes/eventRoutes"],
  ["/api/ai", "../src/routes/aiRoutes"],
  ["/api/onboarding", "../src/routes/onboardingRoutes"],
  ["/api/modules", "../src/routes/moduleRoutes"],
  ["/api/integrations-catalog", "../src/routes/integrationCatalogRoutes"],
  ["/api/financeiro", "../src/routes/financeiroRoutes"],
  ["/api/google", "../src/routes/googleRoutes"],
  ["/api/contabilidade", "../src/routes/contabilidadeRoutes"],
  ["/api/obrigacoes", "../src/routes/obrigacoesRoutes"],
  ["/api/documentos", "../src/routes/documentosRoutes"],
  ["/api/bancos", "../src/routes/bancosRoutes"],
  ["/api/centros-custo", "../src/routes/centrosCustoRoutes"],
  ["/api/motor-financeiro", "../src/routes/motorFinanceiroRoutes"],
  ["/api/rentabilidade", "../src/routes/rentabilidadeRoutes"],
  ["/api/fluxo-preditivo", "../src/routes/fluxoPreditivoRoutes"],
  ["/api/tesouraria", "../src/routes/tesourariaRoutes"],
  ["/api/orcamento", "../src/routes/orcamentoRoutes"],
  ["/api/automacao-financeira", "../src/routes/automacaoFinanceiraRoutes"],
  ["/api/alertas", "../src/routes/alertasRoutes"],
  ["/api/fechamento", "../src/routes/fechamentoRoutes"],
  ["/api/auditoria", "../src/routes/auditoriaRoutes"],
  ["/api/fiscal-profundo", "../src/routes/fiscalProfundoRoutes"],
  ["/api/contratos", "../src/routes/contractsRoutes"],
  ["/api/cartoes", "../src/routes/cardsRoutes"],
  ["/api/cenarios", "../src/routes/scenarioRoutes"],
  ["/api/marketing/leads", "../src/routes/marketingLeadsRoutes"],
  ["/api/marketing/segments", "../src/routes/marketingSegmentsRoutes"],
  ["/api/marketing/campaigns", "../src/routes/marketingCampaignsRoutes"],
  ["/api/marketing/scoring", "../src/routes/marketingScoringRoutes"],
  ["/api/marketing/attribution", "../src/routes/marketingAttributionRoutes"],
  ["/api/marketing/journeys", "../src/routes/marketingJourneysRoutes"],
  ["/api/marketing/dashboard", "../src/routes/marketingDashboardRoutes"],
  ["/api/marketing/forms", "../src/routes/marketingFormsRoutes"],
  ["/api/marketing/landing-pages", "../src/routes/marketingLandingPagesRoutes"],
  ["/api/marketing/ab-tests", "../src/routes/marketingAbTestsRoutes"],
  ["/api/stock", "../src/routes/stockRoutes"],
  ["/api/crm", "../src/routes/crmRoutes"],
  ["/api/crm/dashboard", "../src/routes/crmDashboardRoutes"],
  ["/api/bi", "../src/routes/biRoutes"],
  ["/api/fiscal-documents", "../src/routes/fiscalDocumentsRoutes"],
  ["/api/logistica", "../src/routes/logisticsRoutes"],
  ["/api/logistica/devolucoes", "../src/routes/logisticsReturnsRoutes"],
  ["/api/settings", "../src/routes/settingsRoutes"],
  ["/api/sac", "../src/routes/sacRoutes"],
  ["/api/compras", "../src/routes/comprasRoutes"],
  ["/api/certificado-digital", "../src/routes/certificadoDigitalRoutes"],
  ["/assistente", "../src/routes/ariaAcoes"],
];

function extractGetRoutes(router) {
  const out = [];
  if (!router || !router.stack) return out;
  router.stack.forEach(layer => {
    if (layer.route) {
      const methods = layer.route.methods || {};
      if (methods.get) out.push(layer.route.path);
    }
  });
  return out;
}

function montarPathFinal(prefix, subPath) {
  let full = (prefix + subPath).replace(/\/+/g, "/");
  full = full.replace(/:[a-zA-Z0-9_]+/g, "1");
  return full;
}

async function main() {
  const [[usuario]] = await pool.query("SELECT id, tenant_id, nome, email FROM users LIMIT 1");
  const token = jwt.sign(
    { id: usuario.id, tenant_id: usuario.tenant_id, nome: usuario.nome, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );

  const todasRotas = [];
  for (const [prefix, requirePath] of MOUNTS) {
    let router;
    try {
      router = require(requirePath);
    } catch (err) {
      console.log(`FALHA AO CARREGAR ROUTER  ${prefix}  (${requirePath})  -> ${err.message}`);
      continue;
    }
    const subPaths = extractGetRoutes(router);
    subPaths.forEach(sp => {
      todasRotas.push(montarPathFinal(prefix, sp));
    });
  }

  const rotasUnicas = [...new Set(todasRotas)];
  console.log(`Total de rotas GET descobertas automaticamente: ${rotasUnicas.length}\n`);

  const erros500 = [];
  const outros = [];
  let okCount = 0;

  for (const rota of rotasUnicas) {
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
        okCount++;
      } else {
        outros.push({ rota, status });
      }
    } catch (err) {
      erros500.push({ rota, corpo: err.message });
      console.log(`FALHA DE CONEXAO  ${rota}  ${err.message}`);
    }
  }

  console.log(`\n=== RESUMO ===`);
  console.log(`Total testado: ${rotasUnicas.length}`);
  console.log(`OK (200/304): ${okCount}`);
  console.log(`Outros status (404/401/403 etc): ${outros.length}`);
  console.log(`ERROS 500: ${erros500.length}`);
  if (erros500.length > 0) {
    console.log("\nDetalhes dos erros 500:");
    erros500.forEach(e => console.log(`  - ${e.rota}: ${e.corpo}`));
  }
  if (outros.length > 0 && outros.length <= 60) {
    console.log("\nOutros status (referência):");
    outros.forEach(o => console.log(`  - ${o.status}  ${o.rota}`));
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });