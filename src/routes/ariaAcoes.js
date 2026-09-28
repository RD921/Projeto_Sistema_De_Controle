const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { confirmarAcao, negarAcao, definirPin } = require("../controllers/ariaAcoesController");

router.post("/acoes/:id/confirmar", auth, confirmarAcao);
router.post("/acoes/:id/negar", auth, negarAcao);
router.put("/pin", auth, definirPin);

module.exports = router;