const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/marketingAttributionController");

router.post("/campaigns/:id/calcular", auth, permission("marketing.editar"), ctrl.calcularConversoes);
router.get("/campaigns/:id/roi", auth, permission("marketing.ver"), ctrl.roiCampanha);

module.exports = router;