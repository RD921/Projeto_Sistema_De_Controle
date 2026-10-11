const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/marketingCampaignsController");

router.get("/", auth, permission("marketing.ver"), ctrl.listar);
router.post("/", auth, permission("marketing.editar"), ctrl.criar);
router.put("/:id", auth, permission("marketing.editar"), ctrl.atualizar);
router.post("/:id/ativar", auth, permission("marketing.editar"), ctrl.ativar);
router.post("/:id/finalizar", auth, permission("marketing.editar"), ctrl.finalizar);
router.post("/:id/pausar", auth, permission("marketing.editar"), ctrl.pausar);
router.delete("/:id", auth, permission("marketing.editar"), ctrl.excluir);

module.exports = router;