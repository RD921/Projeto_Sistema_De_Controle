const express = require("express");
const router = express.Router();
const { recomendarModulosController } = require("../controllers/moduleRecommendationController");

router.post("/recomendacao", recomendarModulosController);

module.exports = router;
