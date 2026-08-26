const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body || {};
    if (!email || !senha)
      return res.status(400).json({ error: "Email e senha sao obrigatorios" });
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) return res.status(401).json({ error: "Usuario nao encontrado" });
    const user = users[0];
    if (!user.ativo) return res.status(403).json({ error: "Usuario inativo" });
    const match = await bcrypt.compare(senha, user.senha);
    if (!match) return res.status(401).json({ error: "Senha invalida" });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenant_id: user.tenant_id || 1 },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.json({ message: "Login realizado com sucesso", token, tenant_id: user.tenant_id });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { empresa, email_empresa, nome_admin, email_admin, senha, plano_id } = req.body || {};
    if (!empresa || !email_empresa || !nome_admin || !email_admin || !senha)
      return res.status(400).json({ error: "Todos os campos sao obrigatorios" });
    const [existingTenant] = await pool.query("SELECT id FROM tenants WHERE email = ?", [email_empresa]);
    if (existingTenant.length > 0)
      return res.status(409).json({ error: "Empresa ja cadastrada" });
    const [existingUser] = await pool.query("SELECT id FROM users WHERE email = ?", [email_admin]);
    if (existingUser.length > 0)
      return res.status(409).json({ error: "Email de admin ja cadastrado" });
    const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const [tenantResult] = await pool.query(
      "INSERT INTO tenants (nome, email, plan_id, trial_ends_at) VALUES (?, ?, ?, ?)",
      [empresa, email_empresa, plano_id || 1, trialEnds]
    );
    const tenantId = tenantResult.insertId;
    const hash = await bcrypt.hash(senha, 10);
    const [userResult] = await pool.query(
      "INSERT INTO users (nome, email, senha, role, tenant_id) VALUES (?, ?, ?, 'admin', ?)",
      [nome_admin, email_admin, hash, tenantId]
    );

    const token = jwt.sign(
      { id: userResult.insertId, email: email_admin, role: "admin", tenant_id: tenantId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Empresa registrada com sucesso",
      token,
      tenant_id: tenantId,
      trial_ends: trialEnds
    });
  } catch (err) {
    return res.status(500).json({ error: "Erro ao registrar empresa", details: err.message });
  }
};

exports.suporte = async (req, res) => {
  try {
    const { mensagem } = req.body || {};
    if (!mensagem || !mensagem.trim())
      return res.status(400).json({ error: "Mensagem é obrigatória" });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"EcomFlow Suporte" <${process.env.EMAIL_USER}>`,
      to: "rodrigoarrezzimaciel17@gmail.com",
      subject: "Nova mensagem de suporte - EcomFlow",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1d1d1f;">Nova mensagem de suporte</h2>
          <div style="background: #f5f5f7; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="color: #1d1d1f; font-size: 16px; line-height: 1.6;">${mensagem}</p>
          </div>
          <p style="color: #6e6e73; font-size: 12px;">Enviado via EcomFlow em ${new Date().toLocaleString("pt-BR")}</p>
        </div>
      `,
    });

    return res.json({ message: "Mensagem enviada com sucesso" });
  } catch (err) {
    console.error("[suporte] erro:", err.message);
    return res.status(500).json({ error: "Erro ao enviar mensagem", details: err.message });
  }
};