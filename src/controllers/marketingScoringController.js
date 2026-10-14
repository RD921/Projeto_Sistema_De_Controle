const pool = require("../config/db");
const { CAMPOS_ATRIBUTO, OPERADORES_ATRIBUTO } = require("../services/marketingScoringService");
const { prepararTenant } = require("../services/marketingSchema");

exports.listarRegras = async (req, res) => {
  try {
    await prepararTenant(req.tenant_id);
    const [rows] = await pool.query("SELECT * FROM marketing_scoring_rules WHERE tenant_id = ? ORDER BY tipo, event_type, id", [req.tenant_id]);
    res.json({ regras: rows, campos_atributo: CAMPOS_ATRIBUTO, operadores_atributo: OPERADORES_ATRIBUTO, limites_temperatura: { quente: 70, morno: 30 } });
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar regras" });
  }
};

// Regra de EVENTO: { tipo: "evento", event_type, pontos, descricao }
// Regra de ATRIBUTO: { tipo: "atributo", campo, operador, valor, pontos, descricao }
exports.criarRegra = async (req, res) => {
  try {
    const { tipo = "evento", event_type, campo, operador, valor, pontos, descricao } = req.body || {};
    if (!Number.isInteger(pontos) || Math.abs(pontos) > 100) return res.status(400).json({ error: "pontos deve ser um número inteiro entre -100 e 100" });
    if (tipo === "atributo") {
      if (!CAMPOS_ATRIBUTO.includes(campo)) return res.status(400).json({ error: `campo inválido. Use: ${CAMPOS_ATRIBUTO.join(", ")}` });
      if (!OPERADORES_ATRIBUTO.includes(operador)) return res.status(400).json({ error: `operador inválido. Use: ${OPERADORES_ATRIBUTO.join(", ")}` });
      const semValor = ["preenchido", "vazio"].includes(operador);
      if (!semValor && (valor === undefined || valor === null || String(valor).trim() === "")) return res.status(400).json({ error: "informe o valor da regra" });
      const [result] = await pool.query(
        "INSERT INTO marketing_scoring_rules (tenant_id, event_type, tipo, campo, operador, valor, pontos, descricao) VALUES (?, 'atributo', 'atributo', ?, ?, ?, ?, ?)",
        [req.tenant_id, campo, operador, semValor ? null : String(valor).slice(0, 150), pontos, descricao ? String(descricao).slice(0, 255) : null]);
      return res.status(201).json({ id: result.insertId });
    }
    if (!event_type || !/^[a-z0-9_]{3,100}$/.test(event_type)) return res.status(400).json({ error: "event_type deve usar letras minúsculas, números e _ (ex: interacao_resposta)" });
    const [result] = await pool.query(
      "INSERT INTO marketing_scoring_rules (tenant_id, event_type, tipo, pontos, descricao) VALUES (?, ?, 'evento', ?, ?)",
      [req.tenant_id, event_type, pontos, descricao ? String(descricao).slice(0, 255) : null]);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error("[SCORING] criarRegra:", err.message);
    res.status(500).json({ error: "Erro ao criar regra" });
  }
};

exports.atualizarRegra = async (req, res) => {
  try {
    const { ativa, pontos, descricao } = req.body || {};
    const campos = [];
    const valores = [];
    if (typeof ativa === "boolean") { campos.push("ativa = ?"); valores.push(ativa); }
    if (pontos !== undefined) {
      if (!Number.isInteger(pontos) || Math.abs(pontos) > 100) return res.status(400).json({ error: "pontos deve ser um número inteiro entre -100 e 100" });
      campos.push("pontos = ?"); valores.push(pontos);
    }
    if (descricao !== undefined) { campos.push("descricao = ?"); valores.push(String(descricao).slice(0, 255)); }
    if (campos.length === 0) return res.status(400).json({ error: "nada para atualizar" });
    valores.push(req.params.id, req.tenant_id);
    const [result] = await pool.query(`UPDATE marketing_scoring_rules SET ${campos.join(", ")} WHERE id = ? AND tenant_id = ?`, valores);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Regra nao encontrada" });
    res.json({ message: "Regra atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar regra" });
  }
};

exports.excluirRegra = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM marketing_scoring_rules WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Regra nao encontrada" });
    res.json({ message: "Regra excluida" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir regra" });
  }
};

exports.historicoDoLead = async (req, res) => {
  try {
    const [[lead]] = await pool.query("SELECT id FROM marketing_leads WHERE id = ? AND tenant_id = ?", [req.params.leadId, req.tenant_id]);
    if (!lead) return res.status(404).json({ error: "Lead nao encontrado" });

    const [rows] = await pool.query(
      "SELECT * FROM marketing_lead_score_history WHERE lead_id = ? ORDER BY created_at DESC",
      [req.params.leadId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar historico" });
  }
};