const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const controller = require("../controllers/scenarioController");

router.use(auth);
router.post("/simular", controller.simular);
router.get("/", controller.listar);
router.post("/", controller.salvar);
router.get("/:id", controller.buscarPorId);
router.delete("/:id", role("admin"), controller.excluir);

module.exports = router;