const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  getCustomers,
  createCustomer
} = require("../controllers/customerController");

router.get("/", auth, getCustomers);
router.post("/", auth, createCustomer);

module.exports = router;