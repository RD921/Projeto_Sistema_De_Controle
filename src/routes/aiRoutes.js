// src/routes/aiRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const tenantMiddleware = require("../middleware/tenantMiddleware");
const aiController = require("../controllers/aiController");

router.post("/chat", auth, tenantMiddleware, aiController.chat);

module.exports = router;