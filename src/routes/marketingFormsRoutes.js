const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/marketingFormsController");

// Rotas administrativas (exigem login)
router.get("/", auth, permission("marketing.ver"), ctrl.listar);
router.post("/", auth, permission("marketing.editar"), ctrl.criar);
router.get("/:id/submissoes", auth, permission("marketing.ver"), ctrl.listarSubmissoes);
router.put("/:id", auth, permission("marketing.editar"), ctrl.atualizar);
router.delete("/:id", auth, permission("marketing.editar"), ctrl.excluir);

// Rota PUBLICA - sem middleware auth, protegida so pelo token na URL
router.post("/public/:token", ctrl.submeter);

module.exports = router;