const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/logisticsController");

router.get("/dashboard", auth, ctrl.dashboard);

router.get("/depositos", auth, ctrl.listarDepositos);
router.post("/depositos", auth, ctrl.criarDeposito);
router.delete("/depositos/:id", auth, role("admin"), ctrl.desativarDeposito);

router.get("/transportadoras", auth, ctrl.listarTransportadoras);
router.post("/transportadoras", auth, ctrl.criarTransportadora);
router.delete("/transportadoras/:id", auth, role("admin"), ctrl.desativarTransportadora);
router.get("/transportadoras/score", auth, ctrl.scoreTransportadoras);

router.get("/fretes/comparar", auth, ctrl.compararFretes);

router.get("/envios", auth, ctrl.listarEnvios);
router.get("/envios/:id", auth, ctrl.detalharEnvio);
router.post("/envios", auth, ctrl.criarEnvio);
router.put("/envios/:id/status", auth, ctrl.mudarStatusEnvio);
router.put("/envios/:id/rastreio", auth, ctrl.registrarRastreio);
router.post("/envios/:id/iniciar-separacao", auth, ctrl.iniciarSeparacao);
router.post("/envios/:id/concluir-separacao", auth, ctrl.concluirSeparacao);
router.post("/envios/:id/embalagem", auth, ctrl.registrarEmbalagem);

router.get("/entregas", auth, ctrl.listarEntregas);

const transfersCtrl = require("../controllers/logisticsTransfersController");
router.get("/transferencias", auth, transfersCtrl.listar);
router.post("/transferencias", auth, transfersCtrl.criar);
router.post("/transferencias/:id/concluir", auth, transfersCtrl.concluir);
router.post("/transferencias/:id/cancelar", auth, transfersCtrl.cancelar);
router.get("/estoque-por-deposito/:productId", auth, transfersCtrl.saldoPorDeposito);
router.post("/estoque-por-deposito/ajustar", auth, transfersCtrl.ajustarSaldoInicial);

router.get("/indicadores", auth, ctrl.indicadores);
router.get("/custos", auth, ctrl.custos);
router.get("/previsao-ruptura", auth, ctrl.previsaoRuptura);
router.get("/alertas", auth, ctrl.alertas);
router.post("/simular", auth, ctrl.simular);

module.exports = router;