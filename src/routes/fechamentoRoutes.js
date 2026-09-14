const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/fechamentoController");

router.get("/checklist", auth, ctrl.checklist);

module.exports = router;