const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/marketingLeadsController");

router.get("/", auth, permission("marketing.ver"), ctrl.listar);
router.get("/prioritarios", auth, permission("marketing.ver"), ctrl.prioritarios);
router.get("/:id", auth, permission("marketing.ver"), ctrl.obter);
router.post("/", auth, permission("marketing.editar"), ctrl.criar);
router.put("/:id", auth, permission("marketing.editar"), ctrl.editar);
router.put("/:id/status", auth, permission("marketing.editar"), ctrl.atualizarStatus);
router.put("/:id/etapa", auth, permission("marketing.editar"), ctrl.moverEtapa);
router.put("/:id/score", auth, permission("marketing.editar"), ctrl.ajustarScore);
router.post("/:id/interacoes", auth, permission("marketing.editar"), ctrl.registrarInteracao);
router.post("/:id/enviar-crm", auth, permission("marketing.editar"), ctrl.enviarCRM);
router.put("/:id/vincular-cliente", auth, permission("marketing.editar"), ctrl.vincularCliente);
router.delete("/:id", auth, permission("marketing.editar"), ctrl.excluir);

module.exports = router;
