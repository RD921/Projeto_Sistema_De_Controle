// Central de Marketing: captação, funis, recuperação, tarefas, análises e Aria.
// Leitura exige marketing.ver; qualquer alteração exige marketing.editar.
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const tracking = require("../controllers/marketingTrackingController");
const funnels = require("../controllers/marketingFunnelsController");
const tasks = require("../controllers/marketingTasksController");
const central = require("../controllers/marketingCentralController");

const ver = [auth, permission("marketing.ver")];
const editar = [auth, permission("marketing.editar")];

// PÚBLICO: link curto rastreável
router.get("/r/:slug", tracking.redirecionar);

// Visão geral e análises
router.get("/overview", ...ver, central.visaoGeral);
router.get("/analise/canais", ...ver, central.analiseCanais);
router.get("/campanhas/:id/desempenho", ...ver, central.desempenhoCampanha);
router.post("/sincronizar", ...editar, central.sincronizar);

// Links rastreáveis e investimento
router.get("/links", ...ver, tracking.listarLinks);
router.post("/links", ...editar, tracking.criarLink);
router.put("/links/:id", ...editar, tracking.alternarLink);
router.delete("/links/:id", ...editar, tracking.excluirLink);
router.get("/investimentos", ...ver, tracking.listarInvestimentos);
router.post("/investimentos", ...editar, tracking.registrarInvestimento);
router.delete("/investimentos/:id", ...editar, tracking.excluirInvestimento);

// Funis
router.get("/funnels", ...ver, funnels.listar);
router.post("/funnels", ...editar, funnels.criar);
router.put("/funnels/etapas/:stageId", ...editar, funnels.renomearEtapa);
router.delete("/funnels/etapas/:stageId", ...editar, funnels.excluirEtapa);
router.get("/funnels/:id/analise", ...ver, funnels.analise);
router.put("/funnels/:id", ...editar, funnels.renomear);
router.delete("/funnels/:id", ...editar, funnels.excluir);
router.post("/funnels/:id/etapas", ...editar, funnels.adicionarEtapa);

// Tarefas
router.get("/tasks", ...ver, tasks.listar);
router.post("/tasks", ...editar, tasks.criar);
router.put("/tasks/:id", ...editar, tasks.atualizar);
router.post("/tasks/:id/aprovar", ...editar, tasks.aprovar);

// Recuperação de oportunidades
router.get("/recovery/regras", ...ver, tasks.recuperacaoRegras);
router.put("/recovery/regras/:id", ...editar, tasks.recuperacaoAtualizarRegra);
router.get("/recovery/oportunidades", ...ver, tasks.recuperacaoOportunidades);
router.post("/recovery/executar", ...editar, tasks.recuperacaoExecutar);

// Aria
router.get("/aria/recomendacoes", ...ver, central.recomendacoes);
router.post("/aria/recomendacoes/:id/aceitar", ...editar, central.aceitarRecomendacao);
router.post("/aria/recomendacoes/:id/descartar", ...editar, central.descartarRecomendacao);
router.get("/aria/contexto", ...ver, central.contexto);
router.get("/aria/estrategias", ...ver, central.estrategias);
router.post("/aria/estrategias", ...editar, central.criarEstrategia);
router.post("/aria/estrategias/:id/aplicar", ...editar, central.aplicarEstrategia);
router.post("/aria/estrategias/:id/descartar", ...editar, central.descartarEstrategia);
router.post("/aria/planejar-aquisicao", ...ver, central.planejarAquisicao);

module.exports = router;
