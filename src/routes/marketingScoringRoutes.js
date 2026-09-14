const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/marketingScoringController");

router.get("/regras", auth, ctrl.listarRegras);
router.post("/regras", auth, ctrl.criarRegra);
router.put("/regras/:id", auth, ctrl.atualizarRegra);
router.delete("/regras/:id", auth, ctrl.excluirRegra);
router.get("/leads/:leadId/historico", auth, ctrl.historicoDoLead);

module.exports = router;