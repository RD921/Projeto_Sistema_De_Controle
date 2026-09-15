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

router.get("/usuarios", auth, ctrl.listarUsuarios);
router.put("/usuarios/:id/role", auth, ctrl.mudarRoleUsuario);
router.put("/usuarios/:id/ativo", auth, ctrl.alternarAtivoUsuario);
router.get("/ia", auth, ctrl.iaOverview);
router.put("/ia/comportamento", auth, ctrl.atualizarIaComportamento);

module.exports = router;