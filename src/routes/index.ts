import { Router } from "express";

import dashboardRouter from "./dashboard";
import integrationRouter from "./integrationRoutes";
import moduleRecommendationRouter from "./moduleRecommendationRoutes";
import planRouter from "./planRoutes";
import reportRouter from "./reportRoutes";
import tenantRouter from "./tenantRoutes";
import userRouter from "./userRoutes";
import webhookRouter from "./webhookRoutes";

const router = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/dashboard", dashboardRouter);
router.use("/integrations", integrationRouter);
router.use("/modules", moduleRecommendationRouter);
router.use("/plans", planRouter);
router.use("/reports", reportRouter);
router.use("/tenants", tenantRouter);
router.use("/users", userRouter);
router.use("/webhooks", webhookRouter);

export default router;