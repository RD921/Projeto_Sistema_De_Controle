const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/marketingJourneysController");

router.get("/campaigns/:id/enrollments", auth, permission("marketing.ver"), ctrl.listarEnrollments);

module.exports = router;