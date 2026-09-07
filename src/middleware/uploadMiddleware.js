const multer = require("multer");
const path = require("path");
const fs = require("fs");

const PASTA_UPLOADS = path.join(__dirname, "..", "..", "uploads", "documents");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const pastaTenant = path.join(PASTA_UPLOADS, String(req.tenant_id));
    fs.mkdirSync(pastaTenant, { recursive: true });
    cb(null, pastaTenant);
  },
  filename: (req, file, cb) => {
    const sufixo = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${sufixo}${ext}`);
  },
});

const TIPOS_PERMITIDOS = [
  "application/pdf",
  "application/xml",
  "text/xml",
  "image/png",
  "image/jpeg",
];

const fileFilter = (req, file, cb) => {
  if (TIPOS_PERMITIDOS.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Tipo de arquivo não permitido. Aceitos: PDF, XML, PNG, JPEG."));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});