// src/routes/onboardingRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/onboardingController");

router.get("/", auth, ctrl.get);
router.post("/", auth, ctrl.save);
router.post("/complete", auth, ctrl.complete);

module.exports = router;