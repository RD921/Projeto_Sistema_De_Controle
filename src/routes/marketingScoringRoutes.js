const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/marketingScoringController");

router.get("/regras", auth, permission("marketing.ver"), ctrl.listarRegras);
router.post("/regras", auth, permission("marketing.editar"), ctrl.criarRegra);
router.put("/regras/:id", auth, permission("marketing.editar"), ctrl.atualizarRegra);
router.delete("/regras/:id", auth, permission("marketing.editar"), ctrl.excluirRegra);
router.get("/leads/:leadId/historico", auth, permission("marketing.ver"), ctrl.historicoDoLead);

module.exports = router;