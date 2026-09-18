const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/marketingLeadsController");

router.get("/", auth, permission("marketing.ver"), ctrl.listar);
router.post("/", auth, permission("marketing.editar"), ctrl.criar);
router.put("/:id/status", auth, permission("marketing.editar"), ctrl.atualizarStatus);
router.put("/:id/score", auth, permission("marketing.editar"), ctrl.ajustarScore);
router.delete("/:id", auth, permission("marketing.editar"), ctrl.excluir);
router.put("/:id/vincular-cliente", auth, permission("marketing.editar"), ctrl.vincularCliente);

module.exports = router;