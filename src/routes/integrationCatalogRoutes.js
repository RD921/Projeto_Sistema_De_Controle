// src/routes/integrationCatalogRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/integrationCatalogController");

router.get("/", auth, ctrl.list);
router.post("/:id/connect", auth, ctrl.connect);
router.post("/:id/disconnect", auth, ctrl.disconnect);

module.exports = router;