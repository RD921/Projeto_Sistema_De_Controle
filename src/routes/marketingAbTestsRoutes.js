const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/marketingAbTestsController");

router.post("/", auth, ctrl.criar);
router.post("/:id/iniciar", auth, ctrl.iniciar);
router.get("/:id/resultados", auth, ctrl.resultados);
router.post("/:id/vencedor", auth, ctrl.declararVencedor);

module.exports = router;