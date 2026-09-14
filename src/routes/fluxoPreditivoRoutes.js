const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/fluxoPreditivoController");

router.get("/projecao", auth, ctrl.projecao);

module.exports = router;