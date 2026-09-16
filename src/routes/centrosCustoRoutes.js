const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/centrosCustoController");

router.get("/", auth, ctrl.listar);
router.post("/", auth, ctrl.criar);
router.put("/:id", auth, ctrl.atualizar);
router.delete("/:id", auth, role("admin"), ctrl.desativar);
router.get("/relatorio", auth, ctrl.relatorio);

module.exports = router;