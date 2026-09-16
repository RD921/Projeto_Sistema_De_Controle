const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/sacController");

router.get("/tickets", auth, ctrl.listarTickets);
router.get("/tickets/:id", auth, ctrl.buscarTicket);
router.post("/tickets", auth, ctrl.criarTicket);
router.put("/tickets/:id/status", auth, ctrl.atualizarStatus);
router.put("/tickets/:id/prioridade", auth, ctrl.atualizarPrioridade);
router.put("/tickets/:id/responsavel", auth, ctrl.atribuirResponsavel);
router.post("/tickets/:id/mensagens", auth, ctrl.enviarMensagem);
router.get("/metricas", auth, ctrl.metricas);

module.exports = router;