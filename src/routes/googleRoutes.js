const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const pool = require("../config/db");
const google = require("../services/googleService");

router.get("/auth", auth, (req, res) => {
  try {
    const url = google.getAuthUrl(req.tenant_id);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar URL de autorizacao", details: err.message });
  }
});

router.get("/callback", async (req, res) => {
  const frontendUrl = process.env.CORS_ORIGIN || "http://localhost:5173";
  try {
    const { code, state } = req.query;
    if (!code) return res.redirect(`${frontendUrl}/marketing/copy-ia?erro=codigo_ausente`);

    const tenantId = state ? parseInt(state, 10) : null;
    if (!tenantId) return res.redirect(`${frontendUrl}/marketing/copy-ia?erro=tenant_ausente`);

    const tokenData = await google.exchangeCodeForToken(code);
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await pool.query(
      `INSERT INTO google_integrations (tenant_id, access_token, refresh_token, expires_at, connected_at, ativo)
       VALUES (?, ?, ?, ?, NOW(), TRUE)
       ON DUPLICATE KEY UPDATE access_token = VALUES(access_token),
         refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
         expires_at = VALUES(expires_at), connected_at = NOW(), ativo = TRUE`,
      [tenantId, tokenData.access_token, tokenData.refresh_token || null, expiresAt]
    );

    res.redirect(`${frontendUrl}/marketing/copy-ia?conectado=google`);
  } catch (err) {
    console.error("Erro no callback do Google:", err.message);
    res.redirect(`${frontendUrl}/marketing/copy-ia?erro=falha_conexao`);
  }
});

router.get("/status", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT connected_at FROM google_integrations WHERE tenant_id = ? AND ativo = TRUE",
      [req.tenant_id]
    );
    res.json({ conectado: rows.length > 0, connected_at: rows[0]?.connected_at || null });
  } catch (err) {
    res.status(500).json({ error: "Erro ao verificar status", details: err.message });
  }
});

router.get("/imagens", auth, async (req, res) => {
  try {
    const token = await google.getValidToken(req.tenant_id);
    const [drive, fotos] = await Promise.all([
      google.listDriveImages(token).catch(() => []),
      google.listPhotos(token).catch(() => []),
    ]);
    res.json([...drive, ...fotos]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/disconnect", auth, async (req, res) => {
  try {
    await pool.query("UPDATE google_integrations SET ativo = FALSE WHERE tenant_id = ?", [req.tenant_id]);
    res.json({ message: "Google desconectado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desconectar", details: err.message });
  }
});

module.exports = router;