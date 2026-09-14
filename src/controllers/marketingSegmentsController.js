const pool = require("../config/db");
const { recalcularSegmento } = require("../services/marketingSegmentEngine");

exports.listar = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, (SELECT COUNT(*) FROM marketing_segment_members m WHERE m.segment_id = s.id) AS total_membros
       FROM marketing_segments s WHERE s.tenant_id = ? ORDER BY s.created_at DESC`,
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar segmentos", details: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { nome, descricao, tipo, criterios } = req.body;
    if (!nome) return res.status(400).json({ error: "nome e obrigatorio" });

    const tipoFinal = tipo === "dinamico" ? "dinamico" : "estatico";
    if (tipoFinal === "dinamico" && (!Array.isArray(criterios) || criterios.length === 0)) {
      return res.status(400).json({ error: "segmentos dinamicos exigem ao menos um criterio" });
    }

    const [result] = await pool.query(
      "INSERT INTO marketing_segments (tenant_id, nome, descricao, tipo, criterios, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [req.tenant_id, nome, descricao || null, tipoFinal, tipoFinal === "dinamico" ? JSON.stringify(criterios) : null, req.user?.id || null]
    );

    const segmentId = result.insertId;

    if (tipoFinal === "dinamico") {
      try { await recalcularSegmento(req.tenant_id, segmentId); } catch { /* recalculo inicial e best-effort */ }
    }

    res.status(201).json({ id: segmentId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar segmento", details: err.message });
  }
};

exports.adicionarMembro = async (req, res) => {
  try {
    const { id } = req.params;
    const { lead_id, customer_id } = req.body;
    if (!lead_id && !customer_id) return res.status(400).json({ error: "informe lead_id ou customer_id" });

    const [[segmento]] = await pool.query("SELECT id, tipo FROM marketing_segments WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (!segmento) return res.status(404).json({ error: "Segmento nao encontrado" });
    if (segmento.tipo === "dinamico") return res.status(400).json({ error: "segmentos dinamicos nao aceitam membros manuais - eles sao calculados pelos criterios" });

    await pool.query(
      "INSERT INTO marketing_segment_members (segment_id, lead_id, customer_id) VALUES (?, ?, ?)",
      [id, lead_id || null, customer_id || null]
    );
    res.status(201).json({ message: "Membro adicionado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao adicionar membro", details: err.message });
  }
};

exports.listarMembros = async (req, res) => {
  try {
    const { id } = req.params;
    const [[segmento]] = await pool.query("SELECT id FROM marketing_segments WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (!segmento) return res.status(404).json({ error: "Segmento nao encontrado" });

    const [rows] = await pool.query(
      `SELECT m.id AS membership_id, m.added_at, l.id AS lead_id, l.nome AS lead_nome, l.score, l.status,
              c.id AS customer_id, c.nome AS customer_nome
       FROM marketing_segment_members m
       LEFT JOIN marketing_leads l ON l.id = m.lead_id
       LEFT JOIN customers c ON c.id = m.customer_id
       WHERE m.segment_id = ?`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar membros", details: err.message });
  }
};

// Forca o recalculo imediato de um segmento dinamico (sem esperar o cron periodico).
exports.recalcular = async (req, res) => {
  try {
    const resultado = await recalcularSegmento(req.tenant_id, req.params.id);
    res.json(resultado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.excluir = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM marketing_segments WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Segmento nao encontrado" });
    res.json({ message: "Segmento excluido" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir segmento", details: err.message });
  }
};