const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { getOrders, getOrderById, createOrder, updateOrderStatus } = require("../controllers/orderController");
router.get("/",           auth, getOrders);
router.get("/:id",        auth, getOrderById);
router.post("/",          auth, createOrder);
router.put("/:id/status", auth, updateOrderStatus);
module.exports = router;