const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/logisticsController");

router.get("/dashboard", auth, permission("logistica.ver"), ctrl.dashboard);

router.get("/depositos", auth, permission("logistica.ver"), ctrl.listarDepositos);
router.post("/depositos", auth, permission("logistica.editar"), ctrl.criarDeposito);
router.delete("/depositos/:id", auth, role("admin"), ctrl.desativarDeposito);

router.get("/transportadoras", auth, permission("logistica.ver"), ctrl.listarTransportadoras);
router.post("/transportadoras", auth, permission("logistica.editar"), ctrl.criarTransportadora);
router.delete("/transportadoras/:id", auth, role("admin"), ctrl.desativarTransportadora);
router.get("/transportadoras/score", auth, permission("logistica.ver"), ctrl.scoreTransportadoras);

router.get("/fretes/comparar", auth, permission("logistica.ver"), ctrl.compararFretes);

router.get("/envios", auth, permission("logistica.ver"), ctrl.listarEnvios);
router.get("/envios/:id", auth, permission("logistica.ver"), ctrl.detalharEnvio);
router.post("/envios", auth, permission("logistica.editar"), ctrl.criarEnvio);
router.put("/envios/:id/status", auth, permission("logistica.editar"), ctrl.mudarStatusEnvio);
router.put("/envios/:id/rastreio", auth, permission("logistica.editar"), ctrl.registrarRastreio);
router.post("/envios/:id/iniciar-separacao", auth, permission("logistica.editar"), ctrl.iniciarSeparacao);
router.post("/envios/:id/concluir-separacao", auth, permission("logistica.editar"), ctrl.concluirSeparacao);
router.post("/envios/:id/embalagem", auth, permission("logistica.editar"), ctrl.registrarEmbalagem);

router.get("/entregas", auth, permission("logistica.ver"), ctrl.listarEntregas);

const transfersCtrl = require("../controllers/logisticsTransfersController");
router.get("/transferencias", auth, permission("logistica.ver"), transfersCtrl.listar);
router.post("/transferencias", auth, permission("logistica.editar"), transfersCtrl.criar);
router.post("/transferencias/:id/concluir", auth, permission("logistica.editar"), transfersCtrl.concluir);
router.post("/transferencias/:id/cancelar", auth, permission("logistica.editar"), transfersCtrl.cancelar);
router.get("/estoque-por-deposito/:productId", auth, permission("logistica.ver"), transfersCtrl.saldoPorDeposito);
router.post("/estoque-por-deposito/ajustar", auth, permission("logistica.editar"), transfersCtrl.ajustarSaldoInicial);

router.get("/indicadores", auth, permission("logistica.ver"), ctrl.indicadores);
router.get("/custos", auth, permission("logistica.ver"), ctrl.custos);
router.get("/previsao-ruptura", auth, permission("logistica.ver"), ctrl.previsaoRuptura);
router.get("/alertas", auth, permission("logistica.ver"), ctrl.alertas);
router.post("/simular", auth, permission("logistica.ver"), ctrl.simular);

module.exports = router;