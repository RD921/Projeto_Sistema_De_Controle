const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/reportController");
router.get("/sales",        auth, ctrl.salesReport);
router.get("/marketing",    auth, ctrl.marketingReport);
router.get("/logistics",    auth, ctrl.logisticsReport);
router.get("/products",     auth, ctrl.productsReport);
router.get("/marketplaces", auth, ctrl.marketplacesReport);

const exportCtrl = require("../controllers/exportController");
router.get("/:tipo/export", auth, exportCtrl.exportar);

module.exports = router;