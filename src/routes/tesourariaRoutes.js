const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/tesourariaController");

router.get("/posicao", auth, ctrl.posicao);
router.get("/transferencias", auth, ctrl.listarTransferencias);
router.post("/transferencias", auth, ctrl.criarTransferencia);
router.get("/investimentos", auth, ctrl.listarInvestimentos);
router.post("/investimentos", auth, ctrl.criarInvestimento);
router.put("/investimentos/:id/valor", auth, ctrl.atualizarValorAtual);
router.post("/investimentos/:id/resgatar", auth, ctrl.resgatarInvestimento);

module.exports = router;