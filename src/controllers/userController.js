const pool = require("../config/db");
const bcrypt = require("bcryptjs");
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const tid = req.tenant_id;
    const [[countRows], [rows]] = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM users WHERE tenant_id = ?", [tid]),
      pool.query("SELECT id, nome, email, role, ativo, created_at FROM users WHERE tenant_id = ? LIMIT ? OFFSET ?", [tid, limit, offset])
    ]);
    res.json({ data: rows, page, limit, total: countRows[0].total });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar usuarios", details: err.message });
  }
};
exports.getUserById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nome, email, role, ativo, created_at FROM users WHERE id = ? AND tenant_id = ?",
      [req.params.id, req.tenant_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Usuario nao encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar usuario", details: err.message });
  }
};
exports.createUser = async (req, res) => {
    try {
      const { nome, email, senha, role } = req.body || {};
      if (!nome || !email || !senha) {
        return res.status(400).json({ error: "Nome, email e senha sao obrigatorios" });
      }
      const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
      if (existing.length > 0) return res.status(409).json({ error: "Email ja cadastrado" });
      const hash = await bcrypt.hash(senha, 10);
      await pool.query(
        "INSERT INTO users (nome, email, senha, role, tenant_id) VALUES (?, ?, ?, ?, ?)",
        [nome, email, hash, role || "user", req.tenant_id]
      );

      try {
        const audit = require("../services/auditService");
        const pool2 = require("../config/db");
        const [[quemCriou]] = await pool2.query("SELECT nome FROM users WHERE id = ?", [req.user.id]);
        await audit.registrar({
          tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: quemCriou?.nome,
          acao: `Criou o usuário ${nome}`, origem: "Usuários e Permissões",
          valorNovo: `${email} (${role || "user"})`,
        });
      } catch { /* auditoria nao deve travar a criacao do usuario */ }

      res.status(201).json({ message: "Usuario criado com sucesso" });
    } catch (err) {
      res.status(500).json({ error: "Erro ao criar usuario", details: err.message });
    }
  };
exports.updateUser = async (req, res) => {
  try {
    const { nome, email, role, ativo } = req.body || {};
    const [existing] = await pool.query("SELECT id FROM users WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (existing.length === 0) return res.status(404).json({ error: "Usuario nao encontrado" });
    await pool.query(
      "UPDATE users SET nome = COALESCE(?, nome), email = COALESCE(?, email), role = COALESCE(?, role), ativo = COALESCE(?, ativo) WHERE id = ? AND tenant_id = ?",
      [nome, email, role, ativo, req.params.id, req.tenant_id]
    );
    res.json({ message: "Usuario atualizado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar usuario", details: err.message });
  }
};
exports.deleteUser = async (req, res) => {
  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (existing.length === 0) return res.status(404).json({ error: "Usuario nao encontrado" });
    await pool.query("DELETE FROM users WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    res.json({ message: "Usuario removido com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao remover usuario", details: err.message });
  }
};
