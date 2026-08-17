const express = require("express");
const router = express.Router();
const { login, register, suporte } = require("../controllers/authController");
router.post("/login", login);
router.post("/register", register);
router.post("/suporte", suporte);
module.exports = router;