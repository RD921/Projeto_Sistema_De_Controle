const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/marketingFormsController");

// Rotas administrativas (exigem login)
router.get("/", auth, ctrl.listar);
router.post("/", auth, ctrl.criar);
router.get("/:id/submissoes", auth, ctrl.listarSubmissoes);
router.delete("/:id", auth, ctrl.excluir);

// Rota PUBLICA - sem middleware auth, protegida so pelo token na URL
router.post("/public/:token", ctrl.submeter);

module.exports = router;