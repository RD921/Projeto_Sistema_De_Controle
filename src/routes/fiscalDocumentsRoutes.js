const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/fiscalDocumentsController");

router.get("/", auth, ctrl.listar);
router.get("/:id", auth, ctrl.detalhar);
router.post("/", auth, ctrl.criar);
router.post("/:id/gerar-xml", auth, ctrl.gerarXmlRascunho);
router.post("/:id/cancelar", auth, ctrl.cancelar);
router.delete("/:id", auth, ctrl.excluir);

module.exports = router;