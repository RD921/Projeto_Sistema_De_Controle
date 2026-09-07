const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/financeiroController");

router.get("/resumo", auth, ctrl.resumo);
router.get("/fluxo-caixa", auth, ctrl.fluxoCaixa);
router.get("/lancamentos", auth, ctrl.listarLancamentos);
router.post("/lancamentos", auth, ctrl.criarLancamento);
router.post("/lancamentos/:id/pagar", auth, ctrl.marcarPago);
router.delete("/lancamentos/:id", auth, ctrl.excluirLancamento);
router.get("/fiscal", auth, ctrl.getDadosFiscais);
router.post("/fiscal", auth, ctrl.salvarDadosFiscais);
router.post("/lancamentos/:id/aprovar", auth, ctrl.aprovarLancamento);
router.post("/lancamentos/:id/rejeitar", auth, ctrl.rejeitarLancamento);
router.get("/contas-pagar", auth, ctrl.contasAPagar);
router.get("/contas-receber", auth, ctrl.contasAReceber);


module.exports = router;