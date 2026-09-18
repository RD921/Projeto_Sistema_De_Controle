const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/financeiroController");

router.get("/resumo", auth, permission("financeiro.ver"), ctrl.resumo);
router.get("/fluxo-caixa", auth, permission("financeiro.ver"), ctrl.fluxoCaixa);
router.get("/lancamentos", auth, permission("financeiro.ver"), ctrl.listarLancamentos);
router.post("/lancamentos", auth, permission("financeiro.editar"), ctrl.criarLancamento);
router.post("/lancamentos/:id/pagar", auth, permission("financeiro.editar"), ctrl.marcarPago);
router.delete("/lancamentos/:id", auth, role("admin"), ctrl.excluirLancamento);
router.get("/fiscal", auth, permission("financeiro.ver"), ctrl.getDadosFiscais);
router.post("/fiscal", auth, permission("financeiro.editar"), ctrl.salvarDadosFiscais);
router.post("/lancamentos/:id/aprovar", auth, permission("financeiro.editar"), ctrl.aprovarLancamento);
router.post("/lancamentos/:id/rejeitar", auth, permission("financeiro.editar"), ctrl.rejeitarLancamento);
router.get("/contas-pagar", auth, permission("financeiro.ver"), ctrl.contasAPagar);
router.get("/contas-receber", auth, permission("financeiro.ver"), ctrl.contasAReceber);

module.exports = router;