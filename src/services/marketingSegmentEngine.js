const pool = require("../config/db");

const OPERADORES = {
  equals: "=",
  not_equals: "!=",
  greater_than: ">",
  greater_than_or_equal: ">=",
  less_than: "<",
  less_than_or_equal: "<=",
};

// Colunas permitidas para segmentacao dinamica, para evitar SQL injection via nome de campo.
const CAMPOS_PERMITIDOS = ["status", "score", "temperatura", "origem", "canal"];

function validarCampo(campo) {
  if (!CAMPOS_PERMITIDOS.includes(campo)) {
    throw new Error(`Campo "${campo}" nao e permitido para segmentacao dinamica`);
  }
}

// Recalcula um segmento dinamico: apaga os membros atuais e insere os leads
// que batem com TODOS os criterios (AND). Criterios: [{ campo, operador, valor }]
async function recalcularSegmento(tenantId, segmentId) {
  const [[segmento]] = await pool.query(
    "SELECT * FROM marketing_segments WHERE id = ? AND tenant_id = ? AND tipo = 'dinamico'",
    [segmentId, tenantId]
  );
  if (!segmento) throw new Error("Segmento dinamico nao encontrado");

  const criterios = typeof segmento.criterios === "string" ? JSON.parse(segmento.criterios) : (segmento.criterios || []);
  if (!Array.isArray(criterios) || criterios.length === 0) {
    throw new Error("Segmento dinamico sem criterios definidos");
  }

  const whereParts = ["tenant_id = ?"];
  const params = [tenantId];
  for (const c of criterios) {
    validarCampo(c.campo);
    const op = OPERADORES[c.operador];
    if (!op) throw new Error(`Operador invalido: ${c.operador}`);
    whereParts.push(`${c.campo} ${op} ?`);
    params.push(c.valor);
  }

  const [leadsQueBatem] = await pool.query(
    `SELECT id FROM marketing_leads WHERE ${whereParts.join(" AND ")}`,
    params
  );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM marketing_segment_members WHERE segment_id = ?", [segmentId]);
    for (const lead of leadsQueBatem) {
      await conn.query(
        "INSERT INTO marketing_segment_members (segment_id, lead_id) VALUES (?, ?)",
        [segmentId, lead.id]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return { segmento: segmento.nome, total_membros: leadsQueBatem.length };
}

async function recalcularTodosDinamicos() {
  const [segmentos] = await pool.query("SELECT id, tenant_id FROM marketing_segments WHERE tipo = 'dinamico'");
  let total = 0;
  for (const s of segmentos) {
    try {
      await recalcularSegmento(s.tenant_id, s.id);
      total++;
    } catch (err) {
      console.error(`[SEGMENT_ENGINE] Erro ao recalcular segmento ${s.id}:`, err.message);
    }
  }
  return total;
}

module.exports = { recalcularSegmento, recalcularTodosDinamicos };