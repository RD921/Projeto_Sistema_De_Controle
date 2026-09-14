const pool = require("../config/db");
const eventDispatcher = require("../automation/engine/EventDispatcher");

exports.listar = async (req, res) => {
  try {
    const { estagio } = req.query;
    let sql = `SELECT d.*, c.nome AS customer_nome FROM crm_deals d
               JOIN customers c ON c.id = d.customer_id WHERE d.tenant_id = ?`;
    const params = [req.tenant_id];
    if (estagio) { sql += " AND d.estagio = ?"; params.push(estagio); }
    sql += " ORDER BY d.updated_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar oportunidades", details: err.message });
  }
};

// Visao de pipeline: agrupa as oportunidades por estagio, pronto para renderizar
// como quadro kanban no frontend.
exports.pipeline = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, c.nome AS customer_nome FROM crm_deals d
       JOIN customers c ON c.id = d.customer_id
       WHERE d.tenant_id = ? AND d.estagio NOT IN ('ganho','perdido')
       ORDER BY d.updated_at DESC`,
      [req.tenant_id]
    );
    const estagios = ["prospeccao", "qualificacao", "proposta", "negociacao"];
    const agrupado = {};
    for (const e of estagios) agrupado[e] = [];
    for (const deal of rows) {
      if (agrupado[deal.estagio]) agrupado[deal.estagio].push(deal);
    }
    res.json(agrupado);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar pipeline", details: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { customer_id, titulo, valor } = req.body;
    if (!customer_id || !titulo) return res.status(400).json({ error: "customer_id e titulo sao obrigatorios" });

    const [[customer]] = await pool.query("SELECT id FROM customers WHERE id = ? AND tenant_id = ?", [customer_id, req.tenant_id]);
    if (!customer) return res.status(400).json({ error: "customer_id invalido para este tenant" });

    const [result] = await pool.query(
      "INSERT INTO crm_deals (tenant_id, customer_id, titulo, valor) VALUES (?, ?, ?, ?)",
      [req.tenant_id, customer_id, titulo, valor || null]
    );
    const dealId = result.insertId;

    try {
      await eventDispatcher.dispatch("deal_created", req.tenant_id, { deal_id: dealId, customer_id, titulo, valor });
    } catch { /* nao bloqueia */ }

    res.status(201).json({ id: dealId });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar oportunidade", details: err.message });
  }
};

// Edita titulo/valor de uma oportunidade ja existente. Nao mexe em estagio -
// isso continua sendo responsabilidade exclusiva de mudarEstagio (mantem a
// logica de closed_at/motivo_perda/eventos deal_won/deal_lost centralizada
// num unico lugar, sem duplicar regra de negocio aqui).
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, valor } = req.body;
    if (titulo === undefined && valor === undefined) {
      return res.status(400).json({ error: "informe pelo menos titulo ou valor para atualizar" });
    }

    const [[deal]] = await pool.query("SELECT * FROM crm_deals WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (!deal) return res.status(404).json({ error: "Oportunidade nao encontrada" });

    const novoTitulo = titulo !== undefined ? titulo : deal.titulo;
    const novoValor = valor !== undefined ? valor : deal.valor;

    await pool.query("UPDATE crm_deals SET titulo = ?, valor = ? WHERE id = ?", [novoTitulo, novoValor, id]);
    res.json({ message: "Oportunidade atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar oportunidade", details: err.message });
  }
};

// Move a oportunidade de estagio - reaproveita o mesmo padrao de eventos usado
// em Leads/Campanhas. Ganho/Perdido disparam eventos dedicados alem do generico.
exports.mudarEstagio = async (req, res) => {
  try {
    const { id } = req.params;
    const { estagio, motivo_perda } = req.body;
    const validos = ["prospeccao", "qualificacao", "proposta", "negociacao", "ganho", "perdido"];
    if (!validos.includes(estagio)) return res.status(400).json({ error: "estagio invalido" });

    const [[deal]] = await pool.query("SELECT * FROM crm_deals WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (!deal) return res.status(404).json({ error: "Oportunidade nao encontrada" });

    const fechando = estagio === "ganho" || estagio === "perdido";
    await pool.query(
      "UPDATE crm_deals SET estagio = ?, motivo_perda = ?, closed_at = ? WHERE id = ?",
      [estagio, estagio === "perdido" ? (motivo_perda || null) : null, fechando ? new Date() : null, id]
    );

    try {
      await eventDispatcher.dispatch("deal_stage_changed", req.tenant_id, { deal_id: Number(id), customer_id: deal.customer_id, novo_estagio: estagio, valor: deal.valor });
    } catch { /* nao bloqueia */ }

    if (estagio === "ganho") {
      try { await eventDispatcher.dispatch("deal_won", req.tenant_id, { deal_id: Number(id), customer_id: deal.customer_id, titulo: deal.titulo, valor: deal.valor }); } catch {}
    }
    if (estagio === "perdido") {
      try { await eventDispatcher.dispatch("deal_lost", req.tenant_id, { deal_id: Number(id), customer_id: deal.customer_id, titulo: deal.titulo, motivo_perda }); } catch {}
    }

    res.json({ message: "Estagio atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao mudar estagio", details: err.message });
  }
};

exports.excluir = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM crm_deals WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Oportunidade nao encontrada" });
    res.json({ message: "Oportunidade excluida" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir oportunidade", details: err.message });
  }
};