const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const ctrl = require("../controllers/marketingAbTestsController");

router.get("/", auth, permission("marketing.ver"), ctrl.listar);
router.post("/", auth, permission("marketing.editar"), ctrl.criar);
router.post("/:id/iniciar", auth, permission("marketing.editar"), ctrl.iniciar);
router.get("/:id/resultados", auth, permission("marketing.ver"), ctrl.resultados);
router.post("/:id/vencedor", auth, permission("marketing.editar"), ctrl.declararVencedor);

module.exports = router;