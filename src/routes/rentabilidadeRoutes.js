const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/rentabilidadeController");

router.get("/produtos", auth, ctrl.porProduto);
router.get("/clientes", auth, ctrl.porCliente);
router.get("/canal", auth, ctrl.porCanal);
router.get("/periodo", auth, ctrl.porPeriodo);

module.exports = router;