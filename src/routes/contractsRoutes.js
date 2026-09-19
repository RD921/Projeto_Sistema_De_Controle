const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const permission = require("../middleware/permissionMiddleware");
const controller = require("../controllers/contractsController");

router.use(auth);
router.get("/", permission("financeiro.ver"), controller.listar);
router.get("/vencimentos", permission("financeiro.ver"), controller.vencimentosProximos);
router.get("/:id", permission("financeiro.ver"), controller.buscarPorId);
router.post("/", permission("financeiro.editar"), controller.criar);
router.post("/gerar-lancamentos", permission("financeiro.editar"), controller.gerarLancamentos);
router.put("/:id", permission("financeiro.editar"), controller.atualizar);
router.post("/:id/status", permission("financeiro.editar"), controller.mudarStatus);
router.delete("/:id", role("admin"), controller.excluir);

module.exports = router;