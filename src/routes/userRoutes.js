const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

const {
  getUsers,
  createUser
} = require("../controllers/userController");

router.get("/", auth, role("admin"), getUsers);
router.post("/", auth, role("admin"), createUser);

module.exports = router;