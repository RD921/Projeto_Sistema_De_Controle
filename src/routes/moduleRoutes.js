// src/routes/moduleRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/moduleController");

router.get("/", auth, ctrl.list);
router.post("/:id/install", auth, ctrl.install);
router.post("/:id/uninstall", auth, ctrl.uninstall);

module.exports = router;