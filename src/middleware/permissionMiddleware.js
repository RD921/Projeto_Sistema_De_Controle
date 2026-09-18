// src/middleware/permissionMiddleware.js
const pool = require("../config/db");

// Admin sempre passa (ja tem acesso total, por definicao).
// Usuario comum so passa se tiver a permissao especifica concedida em user_permissions.
function permission(chave) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Não autenticado" });
    if (req.user.role === "admin") return next();

    try {
      const [[perm]] = await pool.query(
        `SELECT up.user_id FROM user_permissions up
         JOIN permissions p ON p.id = up.permission_id
         WHERE up.user_id = ? AND p.chave = ?`,
        [req.user.id, chave]
      );
      if (!perm) return res.status(403).json({ error: `Você não tem permissão para: ${chave}` });
      next();
    } catch (err) {
      res.status(500).json({ error: "Erro ao verificar permissão", details: err.message });
    }
  };
}

module.exports = permission;