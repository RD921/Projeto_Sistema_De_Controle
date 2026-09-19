const express = require("express");
const router = express.Router();
const multer = require("multer");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const ctrl = require("../controllers/certificadoDigitalController");

// Guarda o arquivo em memoria (nao em disco) - vai direto pro banco criptografado,
// sem deixar rastro de arquivo temporario no servidor.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/status", auth, ctrl.statusCertificado);
router.post("/upload", auth, role("admin"), upload.single("certificado"), ctrl.uploadCertificado);
router.delete("/", auth, role("admin"), ctrl.removerCertificado);

module.exports = router;