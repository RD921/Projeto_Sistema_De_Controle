const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/bancosController");

router.get("/contas", auth, permission("financeiro.ver"), ctrl.listarContas);
router.post("/contas", auth, permission("financeiro.editar"), ctrl.criarConta);
router.delete("/contas/:id", auth, role("admin"), ctrl.desativarConta);

router.get("/transacoes", auth, permission("financeiro.ver"), ctrl.listarTransacoes);
router.post("/transacoes", auth, permission("financeiro.editar"), ctrl.criarTransacao);
router.delete("/transacoes/:id", auth, role("admin"), ctrl.excluirTransacao);

router.get("/conciliacao/sugestoes", auth, permission("financeiro.ver"), ctrl.sugerirConciliacao);
router.post("/transacoes/:id/conciliar", auth, permission("financeiro.editar"), ctrl.conciliar);
router.post("/transacoes/:id/desconciliar", auth, role("admin"), ctrl.desconciliar);

module.exports = router;