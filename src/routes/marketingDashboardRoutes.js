const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/marketingDashboardController");

router.get("/resumo", auth, permission("marketing.ver"), ctrl.resumo);

module.exports = router;