// src/routes/onboardingRoutes.js
const express = require("express");
const multer = require("multer");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/onboardingController");

// PDF fica só na memória e vai direto para o banco (o disco do Render é apagado a cada deploy).
// fieldSize alto porque o texto "Me conte mais sobre a sua empresa" não tem limite.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, fieldSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Envie o arquivo em formato PDF."));
  },
});

function receberDocumento(req, res, next) {
  upload.single("documento")(req, res, err => {
    if (!err) return next();
    const msg = err.code === "LIMIT_FILE_SIZE" ? "O PDF pode ter no máximo 10 MB." : err.message;
    res.status(400).json({ error: msg });
  });
}

router.get("/", auth, ctrl.get);
router.post("/", auth, receberDocumento, ctrl.save);
router.post("/analisar", auth, ctrl.analisar);
router.post("/complete", auth, ctrl.complete);

module.exports = router;
