const pool = require("../config/db");

exports.listar = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM cost_centers WHERE tenant_id = ? ORDER BY codigo",
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar centros de custo", details: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { codigo, nome, descricao } = req.body;
    if (!codigo || !nome) return res.status(400).json({ error: "codigo e nome são obrigatórios" });

    const [result] = await pool.query(
      "INSERT INTO cost_centers (tenant_id, codigo, nome, descricao) VALUES (?, ?, ?, ?)",
      [req.tenant_id, codigo.toUpperCase(), nome, descricao || null]
    );
    res.status(201).json({ id: result.insertId, message: "Centro de custo criado" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Já existe um centro de custo com esse código" });
    res.status(500).json({ error: "Erro ao criar centro de custo", details: err.message });
  }
};

exports.atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, nome, descricao, ativo } = req.body;
    const [result] = await pool.query(
      "UPDATE cost_centers SET codigo = ?, nome = ?, descricao = ?, ativo = ? WHERE id = ? AND tenant_id = ?",
      [codigo.toUpperCase(), nome, descricao || null, ativo !== undefined ? ativo : true, id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Centro de custo não encontrado" });
    res.json({ message: "Centro de custo atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar centro de custo", details: err.message });
  }
};

exports.desativar = async (req, res) => {
  try {
    const { id } = req.params;
    const [[centro]] = await pool.query("SELECT codigo FROM cost_centers WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    if (!centro) return res.status(404).json({ error: "Centro de custo não encontrado" });
    if (centro.codigo === "GERAL") return res.status(400).json({ error: "O centro de custo 'Geral' não pode ser desativado" });

    await pool.query("UPDATE cost_centers SET ativo = FALSE WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);
    res.json({ message: "Centro de custo desativado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desativar centro de custo", details: err.message });
  }
};

// Relatório: quanto cada centro de custo consumiu/gerou, cruzando financial_entries
exports.relatorio = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT cc.id, cc.codigo, cc.nome,
         COALESCE(SUM(CASE WHEN fe.tipo = 'receita' THEN fe.valor ELSE 0 END), 0) AS receitas,
         COALESCE(SUM(CASE WHEN fe.tipo = 'despesa' THEN fe.valor ELSE 0 END), 0) AS despesas
       FROM cost_centers cc
       LEFT JOIN financial_entries fe ON fe.cost_center_id = cc.id
       WHERE cc.tenant_id = ?
       GROUP BY cc.id, cc.codigo, cc.nome
       ORDER BY cc.codigo`,
      [req.tenant_id]
    );
    const comSaldo = rows.map(r => ({
      ...r,
      receitas: Number(r.receitas).toFixed(2),
      despesas: Number(r.despesas).toFixed(2),
      saldo: (Number(r.receitas) - Number(r.despesas)).toFixed(2),
    }));
    res.json(comSaldo);
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar relatório", details: err.message });
  }
};