const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/marketingSegmentsController");

router.get("/", auth, ctrl.listar);
router.post("/", auth, ctrl.criar);
router.post("/:id/membros", auth, ctrl.adicionarMembro);
router.get("/:id/membros", auth, ctrl.listarMembros);
router.post("/:id/recalcular", auth, ctrl.recalcular);
router.delete("/:id", auth, ctrl.excluir);

module.exports = router;