const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/auditoriaController");

router.get("/logs", auth, ctrl.listarLogs);
router.get("/alcada", auth, ctrl.getAlcada);
router.post("/alcada", auth, ctrl.salvarAlcada);

module.exports = router;