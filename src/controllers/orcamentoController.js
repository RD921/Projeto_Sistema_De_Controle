const pool = require("../config/db");

exports.listar = async (req, res) => {
  try {
    const { competencia } = req.query;
    if (!competencia) return res.status(400).json({ error: "competencia é obrigatória (formato AAAA-MM)" });

    const [orcamentos] = await pool.query(
      `SELECT b.*, cc.codigo AS cost_center_codigo, cc.nome AS cost_center_nome
       FROM budgets b
       JOIN cost_centers cc ON cc.id = b.cost_center_id
       WHERE b.tenant_id = ? AND b.competencia = ?
       ORDER BY b.tipo, b.categoria`,
      [req.tenant_id, competencia]
    );

    // Calcula o realizado no mesmo período, agrupado igual ao planejado
    const [realizado] = await pool.query(
      `SELECT tipo, categoria, cost_center_id, SUM(valor) AS valor_realizado
       FROM financial_entries
       WHERE tenant_id = ? AND DATE_FORMAT(data_vencimento, '%Y-%m') = ? AND status = 'pago'
       GROUP BY tipo, categoria, cost_center_id`,
      [req.tenant_id, competencia]
    );

    const mapaRealizado = {};
    realizado.forEach(r => {
      const chave = `${r.tipo}|${r.categoria}|${r.cost_center_id}`;
      mapaRealizado[chave] = Number(r.valor_realizado);
    });

    const resultado = orcamentos.map(o => {
      const chave = `${o.tipo}|${o.categoria}|${o.cost_center_id}`;
      const realizadoValor = mapaRealizado[chave] || 0;
      const planejado = Number(o.valor_planejado);
      const desvio = realizadoValor - planejado;
      const desvioPercentual = planejado > 0 ? (desvio / planejado) * 100 : 0;

      return {
        ...o,
        valor_planejado: planejado.toFixed(2),
        valor_realizado: realizadoValor.toFixed(2),
        desvio: desvio.toFixed(2),
        desvio_percentual: desvioPercentual.toFixed(1),
      };
    });

    const totalPlanejadoReceita = resultado.filter(o => o.tipo === "receita").reduce((a, o) => a + Number(o.valor_planejado), 0);
    const totalRealizadoReceita = resultado.filter(o => o.tipo === "receita").reduce((a, o) => a + Number(o.valor_realizado), 0);
    const totalPlanejadoDespesa = resultado.filter(o => o.tipo === "despesa").reduce((a, o) => a + Number(o.valor_planejado), 0);
    const totalRealizadoDespesa = resultado.filter(o => o.tipo === "despesa").reduce((a, o) => a + Number(o.valor_realizado), 0);

    res.json({
      competencia,
      itens: resultado,
      resumo: {
        receita_planejada: totalPlanejadoReceita.toFixed(2),
        receita_realizada: totalRealizadoReceita.toFixed(2),
        despesa_planejada: totalPlanejadoDespesa.toFixed(2),
        despesa_realizada: totalRealizadoDespesa.toFixed(2),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar orçamento", details: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { competencia, tipo, categoria, cost_center_id, valor_planejado } = req.body;
    if (!competencia || !tipo || !categoria || !cost_center_id || !valor_planejado) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }
    if (!["receita", "despesa"].includes(tipo)) {
      return res.status(400).json({ error: "tipo deve ser 'receita' ou 'despesa'" });
    }

    await pool.query(
      `INSERT INTO budgets (tenant_id, competencia, tipo, categoria, cost_center_id, valor_planejado)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE valor_planejado = VALUES(valor_planejado)`,
      [req.tenant_id, competencia, tipo, categoria, cost_center_id, valor_planejado]
    );
    res.status(201).json({ message: "Orçamento salvo" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar orçamento", details: err.message });
  }
};

exports.excluir = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "DELETE FROM budgets WHERE id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Orçamento não encontrado" });
    res.json({ message: "Orçamento excluído" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir orçamento", details: err.message });
  }
};

// Copia o orçamento de um mês pra outro (facilita planejamento recorrente)
exports.copiar = async (req, res) => {
  try {
    const { competencia_origem, competencia_destino } = req.body;
    if (!competencia_origem || !competencia_destino) {
      return res.status(400).json({ error: "competencia_origem e competencia_destino são obrigatórias" });
    }

    const [itensOrigem] = await pool.query(
      "SELECT tipo, categoria, cost_center_id, valor_planejado FROM budgets WHERE tenant_id = ? AND competencia = ?",
      [req.tenant_id, competencia_origem]
    );

    if (itensOrigem.length === 0) {
      return res.status(404).json({ error: "Nenhum orçamento encontrado na competência de origem" });
    }

    for (const item of itensOrigem) {
      await pool.query(
        `INSERT INTO budgets (tenant_id, competencia, tipo, categoria, cost_center_id, valor_planejado)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE valor_planejado = VALUES(valor_planejado)`,
        [req.tenant_id, competencia_destino, item.tipo, item.categoria, item.cost_center_id, item.valor_planejado]
      );
    }

    res.json({ message: `${itensOrigem.length} item(ns) copiado(s) para ${competencia_destino}` });
  } catch (err) {
    res.status(500).json({ error: "Erro ao copiar orçamento", details: err.message });
  }
};