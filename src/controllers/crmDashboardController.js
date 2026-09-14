const pool = require("../config/db");

exports.resumo = async (req, res) => {
  try {
    const tenantId = req.tenant_id;

    const [porEstagio] = await pool.query(
      "SELECT estagio, COUNT(*) AS total, COALESCE(SUM(valor), 0) AS valor_total FROM crm_deals WHERE tenant_id = ? GROUP BY estagio",
      [tenantId]
    );

    const [[fechados]] = await pool.query(
      `SELECT
         SUM(CASE WHEN estagio = 'ganho' THEN 1 ELSE 0 END) AS ganhos,
         SUM(CASE WHEN estagio = 'perdido' THEN 1 ELSE 0 END) AS perdidos,
         COALESCE(SUM(CASE WHEN estagio = 'ganho' THEN valor ELSE 0 END), 0) AS receita_ganha
       FROM crm_deals WHERE tenant_id = ? AND estagio IN ('ganho','perdido')`,
      [tenantId]
    );

    const totalFechados = Number(fechados.ganhos) + Number(fechados.perdidos);
    const taxaConversao = totalFechados > 0 ? Number(((fechados.ganhos / totalFechados) * 100).toFixed(1)) : null;

    const [[cicloMedio]] = await pool.query(
      `SELECT AVG(TIMESTAMPDIFF(DAY, created_at, closed_at)) AS dias_medio
       FROM crm_deals WHERE tenant_id = ? AND estagio = 'ganho' AND closed_at IS NOT NULL`,
      [tenantId]
    );

    const [[tarefasResumo]] = await pool.query(
      `SELECT
         SUM(CASE WHEN concluida = FALSE AND prazo < NOW() THEN 1 ELSE 0 END) AS vencidas,
         SUM(CASE WHEN concluida = FALSE AND prazo >= NOW() THEN 1 ELSE 0 END) AS pendentes,
         SUM(CASE WHEN concluida = TRUE THEN 1 ELSE 0 END) AS concluidas
       FROM crm_tasks WHERE tenant_id = ?`,
      [tenantId]
    );

    const [motivosPerda] = await pool.query(
      `SELECT motivo_perda, COUNT(*) AS total FROM crm_deals
       WHERE tenant_id = ? AND estagio = 'perdido' AND motivo_perda IS NOT NULL
       GROUP BY motivo_perda ORDER BY total DESC`,
      [tenantId]
    );

    res.json({
      pipeline_por_estagio: porEstagio,
      fechamentos: {
        ganhos: Number(fechados.ganhos) || 0,
        perdidos: Number(fechados.perdidos) || 0,
        taxa_conversao: taxaConversao,
        receita_ganha: Number(fechados.receita_ganha).toFixed(2),
      },
      ciclo_medio_dias: cicloMedio.dias_medio != null ? Number(cicloMedio.dias_medio).toFixed(1) : null,
      tarefas: {
        vencidas: Number(tarefasResumo.vencidas) || 0,
        pendentes: Number(tarefasResumo.pendentes) || 0,
        concluidas: Number(tarefasResumo.concluidas) || 0,
      },
      motivos_perda: motivosPerda,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar dashboard do CRM", details: err.message });
  }
};