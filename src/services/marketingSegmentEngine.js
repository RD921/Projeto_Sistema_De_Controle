// Segmentação dinâmica de leads e de clientes. Os critérios viram SQL parametrizado
// a partir de uma lista fechada de campos (nada que o usuário digita vira nome de coluna).
const pool = require("../config/db");

const OPERADORES = {
  equals: "=", not_equals: "!=", greater_than: ">", greater_than_or_equal: ">=",
  less_than: "<", less_than_or_equal: "<=", contains: "LIKE",
};

// tipo: texto | numero. expr = expressão SQL segura.
const CAMPOS = {
  leads: {
    status: { rotulo: "Status", tipo: "texto", expr: "l.status" },
    temperatura: { rotulo: "Temperatura", tipo: "texto", expr: "l.temperatura" },
    score: { rotulo: "Pontuação", tipo: "numero", expr: "l.score" },
    origem: { rotulo: "Origem", tipo: "texto", expr: "l.origem" },
    canal: { rotulo: "Canal", tipo: "texto", expr: "l.canal" },
    interesse: { rotulo: "Interesse", tipo: "texto", expr: "l.interesse" },
    utm_source: { rotulo: "UTM source", tipo: "texto", expr: "l.utm_source" },
    utm_campaign: { rotulo: "UTM campaign", tipo: "texto", expr: "l.utm_campaign" },
    campaign_id: { rotulo: "Campanha (id)", tipo: "numero", expr: "l.campaign_id" },
    valor_estimado: { rotulo: "Valor estimado (R$)", tipo: "numero", expr: "l.valor_estimado" },
    dias_sem_contato: { rotulo: "Dias sem contato", tipo: "numero", expr: "DATEDIFF(NOW(), COALESCE(l.ultimo_contato_em, l.created_at))" },
    dias_desde_captacao: { rotulo: "Dias desde a captação", tipo: "numero", expr: "DATEDIFF(NOW(), l.created_at)" },
  },
  clientes: {
    total_gasto: { rotulo: "Valor gasto (R$, pedidos pagos)", tipo: "numero", expr: "COALESCE(a.total_gasto, 0)" },
    qtd_pedidos: { rotulo: "Quantidade de pedidos pagos", tipo: "numero", expr: "COALESCE(a.qtd_pedidos, 0)" },
    ticket_medio: { rotulo: "Ticket médio (R$)", tipo: "numero", expr: "COALESCE(a.ticket_medio, 0)" },
    dias_sem_comprar: { rotulo: "Dias sem comprar", tipo: "numero", expr: "a.dias_sem_comprar" },
    dias_como_cliente: { rotulo: "Dias desde o cadastro", tipo: "numero", expr: "DATEDIFF(NOW(), c.created_at)" },
  },
};

function condicoes(base, criterios) {
  const campos = CAMPOS[base];
  if (!campos) throw new Error("Base inválida (use leads ou clientes)");
  if (!Array.isArray(criterios) || criterios.length === 0) throw new Error("Defina ao menos um critério");
  const partes = [], params = [];
  for (const c of criterios) {
    const def = campos[c.campo];
    if (!def) throw new Error(`Campo "${c.campo}" não é permitido para ${base}`);
    const op = OPERADORES[c.operador];
    if (!op) throw new Error(`Operador inválido: ${c.operador}`);
    if (c.operador === "contains" && def.tipo !== "texto") throw new Error(`"contém" só vale para campos de texto`);
    if (def.tipo === "numero") {
      const v = Number(c.valor);
      if (c.valor === "" || c.valor === null || Number.isNaN(v)) throw new Error(`Valor numérico inválido em "${def.rotulo}"`);
      partes.push(`${def.expr} ${op} ?`); params.push(v);
    } else {
      const v = String(c.valor ?? "").trim();
      if (!v) throw new Error(`Informe um valor para "${def.rotulo}"`);
      partes.push(`${def.expr} ${op} ?`); params.push(c.operador === "contains" ? `%${v}%` : v);
    }
  }
  return { sql: partes.join(" AND "), params };
}

