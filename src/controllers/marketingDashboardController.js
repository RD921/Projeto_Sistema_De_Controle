const pool = require("../config/db");

exports.resumo = async (req, res) => {
  try {
    const tenantId = req.tenant_id;

    // Leads por status
    const [leadsPorStatus] = await pool.query(
      "SELECT status, COUNT(*) AS total FROM marketing_leads WHERE tenant_id = ? GROUP BY status",
      [tenantId]
    );

    // Leads por temperatura
    const [leadsPorTemperatura] = await pool.query(
      "SELECT temperatura, COUNT(*) AS total FROM marketing_leads WHERE tenant_id = ? GROUP BY temperatura",
      [tenantId]
    );

    const [[totalLeads]] = await pool.query(
      "SELECT COUNT(*) AS total, COALESCE(AVG(score), 0) AS score_medio FROM marketing_leads WHERE tenant_id = ?",
      [tenantId]
    );

    // Campanhas por status
    const [campanhasPorStatus] = await pool.query(
      "SELECT status, COUNT(*) AS total FROM marketing_campaigns WHERE tenant_id = ? GROUP BY status",
      [tenantId]
    );

    const [[totalCampanhas]] = await pool.query(
      "SELECT COUNT(*) AS total FROM marketing_campaigns WHERE tenant_id = ?",
      [tenantId]
    );

    // Conversoes e receita atribuida (soma de todas as campanhas)
    const [[conversoes]] = await pool.query(
      "SELECT COUNT(*) AS total_conversoes, COALESCE(SUM(valor), 0) AS receita_total FROM marketing_conversions WHERE tenant_id = ?",
      [tenantId]
    );

    // ROI/ROAS por campanha que tem orcamento definido e pelo menos 1 conversao
    const [roiPorCampanha] = await pool.query(
      `SELECT c.id, c.nome, c.orcamento,
              COALESCE(SUM(mc.valor), 0) AS receita_atribuida,
              COUNT(mc.id) AS total_conversoes
       FROM marketing_campaigns c
       LEFT JOIN marketing_conversions mc ON mc.campaign_id = c.id
       WHERE c.tenant_id = ? AND c.orcamento IS NOT NULL AND c.orcamento > 0
       GROUP BY c.id, c.nome, c.orcamento`,
      [tenantId]
    );

    const campanhasComRoi = roiPorCampanha.map(c => {
      const orcamento = Number(c.orcamento);
      const receita = Number(c.receita_atribuida);
      const roi = orcamento > 0 ? ((receita - orcamento) / orcamento) * 100 : null;
      const roas = orcamento > 0 ? receita / orcamento : null;
      return {
        id: c.id,
        nome: c.nome,
        orcamento: orcamento.toFixed(2),
        receita_atribuida: receita.toFixed(2),
        total_conversoes: c.total_conversoes,
        roi: roi !== null ? Number(roi.toFixed(1)) : null,
        roas: roas !== null ? Number(roas.toFixed(2)) : null,
      };
    });

    const roiValidos = campanhasComRoi.filter(c => c.roi !== null);
    const roiMedio = roiValidos.length > 0
      ? Number((roiValidos.reduce((acc, c) => acc + c.roi, 0) / roiValidos.length).toFixed(1))
      : null;

    const melhorCampanha = roiValidos.length > 0
      ? roiValidos.reduce((melhor, atual) => (atual.roi > melhor.roi ? atual : melhor))
      : null;

    // Segmentos (contagem simples, util para visao geral)
    const [[totalSegmentos]] = await pool.query(
      "SELECT COUNT(*) AS total FROM marketing_segments WHERE tenant_id = ?",
      [tenantId]
    );

    res.json({
      leads: {
        total: totalLeads.total,
        score_medio: Number(totalLeads.score_medio).toFixed(1),
        por_status: leadsPorStatus,
        por_temperatura: leadsPorTemperatura,
      },
      campanhas: {
        total: totalCampanhas.total,
        por_status: campanhasPorStatus,
      },
      conversoes: {
        total: conversoes.total_conversoes,
        receita_total_atribuida: Number(conversoes.receita_total).toFixed(2),
      },
      roi: {
        medio: roiMedio,
        por_campanha: campanhasComRoi,
        melhor_campanha: melhorCampanha,
      },
      segmentos: {
        total: totalSegmentos.total,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar dashboard de marketing", details: err.message });
  }
};