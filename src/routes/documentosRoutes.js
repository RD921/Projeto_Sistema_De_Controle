const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const ctrl = require("../controllers/documentosController");

router.get("/", auth, ctrl.listar);
router.post("/upload", auth, upload.single("arquivo"), ctrl.upload);
router.get("/:id/baixar", auth, ctrl.baixar);
router.delete("/:id", auth, ctrl.excluir);

module.exports = router;