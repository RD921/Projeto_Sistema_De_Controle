const pool = require("../config/db");

// Mostra, para uma campanha, em qual etapa da jornada cada lead matriculado esta
// -- puxando o status real da execucao no motor de automacao (running/waiting/success/failed).
exports.listarEnrollments = async (req, res) => {
  try {
    const { id } = req.params;
    const [[campanha]] = await pool.query("SELECT id, nome FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (!campanha) return res.status(404).json({ error: "Campanha nao encontrada" });

    const [rows] = await pool.query(
      `SELECT e.id AS enrollment_id, e.enrolled_at, l.id AS lead_id, l.nome AS lead_nome, l.email AS lead_email,
              ex.id AS execution_id, ex.status AS execution_status, ex.started_at, ex.finished_at
       FROM marketing_journey_enrollments e
       LEFT JOIN marketing_leads l ON l.id = e.lead_id
       LEFT JOIN automation_executions ex ON ex.id = e.execution_id
       WHERE e.campaign_id = ? AND e.tenant_id = ?
       ORDER BY e.enrolled_at DESC`,
      [id, req.tenant_id]
    );

    res.json({ campanha: campanha.nome, leads_na_jornada: rows });
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar jornada", details: err.message });
  }
};