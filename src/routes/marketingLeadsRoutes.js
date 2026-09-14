const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/marketingLeadsController");

router.get("/", auth, ctrl.listar);
router.post("/", auth, ctrl.criar);
router.put("/:id/status", auth, ctrl.atualizarStatus);
router.put("/:id/score", auth, ctrl.ajustarScore);
router.delete("/:id", auth, ctrl.excluir);
router.put("/:id/vincular-cliente", auth, ctrl.vincularCliente);

module.exports = router;