const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/logisticsController");

router.get("/dashboard", auth, ctrl.dashboard);

router.get("/depositos", auth, ctrl.listarDepositos);
router.post("/depositos", auth, ctrl.criarDeposito);
router.delete("/depositos/:id", auth, ctrl.desativarDeposito);

router.get("/transportadoras", auth, ctrl.listarTransportadoras);
router.post("/transportadoras", auth, ctrl.criarTransportadora);
router.delete("/transportadoras/:id", auth, ctrl.desativarTransportadora);

router.get("/envios", auth, ctrl.listarEnvios);
router.get("/envios/:id", auth, ctrl.detalharEnvio);
router.post("/envios", auth, ctrl.criarEnvio);
router.put("/envios/:id/status", auth, ctrl.mudarStatusEnvio);
router.put("/envios/:id/rastreio", auth, ctrl.registrarRastreio);

module.exports = router;