// src/automation/engine/Scheduler.js
const cron = require("node-cron");
const pool = require("../../config/db");
const engine = require("./AutomationEngine");

const jobsPorAutomacao = new Map();

function pararJobs(automationId) {
  const jobs = jobsPorAutomacao.get(automationId);
  if (jobs) {
    jobs.forEach((job) => job.stop());
    jobsPorAutomacao.delete(automationId);
  }
}

async function carregarESchedular(automationId) {
  pararJobs(automationId);

  const [[automation]] = await pool.query(
    "SELECT id, tenant_id, status FROM automations WHERE id = ?",
    [automationId]
  );
  if (!automation || automation.status !== "active") return;

  const [nodes] = await pool.query(
    "SELECT node_id, type, config FROM automation_nodes WHERE automation_id = ? AND type = 'schedule_trigger'",
    [automationId]
  );
  if (nodes.length === 0) return;

  const jobsCriados = [];

  for (const node of nodes) {
    let config = {};
    try {
      config = typeof node.config === "string" ? JSON.parse(node.config) : node.config || {};
    } catch {
      config = {};
    }

    const expressao = config.cron;
    if (!expressao || !cron.validate(expressao)) {
      console.warn(
        `[SCHEDULER] Automação ${automationId}, node ${node.node_id}: expressão cron inválida ("${expressao}") — ignorado`
      );
      continue;
    }

    const job = cron.schedule(expressao, async () => {
      try {
        console.log(`[SCHEDULER] Disparando automação ${automationId} (cron: ${expressao})`);
        await engine.execute(automationId, automation.tenant_id, {
          scheduled: true,
          firedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`[SCHEDULER] Erro ao executar automação ${automationId}:`, err.message);
      }
    });

    jobsCriados.push(job);
  }

  if (jobsCriados.length > 0) {
    jobsPorAutomacao.set(automationId, jobsCriados);
    console.log(`[SCHEDULER] ${jobsCriados.length} job(s) agendado(s) para automação ${automationId}`);
  }
}

async function reloadAutomation(automationId) {
  try {
    await carregarESchedular(automationId);
  } catch (err) {
    console.error(`[SCHEDULER] Erro ao recarregar automação ${automationId}:`, err.message);
  }
}

async function init() {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT a.id
       FROM automations a
       JOIN automation_nodes n ON n.automation_id = a.id
       WHERE a.status = 'active' AND n.type = 'schedule_trigger'`
    );
    for (const row of rows) {
      await carregarESchedular(row.id);
    }
    console.log(`[SCHEDULER] Inicializado — ${jobsPorAutomacao.size} automação(ões) com agendamento ativo`);
  } catch (err) {
    console.error("[SCHEDULER] Erro ao inicializar:", err.message);
  }
}

module.exports = { init, reloadAutomation, pararJobs };