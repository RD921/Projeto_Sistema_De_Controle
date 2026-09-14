const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const dealsCtrl = require("../controllers/crmDealsController");
const activitiesCtrl = require("../controllers/crmActivitiesController");

router.get("/deals", auth, dealsCtrl.listar);
router.get("/deals/pipeline", auth, dealsCtrl.pipeline);
router.post("/deals", auth, dealsCtrl.criar);
router.put("/deals/:id", auth, dealsCtrl.editar);
router.put("/deals/:id/estagio", auth, dealsCtrl.mudarEstagio);
router.delete("/deals/:id", auth, dealsCtrl.excluir);

router.post("/interactions", auth, activitiesCtrl.criarInteracao);
router.put("/interactions/:id", auth, activitiesCtrl.editarInteracao);
router.delete("/interactions/:id", auth, activitiesCtrl.excluirInteracao);

router.post("/tasks", auth, activitiesCtrl.criarTarefa);
router.put("/tasks/:id", auth, activitiesCtrl.editarTarefa);
router.put("/tasks/:id/concluir", auth, activitiesCtrl.concluirTarefa);
router.delete("/tasks/:id", auth, activitiesCtrl.excluirTarefa);

router.get("/customers/:customerId/360", auth, activitiesCtrl.visao360);

module.exports = router;