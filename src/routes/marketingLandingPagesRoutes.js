const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/marketingLandingPagesController");

router.get("/", auth, ctrl.listar);
router.get("/:id", auth, ctrl.obter);
router.post("/", auth, ctrl.criar);
router.post("/:id/publicar", auth, ctrl.publicar);
router.delete("/:id", auth, ctrl.excluir);

// Rota PUBLICA - sem autenticacao
router.get("/public/:tenantId/:slug", ctrl.renderizarPublica);

module.exports = router;