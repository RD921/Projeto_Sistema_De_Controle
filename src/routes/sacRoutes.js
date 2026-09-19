const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/sacController");

router.get("/tickets", auth, permission("sac.ver"), ctrl.listarTickets);
router.get("/tickets/:id", auth, permission("sac.ver"), ctrl.buscarTicket);
router.post("/tickets", auth, permission("sac.editar"), ctrl.criarTicket);
router.put("/tickets/:id/status", auth, permission("sac.editar"), ctrl.atualizarStatus);
router.put("/tickets/:id/prioridade", auth, permission("sac.editar"), ctrl.atualizarPrioridade);
router.put("/tickets/:id/responsavel", auth, permission("sac.editar"), ctrl.atribuirResponsavel);
router.post("/tickets/:id/mensagens", auth, permission("sac.editar"), ctrl.enviarMensagem);
router.get("/metricas", auth, permission("sac.ver"), ctrl.metricas);
router.get("/equipes", auth, permission("sac.ver"), ctrl.listarEquipes);
router.post("/equipes", auth, role("admin"), ctrl.criarEquipe);
router.post("/equipes/:id/membros", auth, role("admin"), ctrl.adicionarMembro);
router.delete("/equipes/:id/membros/:userId", auth, role("admin"), ctrl.removerMembro);

router.get("/filas", auth, permission("sac.ver"), ctrl.listarFilas);
router.post("/filas", auth, role("admin"), ctrl.criarFila);
router.delete("/filas/:id", auth, role("admin"), ctrl.desativarFila);
router.put("/tickets/:id/fila", auth, permission("sac.editar"), ctrl.atribuirFila);

router.get("/tickets/:id/contexto", auth, permission("sac.ver"), ctrl.contextoTicket);
router.get("/sla/regras", auth, permission("sac.ver"), ctrl.listarSlaRegras);
router.put("/sla/regras", auth, role("admin"), ctrl.atualizarSlaRegra);
router.get("/sla/indicadores", auth, permission("sac.ver"), ctrl.indicadoresSla);
router.get("/kb/artigos", auth, permission("sac.ver"), ctrl.listarArtigos);
router.get("/kb/artigos/:id", auth, permission("sac.ver"), ctrl.buscarArtigo);
router.post("/kb/artigos", auth, permission("sac.editar"), ctrl.criarArtigo);
router.put("/kb/artigos/:id", auth, permission("sac.editar"), ctrl.atualizarArtigo);
router.delete("/kb/artigos/:id", auth, role("admin"), ctrl.excluirArtigo);

router.get("/respostas-rapidas", auth, permission("sac.ver"), ctrl.listarRespostasRapidas);
router.post("/respostas-rapidas", auth, permission("sac.editar"), ctrl.criarRespostaRapida);
router.delete("/respostas-rapidas/:id", auth, permission("sac.editar"), ctrl.desativarRespostaRapida);
router.get("/respostas-rapidas/:id/aplicar", auth, permission("sac.ver"), ctrl.aplicarRespostaRapida);
router.post("/sla/verificar", auth, permission("sac.editar"), ctrl.verificarSlaVencimentos);
router.post("/tickets/:id/avaliacao", auth, permission("sac.editar"), ctrl.avaliarTicket);
router.get("/tickets/:id/avaliacao", auth, permission("sac.ver"), ctrl.buscarAvaliacaoTicket);
router.get("/qualidade/indicadores", auth, permission("sac.ver"), ctrl.indicadoresQualidade);
router.get("/relatorio", auth, permission("sac.ver"), ctrl.relatorio);

module.exports = router;