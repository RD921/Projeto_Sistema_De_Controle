const express = require("express");
const router = express.Router();
const auth = require("../../middleware/authMiddleware");
const pool = require("../../config/db");
const engine = require("../engine/AutomationEngine");
const scheduler = require("../engine/Scheduler");
const { garantir: garantirSchema } = require("../../services/automationSchema");

// Configurações do fluxo (opcionais): tempo máximo, variáveis fixas e automação que trata falhas.
function normalizarSettings(bruto) {
  const s = bruto && typeof bruto === "object" ? bruto : {};
  const out = {};
  if (s.timeoutMs !== undefined && s.timeoutMs !== null && s.timeoutMs !== "") {
    const t = Number(s.timeoutMs);
    if (!Number.isFinite(t) || t < 1000 || t > 1800000) throw new Error("timeoutMs deve estar entre 1000 e 1800000");
    out.timeoutMs = Math.round(t);
  }
  if (s.vars !== undefined) {
    if (!s.vars || typeof s.vars !== "object" || Array.isArray(s.vars)) throw new Error("vars deve ser um objeto");
    if (JSON.stringify(s.vars).length > 20000) throw new Error("vars grande demais");
    out.vars = s.vars;
  }
  if (s.errorAutomationId !== undefined && s.errorAutomationId !== null && s.errorAutomationId !== "") {
    const id = Number(s.errorAutomationId);
    if (!Number.isInteger(id) || id < 1) throw new Error("errorAutomationId inválido");
    out.errorAutomationId = id;
  }
  return out;
}

// Bloqueia a rota se o usuário autenticado não for admin do tenant.
function exigirAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Apenas administradores podem executar esta acao" });
  }
  next();
}

router.get("/", auth, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM automations WHERE tenant_id = ? ORDER BY created_at DESC", [req.tenant_id]);
  res.json(rows);
});

router.post("/", auth, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "name e obrigatorio" });
  const [result] = await pool.query(
    "INSERT INTO automations (tenant_id, name, description, status, created_by) VALUES (?, ?, ?, 'draft', ?)",
    [req.tenant_id, name, description || null, req.user?.id || null]
  );
  res.json({ id: result.insertId });
});

