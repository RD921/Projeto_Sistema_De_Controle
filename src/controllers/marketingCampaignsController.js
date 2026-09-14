const pool = require("../config/db");
const scheduler = require("../automation/engine/Scheduler");

exports.listar = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, s.nome AS segmento_nome, a.name AS automacao_nome
       FROM marketing_campaigns c
       LEFT JOIN marketing_segments s ON s.id = c.segment_id
       LEFT JOIN automations a ON a.id = c.automation_id
       WHERE c.tenant_id = ? ORDER BY c.created_at DESC`,
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar campanhas", details: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { nome, objetivo, tipo, segment_id, automation_id, orcamento, data_inicio, data_fim } = req.body;
    if (!nome) return res.status(400).json({ error: "nome e obrigatorio" });

    if (segment_id) {
      const [[s]] = await pool.query("SELECT id FROM marketing_segments WHERE id = ? AND tenant_id = ?", [segment_id, req.tenant_id]);
      if (!s) return res.status(400).json({ error: "segment_id invalido para este tenant" });
    }
    if (automation_id) {
      const [[a]] = await pool.query("SELECT id FROM automations WHERE id = ? AND tenant_id = ?", [automation_id, req.tenant_id]);
      if (!a) return res.status(400).json({ error: "automation_id invalido para este tenant" });
    }

    const [result] = await pool.query(
      `INSERT INTO marketing_campaigns (tenant_id, nome, objetivo, tipo, segment_id, automation_id, orcamento, data_inicio, data_fim, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenant_id, nome, objetivo || null, tipo || "outro", segment_id || null, automation_id || null, orcamento || null, data_inicio || null, data_fim || null, req.user?.id || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar campanha", details: err.message });
  }
};

// Ativar campanha = mudar status + (se tiver automation_id) ativar a automacao vinculada,
// reaproveitando o motor existente em vez de criar um disparador proprio.
exports.ativar = async (req, res) => {
  try {
    const [[campanha]] = await pool.query("SELECT * FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!campanha) return res.status(404).json({ error: "Campanha nao encontrada" });

    await pool.query("UPDATE marketing_campaigns SET status = 'ativa' WHERE id = ?", [campanha.id]);

    if (campanha.automation_id) {
      await pool.query("UPDATE automations SET status = 'active' WHERE id = ? AND tenant_id = ?", [campanha.automation_id, req.tenant_id]);
      scheduler.reloadAutomation(campanha.automation_id);
    }

    res.json({ message: "Campanha ativada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao ativar campanha", details: err.message });
  }
};

exports.pausar = async (req, res) => {
  try {
    const [[campanha]] = await pool.query("SELECT * FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!campanha) return res.status(404).json({ error: "Campanha nao encontrada" });

    await pool.query("UPDATE marketing_campaigns SET status = 'pausada' WHERE id = ?", [campanha.id]);
    if (campanha.automation_id) {
      await pool.query("UPDATE automations SET status = 'paused' WHERE id = ? AND tenant_id = ?", [campanha.automation_id, req.tenant_id]);
      scheduler.pararJobs(campanha.automation_id);
    }
    res.json({ message: "Campanha pausada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao pausar campanha", details: err.message });
  }
};

exports.excluir = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM marketing_campaigns WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Campanha nao encontrada" });
    res.json({ message: "Campanha excluida" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir campanha", details: err.message });
  }
};