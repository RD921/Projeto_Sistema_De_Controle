const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/marketingSegmentsController");

router.get("/campos", auth, permission("marketing.ver"), ctrl.campos);
router.post("/previa", auth, permission("marketing.ver"), ctrl.previa);
router.get("/", auth, permission("marketing.ver"), ctrl.listar);
router.post("/", auth, permission("marketing.editar"), ctrl.criar);
router.post("/:id/membros", auth, permission("marketing.editar"), ctrl.adicionarMembro);
router.get("/:id/membros", auth, permission("marketing.ver"), ctrl.listarMembros);
router.post("/:id/recalcular", auth, permission("marketing.editar"), ctrl.recalcular);
router.delete("/:id", auth, permission("marketing.editar"), ctrl.excluir);

module.exports = router;