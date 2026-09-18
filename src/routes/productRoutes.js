const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const permission = require("../middleware/permissionMiddleware");
const { getProducts, getProductById, createProduct, updateProduct, deleteProduct } = require("../controllers/productController");

router.get("/",       auth, permission("produtos.ver"), getProducts);
router.get("/:id",    auth, permission("produtos.ver"), getProductById);
router.post("/",      auth, permission("produtos.editar"), createProduct);
router.put("/:id",    auth, permission("produtos.editar"), updateProduct);
router.delete("/:id", auth, permission("produtos.editar"), deleteProduct);

module.exports = router;