function consulta(tenantId, base, criterios, extraSelect = "", limit = "") {
  const { sql, params } = condicoes(base, criterios);
  if (base === "leads") {
    return {
      sql: `SELECT l.id${extraSelect ? ", " + extraSelect : ""} FROM marketing_leads l WHERE l.tenant_id = ? AND ${sql}${limit}`,
      params: [tenantId, ...params],
    };
  }
  return {
    sql: `SELECT c.id${extraSelect ? ", " + extraSelect : ""} FROM customers c
          LEFT JOIN (SELECT customer_id, COUNT(*) AS qtd_pedidos, SUM(total) AS total_gasto, AVG(total) AS ticket_medio, DATEDIFF(NOW(), MAX(created_at)) AS dias_sem_comprar
                     FROM orders WHERE tenant_id = ? AND status = 'pago' GROUP BY customer_id) a ON a.customer_id = c.id
          WHERE c.tenant_id = ? AND c.ativo = 1 AND ${sql}${limit}`,
    params: [tenantId, tenantId, ...params],
  };
}

// Mostra quantos entram e alguns exemplos, sem salvar nada.
async function previsao(tenantId, base, criterios) {
  const total = consulta(tenantId, base, criterios, "");
  const [rows] = await pool.query(total.sql, total.params);
  const nome = base === "leads" ? "l.nome" : "c.nome";
  const amostra = consulta(tenantId, base, criterios, `${nome} AS nome`, " ORDER BY id DESC LIMIT 8");
  const [exemplos] = await pool.query(amostra.sql, amostra.params);
  return { total: rows.length, exemplos: exemplos.map(e => ({ id: e.id, nome: e.nome })) };
}

async function recalcularSegmento(tenantId, segmentId) {
  const [[segmento]] = await pool.query(
    "SELECT * FROM marketing_segments WHERE id = ? AND tenant_id = ? AND tipo = 'dinamico'", [segmentId, tenantId]);
  if (!segmento) throw new Error("Segmento dinamico nao encontrado");
  const criterios = typeof segmento.criterios === "string" ? JSON.parse(segmento.criterios) : (segmento.criterios || []);
  const base = segmento.base === "clientes" ? "clientes" : "leads";
  const q = consulta(tenantId, base, criterios);
  const [ids] = await pool.query(q.sql, q.params);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM marketing_segment_members WHERE segment_id = ?", [segmentId]);
    const coluna = base === "leads" ? "lead_id" : "customer_id";
    for (let i = 0; i < ids.length; i += 500) {
      const lote = ids.slice(i, i + 500);
      await conn.query(`INSERT INTO marketing_segment_members (segment_id, ${coluna}) VALUES ?`, [lote.map(r => [segmentId, r.id])]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  return { segmento: segmento.nome, base, total_membros: ids.length };
}

async function recalcularTodosDinamicos() {
  const [segmentos] = await pool.query("SELECT id, tenant_id FROM marketing_segments WHERE tipo = 'dinamico'");
  let total = 0;
  for (const s of segmentos) {
    try { await recalcularSegmento(s.tenant_id, s.id); total++; }
    catch (err) { console.error(`[SEGMENT_ENGINE] Erro ao recalcular segmento ${s.id}:`, err.message); }
  }
  return total;
}

function catalogoDeCampos() {
  const out = {};
  for (const [base, campos] of Object.entries(CAMPOS)) {
    out[base] = Object.entries(campos).map(([campo, d]) => ({ campo, rotulo: d.rotulo, tipo: d.tipo }));
  }
  return { bases: out, operadores: Object.keys(OPERADORES) };
}

module.exports = { recalcularSegmento, recalcularTodosDinamicos, previsao, catalogoDeCampos, CAMPOS };
