const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const controller = require("../controllers/fiscalProfundoController");

router.use(auth);
router.get("/calcular", controller.calcular);
router.get("/calculo", controller.buscarCalculo);
router.get("/historico", controller.historico);
router.post("/gerar-guia", controller.gerarGuia);

module.exports = router;