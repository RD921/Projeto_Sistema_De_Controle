const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/motorFinanceiroController");

router.get("/configuracoes", auth, ctrl.getConfiguracoes);
router.post("/configuracoes", auth, ctrl.salvarConfiguracoes);
router.post("/processar/:orderId", auth, ctrl.processarPedido);
router.post("/processar-pendentes", auth, ctrl.processarPendentes);
router.get("/breakdowns", auth, ctrl.listarBreakdowns);
router.get("/resumo", auth, ctrl.resumo);

module.exports = router;