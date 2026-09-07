const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/obrigacoesController");

router.get("/", auth, ctrl.listar);
router.get("/proximas", auth, ctrl.proximas);
router.post("/", auth, ctrl.criar);
router.put("/:id", auth, ctrl.atualizar);
router.post("/:id/status", auth, ctrl.atualizarStatus);
router.delete("/:id", auth, ctrl.excluir);

module.exports = router;