const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/alertasController");

router.get("/", auth, ctrl.listar);
router.post("/revarrer", auth, ctrl.revarrer);
router.post("/:id/ler", auth, ctrl.marcarLido);
router.post("/:id/resolver", auth, ctrl.resolver);

module.exports = router;