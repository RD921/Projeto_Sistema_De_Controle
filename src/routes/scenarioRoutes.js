const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const permission = require("../middleware/permissionMiddleware");
const controller = require("../controllers/scenarioController");

router.use(auth);
router.post("/simular", permission("financeiro.ver"), controller.simular);
router.get("/", permission("financeiro.ver"), controller.listar);
router.post("/", permission("financeiro.editar"), controller.salvar);
router.get("/:id", permission("financeiro.ver"), controller.buscarPorId);
router.delete("/:id", role("admin"), controller.excluir);

module.exports = router;