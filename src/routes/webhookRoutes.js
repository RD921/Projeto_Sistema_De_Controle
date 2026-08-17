const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/webhookController");
router.post("/mercadolivre", ctrl.handleMercadoLivre);
module.exports = router;