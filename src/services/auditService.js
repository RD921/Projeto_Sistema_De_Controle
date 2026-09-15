const pool = require("../config/db");

// Helper reutilizavel para registrar qualquer acao sensivel no log de auditoria.
// Nao lanca erro se falhar - auditoria nao deve travar a acao principal.
async function registrar({ tenantId, usuarioId, usuarioNome, acao, origem, valorAnterior, valorNovo }) {
  try {
    await pool.query(
      "INSERT INTO audit_log (tenant_id, usuario_id, usuario_nome, acao, origem, valor_anterior, valor_novo) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [tenantId, usuarioId || null, usuarioNome || null, acao, origem, valorAnterior || null, valorNovo || null]
    );
  } catch (err) {
    console.error("[AUDIT LOG ERROR]", err.message);
  }
}

module.exports = { registrar };