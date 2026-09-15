const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/logisticsReturnsController");

router.get("/", auth, ctrl.listar);
router.post("/", auth, ctrl.criar);
router.put("/:id/status", auth, ctrl.avancarStatus);
router.post("/:id/reembolso", auth, ctrl.processarReembolso);

module.exports = router;