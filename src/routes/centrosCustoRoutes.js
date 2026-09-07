const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/centrosCustoController");

router.get("/", auth, ctrl.listar);
router.post("/", auth, ctrl.criar);
router.put("/:id", auth, ctrl.atualizar);
router.delete("/:id", auth, ctrl.desativar);
router.get("/relatorio", auth, ctrl.relatorio);

module.exports = router;