const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const controller = require("../controllers/cardsController");

router.use(auth);
router.get("/", controller.listarCartoes);
router.get("/:id", controller.buscarCartao);
router.post("/", controller.criarCartao);
router.put("/:id", controller.atualizarCartao);
router.delete("/:id", controller.desativarCartao);
router.get("/:id/limite", controller.limiteDisponivel);
router.get("/:cardId/faturas", controller.listarFaturas);

router.get("/transacoes/listar", controller.listarTransacoes);
router.post("/transacoes", controller.lancarTransacao);
router.delete("/transacoes/:id", controller.excluirTransacao);

router.post("/faturas/fechar", controller.fecharFatura);

module.exports = router;