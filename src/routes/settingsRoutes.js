const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/settingsController");

router.get("/overview", auth, ctrl.overview);

module.exports = router;