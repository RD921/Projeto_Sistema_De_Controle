const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/orcamentoController");

router.get("/", auth, permission("financeiro.ver"), ctrl.listar);
router.post("/", auth, permission("financeiro.editar"), ctrl.criar);
router.delete("/:id", auth, role("admin"), ctrl.excluir);
router.post("/copiar", auth, permission("financeiro.editar"), ctrl.copiar);

module.exports = router;
