const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const role = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/comprasController");

router.get("/fornecedores", auth, permission("logistica.ver"), ctrl.listarFornecedores);
router.post("/fornecedores", auth, permission("logistica.editar"), ctrl.criarFornecedor);
router.put("/fornecedores/:id", auth, permission("logistica.editar"), ctrl.atualizarFornecedor);
router.delete("/fornecedores/:id", auth, role("admin"), ctrl.desativarFornecedor);

router.get("/pedidos", auth, permission("logistica.ver"), ctrl.listarPedidos);
router.get("/pedidos/:id", auth, permission("logistica.ver"), ctrl.buscarPedido);
router.post("/pedidos", auth, permission("logistica.editar"), ctrl.criarPedido);
router.put("/pedidos/:id/status", auth, permission("logistica.editar"), ctrl.mudarStatusPedido);
router.get("/cotacoes", auth, permission("logistica.ver"), ctrl.listarCotacoes);
router.get("/cotacoes/:id", auth, permission("logistica.ver"), ctrl.buscarCotacao);
router.post("/cotacoes", auth, permission("logistica.editar"), ctrl.criarCotacao);
router.post("/cotacoes/precos", auth, permission("logistica.editar"), ctrl.registrarPreco);
router.post("/cotacoes/:id/converter", auth, permission("logistica.editar"), ctrl.converterEmPedido);
router.post("/cotacoes/:id/fechar", auth, permission("logistica.editar"), ctrl.fecharCotacao);

module.exports = router;