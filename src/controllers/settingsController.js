const pool = require("../config/db");

const LABELS_TIPO_JURIDICO = {
  mei: "MEI — Microempreendedor Individual",
  me: "ME — Microempresa",
  epp: "EPP — Empresa de Pequeno Porte",
  ltda: "LTDA — Sociedade Limitada",
  outros: "Outros",
  nao_definido: "Não definido",
};

exports.overview = async (req, res) => {
  try {
    const [[tenant]] = await pool.query(
      `SELECT t.id, t.nome, t.tipo_juridico, t.moeda, p.nome AS plano_nome, p.preco_mensal, p.limite_usuarios, p.limite_produtos
       FROM tenants t LEFT JOIN plans p ON p.id = t.plan_id
       WHERE t.id = ?`,
      [req.tenant_id]
    );
    const [[usuario]] = await pool.query("SELECT nome, email FROM users WHERE id = ?", [req.user.id]);
    const [[totalUsuarios]] = await pool.query(
      "SELECT COUNT(*) AS total FROM users WHERE tenant_id = ? AND ativo = TRUE",
      [req.tenant_id]
    );

    res.json({
      empresa: { nome: tenant.nome, tipo_juridico: tenant.tipo_juridico, tipo_juridico_label: LABELS_TIPO_JURIDICO[tenant.tipo_juridico] },
      plano: { nome: tenant.plano_nome, preco_mensal: tenant.preco_mensal, limite_usuarios: tenant.limite_usuarios, limite_produtos: tenant.limite_produtos, status: "ativo" },
      sistema: { moeda: tenant.moeda, status: "Tudo funcionando normalmente" },
      usuario: { nome: usuario.nome, email: usuario.email },
      total_usuarios: totalUsuarios.total,
    });
    } catch (err) {
    res.status(500).json({ error: "Erro ao carregar configurações", details: err.message });
  }
};

// ── Conta ──
exports.atualizarConta = async (req, res) => {
  try {
    const { nome, email } = req.body;
    if (!nome || !email) return res.status(400).json({ error: "nome e email sao obrigatorios" });

    const [[existente]] = await pool.query("SELECT id FROM users WHERE email = ? AND id != ?", [email, req.user.id]);
    if (existente) return res.status(409).json({ error: "Este e-mail ja esta em uso por outro usuario" });

    await pool.query("UPDATE users SET nome = ?, email = ? WHERE id = ?", [nome, email, req.user.id]);
    res.json({ message: "Conta atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar conta", details: err.message });
  }
};

exports.alterarSenha = async (req, res) => {
  try {
    const bcrypt = require("bcryptjs");
    const { senha_atual, senha_nova } = req.body;
    if (!senha_atual || !senha_nova) return res.status(400).json({ error: "senha_atual e senha_nova sao obrigatorias" });
    if (senha_nova.length < 8) return res.status(400).json({ error: "A nova senha deve ter ao menos 8 caracteres" });

    const [[user]] = await pool.query("SELECT senha FROM users WHERE id = ?", [req.user.id]);
    const confere = await bcrypt.compare(senha_atual, user.senha);
    if (!confere) return res.status(401).json({ error: "Senha atual incorreta" });

    const hash = await bcrypt.hash(senha_nova, 10);
    await pool.query("UPDATE users SET senha = ? WHERE id = ?", [hash, req.user.id]);
    res.json({ message: "Senha alterada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao alterar senha", details: err.message });
  }
};

// ── Tipo de Empresa ──
exports.atualizarTipoJuridico = async (req, res) => {
  try {
    const { tipo_juridico } = req.body;
    const validos = ["mei", "me", "epp", "ltda", "outros"];
    if (!validos.includes(tipo_juridico)) return res.status(400).json({ error: `tipo_juridico deve ser um de: ${validos.join(", ")}` });

    await pool.query("UPDATE tenants SET tipo_juridico = ? WHERE id = ?", [tipo_juridico, req.tenant_id]);
    res.json({ message: "Tipo de empresa atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar tipo de empresa", details: err.message });
  }
};

// ── Sistema ──
exports.atualizarSistema = async (req, res) => {
  try {
    const { moeda } = req.body;
    const validas = ["BRL", "USD", "EUR"];
    if (!validas.includes(moeda)) return res.status(400).json({ error: `moeda deve ser uma de: ${validas.join(", ")}` });

    await pool.query("UPDATE tenants SET moeda = ? WHERE id = ?", [moeda, req.tenant_id]);
    res.json({ message: "Configuracao do sistema atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar sistema", details: err.message });
  }
};

// ── Usuarios e Permissoes ──
exports.listarUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nome, email, role, ativo, created_at FROM users WHERE tenant_id = ? ORDER BY created_at ASC",
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar usuarios", details: err.message });
  }
};

exports.mudarRoleUsuario = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "user"].includes(role)) return res.status(400).json({ error: "role deve ser 'admin' ou 'user'" });
    if (Number(req.params.id) === req.user.id) return res.status(409).json({ error: "Voce nao pode alterar a propria role" });

    const [[alvo]] = await pool.query("SELECT id FROM users WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!alvo) return res.status(404).json({ error: "Usuario nao encontrado" });

    await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id]);
    res.json({ message: "Papel do usuario atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao mudar role", details: err.message });
  }
};

exports.alternarAtivoUsuario = async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id) return res.status(409).json({ error: "Voce nao pode desativar a propria conta" });

    const [[alvo]] = await pool.query("SELECT ativo FROM users WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!alvo) return res.status(404).json({ error: "Usuario nao encontrado" });

    await pool.query("UPDATE users SET ativo = ? WHERE id = ?", [!alvo.ativo, req.params.id]);
    res.json({ message: alvo.ativo ? "Usuario desativado" : "Usuario reativado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao alternar status do usuario", details: err.message });
  }
};

exports.sistemaInfo = async (req, res) => {
  try {
    const [[dbCheck]] = await pool.query("SELECT 1 AS ok");
    res.json({
      node_version: process.version,
      uptime_segundos: Math.floor(process.uptime()),
      ambiente: process.env.NODE_ENV || "development",
      banco_conectado: !!dbCheck,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar informacoes do sistema", details: err.message });
  }
};