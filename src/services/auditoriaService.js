const pool = require("../config/db");

async function registrar(tenantId, user, acao, entidadeTipo, entidadeId, detalhes) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (tenant_id, user_id, user_email, acao, entidade_tipo, entidade_id, detalhes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenantId, user?.id || null, user?.email || null, acao, entidadeTipo, entidadeId || null, detalhes || null]
    );
  } catch {
    // Auditoria não pode derrubar a ação principal — falha silenciosa registrada só no console
    console.error("[AUDITORIA] Falha ao registrar log:", acao, entidadeTipo, entidadeId);
  }
}

module.exports = { registrar };