router.get("/:id/definicao", auth, async (req, res) => {
  try {
    const [[automation]] = await pool.query(
      "SELECT * FROM automations WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenant_id]
    );
    if (!automation) return res.status(404).json({ error: "Automacao nao encontrada" });

    const [nodes] = await pool.query(
      "SELECT node_id, type, label, config, position_x, position_y FROM automation_nodes WHERE automation_id = ?",
      [req.params.id]
    );
    const [edges] = await pool.query(
      "SELECT source_node_id, target_node_id, source_handle, target_handle FROM automation_edges WHERE automation_id = ?",
      [req.params.id]
    );

    let settings = automation.settings;
    if (typeof settings === "string") { try { settings = JSON.parse(settings); } catch { settings = {}; } }
    res.json({
      ...automation,
      settings: settings || {},
      nodes: nodes.map(n => ({
        ...n,
        config: typeof n.config === "string" ? JSON.parse(n.config) : n.config,
      })),
      edges,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar definicao", details: err.message });
  }
});

router.put("/:id/definicao", auth, async (req, res) => {
  const { nodes = [], edges = [] } = req.body;
  let settings;
  try {
    settings = req.body.settings === undefined ? undefined : normalizarSettings(req.body.settings);
    if (settings && settings.errorAutomationId) {
      if (Number(settings.errorAutomationId) === Number(req.params.id)) throw new Error("a automação de erro não pode ser ela mesma");
      const [[alvo]] = await pool.query("SELECT id FROM automations WHERE id = ? AND tenant_id = ?", [settings.errorAutomationId, req.tenant_id]);
      if (!alvo) throw new Error("automação de erro não encontrada nesta empresa");
    }
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  const conn = await pool.getConnection();
  try {
    await garantirSchema();
    await conn.beginTransaction();

    const [[automation]] = await conn.query("SELECT id FROM automations WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!automation) { await conn.rollback(); return res.status(404).json({ error: "Automacao nao encontrada" }); }

    await conn.query("DELETE FROM automation_nodes WHERE automation_id = ?", [req.params.id]);
    await conn.query("DELETE FROM automation_edges WHERE automation_id = ?", [req.params.id]);

    for (const n of nodes) {
      await conn.query(
        "INSERT INTO automation_nodes (automation_id, node_id, type, label, config, position_x, position_y) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [req.params.id, n.node_id, n.type, n.label || "", JSON.stringify(n.config || {}), n.position_x || 0, n.position_y || 0]
      );
    }
    for (const e of edges) {
      await conn.query(
        "INSERT INTO automation_edges (automation_id, source_node_id, target_node_id, source_handle, target_handle) VALUES (?, ?, ?, ?, ?)",
        [req.params.id, e.source_node_id, e.target_node_id, e.source_handle || "default", e.target_handle || "default"]
      );
    }

    if (settings !== undefined && (await garantirSchema())) {
      await conn.query("UPDATE automations SET settings = ? WHERE id = ?", [JSON.stringify(settings), req.params.id]);
    }
    await conn.query("UPDATE automations SET version = version + 1 WHERE id = ?", [req.params.id]);
    await conn.commit();
    scheduler.reloadAutomation(req.params.id);
    res.json({ message: "Definicao salva" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: "Erro ao salvar definicao", details: err.message });
  } finally {
    conn.release();
  }
});

router.post("/:id/activate", auth, exigirAdmin, async (req, res) => {
  const [r] = await pool.query("UPDATE automations SET status = 'active' WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
  if (r.affectedRows === 0) return res.status(404).json({ error: "Automacao nao encontrada" });
  scheduler.reloadAutomation(req.params.id);
  res.json({ message: "Ativada" });
});

router.post("/:id/pause", auth, exigirAdmin, async (req, res) => {
  const [r] = await pool.query("UPDATE automations SET status = 'paused' WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
  if (r.affectedRows === 0) return res.status(404).json({ error: "Automacao nao encontrada" });
  scheduler.pararJobs(Number(req.params.id));
  res.json({ message: "Pausada" });
});

router.delete("/:id", auth, exigirAdmin, async (req, res) => {
  const [r] = await pool.query("DELETE FROM automations WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
  if (r.affectedRows === 0) return res.status(404).json({ error: "Automacao nao encontrada" });
  scheduler.pararJobs(Number(req.params.id));
  res.json({ message: "Automacao excluida" });
});

router.post("/:id/execute", auth, async (req, res) => {
  try {
    const resultado = await engine.execute(req.params.id, req.tenant_id, req.body.data || {}, { mode: "manual" });
    res.json(resultado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/:id/executions", auth, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM automation_executions WHERE automation_id = ? AND tenant_id = ? ORDER BY created_at DESC LIMIT 50",
    [req.params.id, req.tenant_id]
  );
  res.json(rows);
});

router.get("/executions/:executionId/logs", auth, async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM automation_logs WHERE execution_id = ? ORDER BY id ASC", [req.params.executionId]);
  res.json(rows);
});

router.post("/executions/:executionId/approve", auth, exigirAdmin, async (req, res) => {
  try {
    const [[execRow]] = await pool.query("SELECT tenant_id FROM automation_executions WHERE id = ?", [req.params.executionId]);
    if (!execRow || execRow.tenant_id !== req.tenant_id) return res.status(404).json({ error: "Execucao nao encontrada" });
    res.json(await engine.resume(req.params.executionId, "approved"));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/executions/:executionId/reject", auth, exigirAdmin, async (req, res) => {
  try {
    const [[execRow]] = await pool.query("SELECT tenant_id FROM automation_executions WHERE id = ?", [req.params.executionId]);
    if (!execRow || execRow.tenant_id !== req.tenant_id) return res.status(404).json({ error: "Execucao nao encontrada" });
    res.json(await engine.resume(req.params.executionId, "rejected"));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;