const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/automacaoFinanceiraController");

router.get("/regras", auth, ctrl.listarRegras);
router.post("/regras", auth, ctrl.criarRegra);
router.put("/regras/:id", auth, ctrl.atualizarRegra);
router.delete("/regras/:id", auth, ctrl.excluirRegra);
router.get("/logs", auth, ctrl.listarLogs);

module.exports = router;