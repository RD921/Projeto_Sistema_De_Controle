const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/stockController");

router.post("/:id/ajustar", auth, ctrl.ajustar);
router.get("/:id/historico", auth, ctrl.historico);
router.get("/baixo", auth, ctrl.produtosComEstoqueBaixo);

module.exports = router;