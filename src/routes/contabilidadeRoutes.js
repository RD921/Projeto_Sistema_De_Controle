const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/contabilidadeController");

router.get("/contas", auth, ctrl.listarContas);
router.post("/contas", auth, ctrl.criarConta);
router.put("/contas/:id", auth, ctrl.atualizarConta);
router.delete("/contas/:id", auth, ctrl.desativarConta);

router.get("/lancamentos", auth, ctrl.listarLancamentos);
router.get("/lancamentos/:id", auth, ctrl.detalharLancamento);
router.post("/lancamentos", auth, ctrl.criarLancamento);
router.delete("/lancamentos/:id", auth, ctrl.excluirLancamento);
router.get("/dre", auth, ctrl.dre);
router.get("/balanco", auth, ctrl.balancoPatrimonial);
router.get("/diario", auth, ctrl.livroDiario);
router.get("/razao", auth, ctrl.livroRazao);

router.get("/balancete", auth, ctrl.balancete);

module.exports = router;