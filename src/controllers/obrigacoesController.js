const pool = require("../config/db");

exports.listar = async (req, res) => {
  try {
    const { status, competencia } = req.query;
    let sql = "SELECT * FROM fiscal_obligations WHERE tenant_id = ?";
    const params = [req.tenant_id];
    if (status) { sql += " AND status = ?"; params.push(status); }
    if (competencia) { sql += " AND competencia = ?"; params.push(competencia); }
    sql += " ORDER BY prazo ASC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar obrigações", details: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { nome, tipo, competencia, prazo, responsavel, observacoes } = req.body;
    if (!nome || !competencia || !prazo) {
      return res.status(400).json({ error: "nome, competencia e prazo são obrigatórios" });
    }
    const [result] = await pool.query(
      `INSERT INTO fiscal_obligations (tenant_id, nome, tipo, competencia, prazo, responsavel, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.tenant_id, nome, tipo || "outra", competencia, prazo, responsavel || null, observacoes || null]
    );
    res.status(201).json({ id: result.insertId, message: "Obrigação criada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar obrigação", details: err.message });
  }
};

exports.atualizarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, protocolo } = req.body;
    const statusValidos = ["nao_iniciado","em_preparacao","aguardando_revisao","com_erro","pronto","transmitido","recebido","rejeitado","retificado"];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ error: "status inválido" });
    }
    const dataTransmissao = status === "transmitido" ? new Date() : null;
    const [result] = await pool.query(
      `UPDATE fiscal_obligations
       SET status = ?, protocolo = COALESCE(?, protocolo), data_transmissao = COALESCE(?, data_transmissao)
       WHERE id = ? AND tenant_id = ?`,
      [status, protocolo || null, dataTransmissao, id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Obrigação não encontrada" });
    res.json({ message: "Status atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar status", details: err.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, tipo, competencia, prazo, responsavel, observacoes } = req.body;
    const [result] = await pool.query(
      `UPDATE fiscal_obligations
       SET nome = ?, tipo = ?, competencia = ?, prazo = ?, responsavel = ?, observacoes = ?
       WHERE id = ? AND tenant_id = ?`,
      [nome, tipo, competencia, prazo, responsavel || null, observacoes || null, id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Obrigação não encontrada" });
    res.json({ message: "Obrigação atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar obrigação", details: err.message });
  }
};

exports.excluir = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "DELETE FROM fiscal_obligations WHERE id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Obrigação não encontrada" });
    res.json({ message: "Obrigação excluída" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir obrigação", details: err.message });
  }
};

// Próximas obrigações (para alertas), com classificação de urgência
exports.proximas = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias) || 30;
    const [rows] = await pool.query(
      `SELECT *, DATEDIFF(prazo, CURDATE()) AS dias_restantes
       FROM fiscal_obligations
       WHERE tenant_id = ?
         AND status NOT IN ('transmitido', 'recebido')
         AND prazo <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY prazo ASC`,
      [req.tenant_id, dias]
    );

    const comUrgencia = rows.map(r => {
      let urgencia = "informativo";
      if (r.dias_restantes < 0) urgencia = "critico";
      else if (r.dias_restantes <= 3) urgencia = "critico";
      else if (r.dias_restantes <= 7) urgencia = "atencao";
      else if (r.dias_restantes <= 15) urgencia = "moderado";
      return { ...r, urgencia };
    });

    res.json(comUrgencia);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar próximas obrigações", details: err.message });
  }
};