const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/marketingAttributionController");

router.post("/campaigns/:id/calcular", auth, ctrl.calcularConversoes);
router.get("/campaigns/:id/roi", auth, ctrl.roiCampanha);

module.exports = router;