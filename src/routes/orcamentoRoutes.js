const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/orcamentoController");

router.get("/", auth, ctrl.listar);
router.post("/", auth, ctrl.criar);
router.delete("/:id", auth, role("admin"), ctrl.excluir);
router.post("/copiar", auth, ctrl.copiar);

module.exports = router;