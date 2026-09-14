const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/marketingCampaignsController");

router.get("/", auth, ctrl.listar);
router.post("/", auth, ctrl.criar);
router.post("/:id/ativar", auth, ctrl.ativar);
router.post("/:id/pausar", auth, ctrl.pausar);
router.delete("/:id", auth, ctrl.excluir);

module.exports = router;