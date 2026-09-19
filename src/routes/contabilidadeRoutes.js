const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/contabilidadeController");

router.get("/contas", auth, permission("financeiro.ver"), ctrl.listarContas);
router.post("/contas", auth, permission("financeiro.editar"), ctrl.criarConta);
router.put("/contas/:id", auth, permission("financeiro.editar"), ctrl.atualizarConta);
router.delete("/contas/:id", auth, role("admin"), ctrl.desativarConta);

router.get("/lancamentos", auth, permission("financeiro.ver"), ctrl.listarLancamentos);
router.get("/lancamentos/:id", auth, permission("financeiro.ver"), ctrl.detalharLancamento);
router.post("/lancamentos", auth, permission("financeiro.editar"), ctrl.criarLancamento);
router.delete("/lancamentos/:id", auth, role("admin"), ctrl.excluirLancamento);
router.get("/dre", auth, permission("financeiro.ver"), ctrl.dre);
router.get("/balanco", auth, permission("financeiro.ver"), ctrl.balancoPatrimonial);
router.get("/diario", auth, permission("financeiro.ver"), ctrl.livroDiario);
router.get("/razao", auth, permission("financeiro.ver"), ctrl.livroRazao);

router.get("/balancete", auth, permission("financeiro.ver"), ctrl.balancete);

module.exports = router;