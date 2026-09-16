const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/sacController");

router.get("/tickets", auth, ctrl.listarTickets);
router.get("/tickets/:id", auth, ctrl.buscarTicket);
router.post("/tickets", auth, ctrl.criarTicket);
router.put("/tickets/:id/status", auth, ctrl.atualizarStatus);
router.put("/tickets/:id/prioridade", auth, ctrl.atualizarPrioridade);
router.put("/tickets/:id/responsavel", auth, ctrl.atribuirResponsavel);
router.post("/tickets/:id/mensagens", auth, ctrl.enviarMensagem);
router.get("/metricas", auth, ctrl.metricas);
router.get("/equipes", auth, ctrl.listarEquipes);
router.post("/equipes", auth, role("admin"), ctrl.criarEquipe);
router.post("/equipes/:id/membros", auth, role("admin"), ctrl.adicionarMembro);
router.delete("/equipes/:id/membros/:userId", auth, role("admin"), ctrl.removerMembro);

router.get("/filas", auth, ctrl.listarFilas);
router.post("/filas", auth, role("admin"), ctrl.criarFila);
router.delete("/filas/:id", auth, role("admin"), ctrl.desativarFila);
router.put("/tickets/:id/fila", auth, ctrl.atribuirFila);

router.get("/tickets/:id/contexto", auth, ctrl.contextoTicket);
router.get("/sla/regras", auth, ctrl.listarSlaRegras);
router.put("/sla/regras", auth, role("admin"), ctrl.atualizarSlaRegra);
router.get("/sla/indicadores", auth, ctrl.indicadoresSla);

module.exports = router;