const pool = require("../config/db");

const FLUXO = ["solicitada", "em_analise", "aprovada", "etiqueta_gerada", "em_transporte", "recebida", "conferida", "concluida"];

exports.listar = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT r.*, s.order_id, s.tracking_code, c.nome AS customer_nome
               FROM logistics_returns r
               JOIN logistics_shipments s ON s.id = r.shipment_id
               LEFT JOIN orders o ON o.id = s.order_id
               LEFT JOIN customers c ON c.id = o.customer_id
               WHERE r.tenant_id = ?`;
    const params = [req.tenant_id];
    if (status) { sql += " AND r.status = ?"; params.push(status); }
    sql += " ORDER BY r.created_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar devolucoes", details: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { shipment_id, motivo, descricao } = req.body;
    if (!shipment_id || !motivo) return res.status(400).json({ error: "shipment_id e motivo sao obrigatorios" });

    const [[envio]] = await pool.query("SELECT id FROM logistics_shipments WHERE id = ? AND tenant_id = ?", [shipment_id, req.tenant_id]);
    if (!envio) return res.status(400).json({ error: "shipment_id invalido para este tenant" });

    const [result] = await pool.query(
      "INSERT INTO logistics_returns (tenant_id, shipment_id, motivo, descricao) VALUES (?, ?, ?, ?)",
      [req.tenant_id, shipment_id, motivo, descricao || null]
    );
    res.status(201).json({ id: result.insertId, status: "solicitada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar devolucao", details: err.message });
  }
};

exports.avancarStatus = async (req, res) => {
  try {
    const { status, destino_produto, reembolso_valor, custo_logistica_reversa } = req.body;
    const [[devolucao]] = await pool.query("SELECT * FROM logistics_returns WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!devolucao) return res.status(404).json({ error: "Devolucao nao encontrada" });

    if (status === "rejeitada") {
      await pool.query("UPDATE logistics_returns SET status = 'rejeitada' WHERE id = ?", [req.params.id]);
      return res.json({ message: "Devolucao rejeitada" });
    }

    if (!FLUXO.includes(status)) return res.status(400).json({ error: "status invalido" });

    const campos = { status };
    if (destino_produto) campos.destino_produto = destino_produto;
    if (reembolso_valor != null) {
      campos.reembolso_valor = reembolso_valor;
      campos.reembolso_status = "pendente";
    }
    if (custo_logistica_reversa != null) campos.custo_logistica_reversa = custo_logistica_reversa;

    const setClause = Object.keys(campos).map(k => `${k} = ?`).join(", ");
    await pool.query(`UPDATE logistics_returns SET ${setClause} WHERE id = ?`, [...Object.values(campos), req.params.id]);

    res.json({ message: "Status da devolucao atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao avancar status da devolucao", details: err.message });
  }
};

exports.processarReembolso = async (req, res) => {
  try {
    const [[devolucao]] = await pool.query("SELECT reembolso_valor FROM logistics_returns WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!devolucao) return res.status(404).json({ error: "Devolucao nao encontrada" });
    if (!devolucao.reembolso_valor) return res.status(409).json({ error: "Nenhum valor de reembolso definido para esta devolucao" });

    await pool.query("UPDATE logistics_returns SET reembolso_status = 'processado' WHERE id = ?", [req.params.id]);
    res.json({ message: "Reembolso marcado como processado. Lancamento financeiro deve ser criado manualmente no modulo Financeiro (integracao automatica fica para fase futura)." });
  } catch (err) {
    res.status(500).json({ error: "Erro ao processar reembolso", details: err.message });
  }
};