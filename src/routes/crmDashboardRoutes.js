const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/crmDashboardController");

router.get("/resumo", auth, ctrl.resumo);

module.exports = router;