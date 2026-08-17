// src/automation/routes/automationWebhookRoutes.js
const express = require("express");
const router = express.Router();
const pool = require("../../config/db");
const engine = require("../engine/AutomationEngine");

router.post("/:token", async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ error: "Token ausente" });

  try {
    const [rows] = await pool.query(
      `SELECT n.automation_id, a.tenant_id, a.status
       FROM automation_nodes n
       JOIN automations a ON a.id = n.automation_id
       WHERE n.type = 'webhook_trigger'
         AND JSON_UNQUOTE(JSON_EXTRACT(n.config, "$.webhook_token")) = ?
       LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Webhook não encontrado" });
    }

    const { automation_id, tenant_id, status } = rows[0];

    if (status !== "active") {
      return res.status(409).json({ error: "Automação não está ativa" });
    }

    res.status(202).json({ message: "Webhook recebido, automação disparada" });

    engine.execute(automation_id, tenant_id, req.body || {}).catch((err) => {
      console.error(`[WEBHOOK] Erro ao executar automação ${automation_id}:`, err.message);
    });
  } catch (err) {
    console.error("[WEBHOOK] Erro ao processar webhook:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro interno ao processar webhook" });
    }
  }
});

module.exports = router;