const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const dealsCtrl = require("../controllers/crmDealsController");
const activitiesCtrl = require("../controllers/crmActivitiesController");

router.get("/deals", auth, permission("crm.ver"), dealsCtrl.listar);
router.get("/deals/pipeline", auth, permission("crm.ver"), dealsCtrl.pipeline);
router.post("/deals", auth, permission("crm.editar"), dealsCtrl.criar);
router.put("/deals/:id", auth, permission("crm.editar"), dealsCtrl.editar);
router.put("/deals/:id/estagio", auth, permission("crm.editar"), dealsCtrl.mudarEstagio);
router.delete("/deals/:id", auth, permission("crm.editar"), dealsCtrl.excluir);

router.post("/interactions", auth, permission("crm.editar"), activitiesCtrl.criarInteracao);
router.put("/interactions/:id", auth, permission("crm.editar"), activitiesCtrl.editarInteracao);
router.delete("/interactions/:id", auth, permission("crm.editar"), activitiesCtrl.excluirInteracao);

router.post("/tasks", auth, permission("crm.editar"), activitiesCtrl.criarTarefa);
router.put("/tasks/:id", auth, permission("crm.editar"), activitiesCtrl.editarTarefa);
router.put("/tasks/:id/concluir", auth, permission("crm.editar"), activitiesCtrl.concluirTarefa);
router.delete("/tasks/:id", auth, permission("crm.editar"), activitiesCtrl.excluirTarefa);

router.get("/customers/:customerId/360", auth, permission("crm.ver"), activitiesCtrl.visao360);

module.exports = router;