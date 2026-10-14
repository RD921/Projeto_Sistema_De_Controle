const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/marketingLandingPagesController");

router.get("/", auth, permission("marketing.ver"), ctrl.listar);
router.get("/:id", auth, permission("marketing.ver"), ctrl.obter);
router.post("/", auth, permission("marketing.editar"), ctrl.criar);
router.post("/:id/publicar", auth, permission("marketing.editar"), ctrl.publicar);
router.delete("/:id", auth, permission("marketing.editar"), ctrl.excluir);

// Rota PUBLICA - sem autenticacao
router.get("/public/:tenantId/:slug", ctrl.renderizarPublica);

module.exports = router;