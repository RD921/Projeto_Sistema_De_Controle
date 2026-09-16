const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/bancosController");

router.get("/contas", auth, ctrl.listarContas);
router.post("/contas", auth, ctrl.criarConta);
router.delete("/contas/:id", auth, role("admin"), ctrl.desativarConta);

router.get("/transacoes", auth, ctrl.listarTransacoes);
router.post("/transacoes", auth, ctrl.criarTransacao);
router.delete("/transacoes/:id", auth, role("admin"), ctrl.excluirTransacao);

router.get("/conciliacao/sugestoes", auth, ctrl.sugerirConciliacao);
router.post("/transacoes/:id/conciliar", auth, ctrl.conciliar);
router.post("/transacoes/:id/desconciliar", auth, role("admin"), ctrl.desconciliar);

module.exports = router;