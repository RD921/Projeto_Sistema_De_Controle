const automationRoutes = require("./automation/routes/automationRoutes");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const authRoutes        = require("./routes/authRoutes");
const userRoutes        = require("./routes/userRoutes");
const productRoutes     = require("./routes/productRoutes");
const orderRoutes       = require("./routes/orderRoutes");
const customerRoutes    = require("./routes/customerRoutes");
const integrationRoutes = require("./routes/integrationRoutes");
const webhookRoutes     = require("./routes/webhookRoutes");
const reportRoutes      = require("./routes/reportRoutes");
const tenantRoutes      = require("./routes/tenantRoutes");
const planRoutes        = require("./routes/planRoutes");
const marketingRoutes   = require("./routes/marketingRoutes");
const eventRoutes       = require("./routes/eventRoutes");
const aiRoutes          = require("./routes/aiRoutes");
const onboardingRoutes  = require("./routes/onboardingRoutes");
const moduleRoutes = require("./routes/moduleRoutes");
const integrationCatalogRoutes = require("./routes/integrationCatalogRoutes");
const financeiroRoutes = require("./routes/financeiroRoutes");
const googleRoutes = require("./routes/googleRoutes");

const app = express();

app.use(helmet());
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","DELETE"], allowedHeaders: ["Content-Type","Authorization"] }));
app.use(express.json());

app.use("/api/automations", automationRoutes);
app.use("/api/auth",         authRoutes);
app.use("/api/users",        userRoutes);
app.use("/api/products",     productRoutes);
app.use("/api/orders",       orderRoutes);
app.use("/api/customers",    customerRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/webhooks/automation", require("./automation/routes/automationWebhookRoutes"));
app.use("/api/webhooks",     webhookRoutes);
app.use("/api/reports",      reportRoutes);
app.use("/api/tenants",      tenantRoutes);
app.use("/api/plans",        planRoutes);
app.use("/api/marketing",    marketingRoutes);
app.use("/api/events",       eventRoutes);
app.use("/api/ai",           aiRoutes);
app.use("/api/onboarding",   onboardingRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/integrations-catalog", integrationCatalogRoutes);
app.use("/api/financeiro", financeiroRoutes);
app.use("/api/google", googleRoutes);

app.get("/", (req, res) => res.json({ status: "ok", version: "3.0" }));

module.exports = app;