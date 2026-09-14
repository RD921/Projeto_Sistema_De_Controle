const pool = require("../config/db");
const engine = require("../automation/engine/AutomationEngine");

exports.criar = async (req, res) => {
  try {
    const { nome, segment_id, variants } = req.body;
    if (!nome) return res.status(400).json({ error: "nome e obrigatorio" });
    if (!Array.isArray(variants) || variants.length < 2) return res.status(400).json({ error: "sao necessarias pelo menos 2 variantes" });

    for (const v of variants) {
      if (!v.nome || !v.automation_id) return res.status(400).json({ error: "cada variante precisa de nome e automation_id" });
      const [[a]] = await pool.query("SELECT id FROM automations WHERE id = ? AND tenant_id = ?", [v.automation_id, req.tenant_id]);
      if (!a) return res.status(400).json({ error: `automation_id ${v.automation_id} invalido para este tenant` });
    }

    const [resultTest] = await pool.query(
      "INSERT INTO marketing_ab_tests (tenant_id, nome, segment_id) VALUES (?, ?, ?)",
      [req.tenant_id, nome, segment_id || null]
    );
    const testId = resultTest.insertId;

    for (const v of variants) {
      await pool.query(
        "INSERT INTO marketing_ab_variants (ab_test_id, nome, automation_id, peso) VALUES (?, ?, ?, ?)",
        [testId, v.nome, v.automation_id, v.peso || Math.floor(100 / variants.length)]
      );
    }

    res.status(201).json({ id: testId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar teste A/B", details: err.message });
  }
};

// Distribui os leads do segmento entre as variantes (aleatorio, ponderado pelo peso)
// e dispara a automacao de cada variante para o lead sorteado.
exports.iniciar = async (req, res) => {
  try {
    const { id } = req.params;
    const [[teste]] = await pool.query("SELECT * FROM marketing_ab_tests WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (!teste) return res.status(404).json({ error: "Teste A/B nao encontrado" });
    if (teste.status !== "rascunho") return res.status(400).json({ error: "Teste ja foi iniciado" });

    const [variantes] = await pool.query("SELECT * FROM marketing_ab_variants WHERE ab_test_id = ?", [id]);

    let leadsAlvo;
    if (teste.segment_id) {
      const [rows] = await pool.query(
        "SELECT l.id FROM marketing_leads l JOIN marketing_segment_members m ON m.lead_id = l.id WHERE m.segment_id = ? AND l.tenant_id = ?",
        [teste.segment_id, req.tenant_id]
      );
      leadsAlvo = rows;
    } else {
      const [rows] = await pool.query("SELECT id FROM marketing_leads WHERE tenant_id = ?", [req.tenant_id]);
      leadsAlvo = rows;
    }

    const pesoTotal = variantes.reduce((acc, v) => acc + v.peso, 0);
    let atribuidos = 0;

    for (const lead of leadsAlvo) {
      let sorteio = Math.random() * pesoTotal;
      let variantEscolhida = variantes[0];
      for (const v of variantes) {
        if (sorteio < v.peso) { variantEscolhida = v; break; }
        sorteio -= v.peso;
      }

      try {
        const resultado = await engine.execute(variantEscolhida.automation_id, req.tenant_id, { lead_id: lead.id, ab_test_id: Number(id) });
        await pool.query(
          "INSERT INTO marketing_ab_assignments (ab_test_id, variant_id, lead_id, execution_id) VALUES (?, ?, ?, ?)",
          [id, variantEscolhida.id, lead.id, resultado?.executionId || null]
        );
        atribuidos++;
      } catch (err) {
        console.error(`[AB_TEST] Erro ao atribuir lead ${lead.id}:`, err.message);
      }
    }

    await pool.query("UPDATE marketing_ab_tests SET status = 'rodando' WHERE id = ?", [id]);
    res.json({ message: "Teste iniciado", leads_atribuidos: atribuidos, total_leads_alvo: leadsAlvo.length });
  } catch (err) {
    res.status(500).json({ error: "Erro ao iniciar teste A/B", details: err.message });
  }
};

// Compara conversoes por variante (usando marketing_conversions, ja validada na Fase 5)
// e permite declarar o vencedor manualmente.
exports.resultados = async (req, res) => {
  try {
    const { id } = req.params;
    const [[teste]] = await pool.query("SELECT * FROM marketing_ab_tests WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (!teste) return res.status(404).json({ error: "Teste A/B nao encontrado" });

    const [variantes] = await pool.query(
      `SELECT v.id, v.nome, v.automation_id,
              (SELECT COUNT(*) FROM marketing_ab_assignments a WHERE a.variant_id = v.id) AS leads_atribuidos,
              (SELECT COUNT(*) FROM marketing_ab_assignments a
                 JOIN marketing_leads l ON l.id = a.lead_id
                 WHERE a.variant_id = v.id AND l.status = 'cliente') AS conversoes
       FROM marketing_ab_variants v WHERE v.ab_test_id = ?`,
      [id]
    );

    const comTaxa = variantes.map(v => ({
      ...v,
      taxa_conversao: v.leads_atribuidos > 0 ? Number(((v.conversoes / v.leads_atribuidos) * 100).toFixed(1)) : 0,
    }));

    res.json({ teste: teste.nome, status: teste.status, vencedor_variant_id: teste.vencedor_variant_id, variantes: comTaxa });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar resultados", details: err.message });
  }
};

exports.declararVencedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { variant_id } = req.body;
    const [[variante]] = await pool.query("SELECT id FROM marketing_ab_variants WHERE id = ? AND ab_test_id = ?", [variant_id, id]);
    if (!variante) return res.status(400).json({ error: "variant_id invalido para este teste" });

    await pool.query(
      "UPDATE marketing_ab_tests SET status = 'finalizado', vencedor_variant_id = ?, finished_at = NOW() WHERE id = ? AND tenant_id = ?",
      [variant_id, id, req.tenant_id]
    );
    res.json({ message: "Vencedor declarado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao declarar vencedor", details: err.message });
  }
};