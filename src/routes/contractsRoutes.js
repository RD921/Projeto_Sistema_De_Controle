const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const controller = require("../controllers/contractsController");

router.use(auth);
router.get("/", controller.listar);
router.get("/vencimentos", controller.vencimentosProximos);
router.get("/:id", controller.buscarPorId);
router.post("/", controller.criar);
router.post("/gerar-lancamentos", controller.gerarLancamentos);
router.put("/:id", controller.atualizar);
router.post("/:id/status", controller.mudarStatus);
router.delete("/:id", controller.excluir);

module.exports = router;