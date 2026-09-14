const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/marketingJourneysController");

router.get("/campaigns/:id/enrollments", auth, ctrl.listarEnrollments);

module.exports = router;