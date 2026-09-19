const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const permission = require("../middleware/permissionMiddleware");
const controller = require("../controllers/cardsController");

router.use(auth);
router.get("/", permission("financeiro.ver"), controller.listarCartoes);
router.get("/:id", permission("financeiro.ver"), controller.buscarCartao);
router.post("/", permission("financeiro.editar"), controller.criarCartao);
router.put("/:id", permission("financeiro.editar"), controller.atualizarCartao);
router.delete("/:id", role("admin"), controller.desativarCartao);
router.get("/:id/limite", permission("financeiro.ver"), controller.limiteDisponivel);
router.get("/:cardId/faturas", permission("financeiro.ver"), controller.listarFaturas);

router.get("/transacoes/listar", permission("financeiro.ver"), controller.listarTransacoes);
router.post("/transacoes", permission("financeiro.editar"), controller.lancarTransacao);
router.delete("/transacoes/:id", role("admin"), controller.excluirTransacao);

router.post("/faturas/fechar", permission("financeiro.editar"), controller.fecharFatura);

module.exports = router;