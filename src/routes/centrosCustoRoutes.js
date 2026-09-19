const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/centrosCustoController");

router.get("/", auth, permission("financeiro.ver"), ctrl.listar);
router.post("/", auth, permission("financeiro.editar"), ctrl.criar);
router.put("/:id", auth, permission("financeiro.editar"), ctrl.atualizar);
router.delete("/:id", auth, role("admin"), ctrl.desativar);
router.get("/relatorio", auth, permission("financeiro.ver"), ctrl.relatorio);

module.exports = router;