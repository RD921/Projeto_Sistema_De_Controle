const pool = require("../config/db");
const eventDispatcher = require("../automation/engine/EventDispatcher");

// Varre os leads vinculados a clientes (customer_id preenchido) dentro do periodo
// da campanha, procura pedidos pagos desses clientes no mesmo periodo, e registra
// como conversao atribuida a campanha (modelo last-touch simplificado).
exports.calcularConversoes = async (req, res) => {
  try {
    const { id } = req.params;
    const [[campanha]] = await pool.query("SELECT * FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (!campanha) return res.status(404).json({ error: "Campanha nao encontrada" });

    const dataInicio = campanha.data_inicio || "1970-01-01";
    const dataFim = campanha.data_fim || "2999-12-31";

    const [candidatos] = await pool.query(
      `SELECT o.id AS order_id, o.total, o.created_at, l.id AS lead_id, l.customer_id
       FROM marketing_leads l
       JOIN orders o ON o.tenant_id = l.tenant_id AND o.status = 'pago'
       WHERE l.tenant_id = ?
         AND l.customer_id IS NOT NULL
         AND (l.id IN (SELECT lead_id FROM marketing_segment_members WHERE segment_id = ?) OR ? IS NULL)
         AND DATE(o.created_at) BETWEEN ? AND ?`,
      [req.tenant_id, campanha.segment_id, campanha.segment_id, dataInicio, dataFim]
    );

    let novasConversoes = 0;
    for (const c of candidatos) {
      try {
        const [result] = await pool.query(
          "INSERT IGNORE INTO marketing_conversions (tenant_id, campaign_id, lead_id, customer_id, order_id, valor) VALUES (?, ?, ?, ?, ?, ?)",
          [req.tenant_id, id, c.lead_id, c.customer_id, c.order_id, c.total]
        );
        if (result.affectedRows > 0) {
          novasConversoes++;
          await eventDispatcher.dispatch("campaign_conversion", req.tenant_id, {
            campaign_id: Number(id), order_id: c.order_id, valor: c.total,
          });
        }
      } catch { /* ignora duplicata ou erro pontual e continua os demais */ }
    }

    res.json({ message: "Conversoes recalculadas", novas_conversoes: novasConversoes, candidatos_avaliados: candidatos.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular conversoes", details: err.message });
  }
};

exports.roiCampanha = async (req, res) => {
  try {
    const { id } = req.params;
    const [[campanha]] = await pool.query("SELECT * FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (!campanha) return res.status(404).json({ error: "Campanha nao encontrada" });

    const [[agregado]] = await pool.query(
      "SELECT COUNT(*) AS total_conversoes, COALESCE(SUM(valor), 0) AS receita_total FROM marketing_conversions WHERE campaign_id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );

    const orcamento = Number(campanha.orcamento) || 0;
    const receita = Number(agregado.receita_total);
    const roi = orcamento > 0 ? ((receita - orcamento) / orcamento) : null;
    const roas = orcamento > 0 ? (receita / orcamento) : null;

    res.json({
      campanha: campanha.nome,
      orcamento: orcamento.toFixed(2),
      receita_atribuida: receita.toFixed(2),
      total_conversoes: agregado.total_conversoes,
      roi: roi !== null ? Number((roi * 100).toFixed(1)) : null,
      roi_formatado: roi !== null ? `${(roi * 100).toFixed(1)}%` : "orcamento nao definido",
      roas: roas !== null ? Number(roas.toFixed(2)) : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao calcular ROI", details: err.message });
  }
};