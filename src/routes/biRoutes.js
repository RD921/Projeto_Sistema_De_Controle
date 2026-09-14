const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/biController");

router.get("/executivo", auth, ctrl.executivo);

module.exports = router;