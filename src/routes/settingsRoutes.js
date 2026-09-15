const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/settingsController");

router.get("/overview", auth, ctrl.overview);
router.get("/sistema-info", auth, ctrl.sistemaInfo);
router.get("/atividade-recente", auth, ctrl.atividadeRecente);

router.put("/conta", auth, ctrl.atualizarConta);
router.put("/conta/senha", auth, ctrl.alterarSenha);
router.put("/tipo-juridico", auth, ctrl.atualizarTipoJuridico);
router.put("/sistema", auth, ctrl.atualizarSistema);

const role = require("../middleware/roleMiddleware");

router.get("/usuarios", auth, ctrl.listarUsuarios);
router.put("/usuarios/:id/role", auth, role("admin"), ctrl.mudarRoleUsuario);
router.put("/usuarios/:id/ativo", auth, role("admin"), ctrl.alternarAtivoUsuario);
router.get("/ia", auth, ctrl.iaOverview);
router.put("/ia/comportamento", auth, ctrl.atualizarIaComportamento);
router.get("/checklist", auth, ctrl.checklist);

module.exports = router;