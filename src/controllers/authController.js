const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const twoFactor = require("../services/twoFactorService");

exports.login = async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || null;
  try {
    const { email, senha, codigo_2fa } = req.body || {};
    if (!email || !senha)
      return res.status(400).json({ error: "Email e senha sao obrigatorios" });
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      await pool.query("INSERT INTO login_attempts (email, sucesso, motivo_falha, ip) VALUES (?, FALSE, 'usuario_nao_encontrado', ?)", [email, ip]);
      return res.status(401).json({ error: "Usuario nao encontrado" });
    }
    const user = users[0];
    if (!user.ativo) {
      await pool.query("INSERT INTO login_attempts (email, user_id, tenant_id, sucesso, motivo_falha, ip) VALUES (?, ?, ?, FALSE, 'usuario_inativo', ?)", [email, user.id, user.tenant_id, ip]);
      return res.status(403).json({ error: "Usuario inativo" });
    }
    const match = await bcrypt.compare(senha, user.senha);
    if (!match) {
      await pool.query("INSERT INTO login_attempts (email, user_id, tenant_id, sucesso, motivo_falha, ip) VALUES (?, ?, ?, FALSE, 'senha_invalida', ?)", [email, user.id, user.tenant_id, ip]);
      return res.status(401).json({ error: "Senha invalida" });
    }

    // Se o usuario tem 2FA ativado, senha correta nao basta - precisa do codigo tambem.
    // Se o codigo nao foi enviado ainda, avisa o frontend para pedir o segundo fator
    // (sem emitir token, e sem contar como tentativa de login falha - a senha estava certa).
    if (user.totp_enabled) {
      if (!codigo_2fa) {
        return res.status(200).json({ requer_2fa: true, message: "Senha correta. Informe o codigo do autenticador." });
      }

      const twoFactor = require("../services/twoFactorService");
      const codigoValido = twoFactor.verificarCodigo(user.totp_secret, codigo_2fa);

      let usouBackup = false;
      if (!codigoValido) {
        const codigosBackup = user.totp_backup_codes ? JSON.parse(user.totp_backup_codes) : [];
        if (codigosBackup.includes(codigo_2fa)) {
          usouBackup = true;
          const restantes = codigosBackup.filter(c => c !== codigo_2fa);
          await pool.query("UPDATE users SET totp_backup_codes = ? WHERE id = ?", [JSON.stringify(restantes), user.id]);
        } else {
          await pool.query("INSERT INTO login_attempts (email, user_id, tenant_id, sucesso, motivo_falha, ip) VALUES (?, ?, ?, FALSE, 'codigo_2fa_invalido', ?)", [email, user.id, user.tenant_id, ip]);
          return res.status(401).json({ error: "Codigo de autenticacao invalido" });
        }
      }
    }

    await pool.query("INSERT INTO login_attempts (email, user_id, tenant_id, sucesso, ip) VALUES (?, ?, ?, TRUE, ?)", [email, user.id, user.tenant_id, ip]);
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
    const { empresa, email_empresa, nome_admin, email_admin, senha, plano_id, moeda } = req.body || {};
    if (!empresa || !email_empresa || !nome_admin || !email_admin || !senha)
      return res.status(400).json({ error: "Todos os campos sao obrigatorios" });
    const [existingTenant] = await pool.query("SELECT id FROM tenants WHERE email = ?", [email_empresa]);
    if (existingTenant.length > 0)
      return res.status(409).json({ error: "Empresa ja cadastrada" });
    const [existingUser] = await pool.query("SELECT id FROM users WHERE email = ?", [email_admin]);
    if (existingUser.length > 0)
      return res.status(409).json({ error: "Email de admin ja cadastrado" });
    const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const moedasSuportadas = ["BRL", "USD", "EUR"];
    const moedaEscolhida = moedasSuportadas.includes(moeda) ? moeda : "BRL";

   const [tenantResult] = await pool.query(
  "INSERT INTO tenants (nome, email, plan_id, trial_ends_at, moeda) VALUES (?, ?, ?, ?, ?)",
  [empresa, email_empresa, plano_id || 1, trialEnds, moedaEscolhida]
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

exports.minhasEmpresas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.id, t.nome, t.email, t.moeda, ut.role, ut.is_default
       FROM user_tenants ut
       JOIN tenants t ON t.id = ut.tenant_id
       WHERE ut.user_id = ? AND t.ativo = 1
       ORDER BY ut.is_default DESC, t.nome ASC`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Erro ao listar empresas", details: err.message });
  }
};

exports.trocarEmpresa = async (req, res) => {
    try {
      const { tenant_id } = req.body || {};
      if (!tenant_id) return res.status(400).json({ error: "tenant_id é obrigatório" });

      const [vinculo] = await pool.query(
        `SELECT ut.role, t.nome FROM user_tenants ut
         JOIN tenants t ON t.id = ut.tenant_id
         WHERE ut.user_id = ? AND ut.tenant_id = ? AND t.ativo = 1`,
        [req.user.id, tenant_id]
      );
      if (vinculo.length === 0) {
        return res.status(403).json({ error: "Você não tem acesso a essa empresa." });
      }

      const token = jwt.sign(
        { id: req.user.id, email: req.user.email, role: vinculo[0].role, tenant_id: Number(tenant_id) },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      try {
        const audit = require("../services/auditService");
        await audit.registrar({
          tenantId: Number(tenant_id), usuarioId: req.user.id, usuarioNome: req.user.email,
          acao: `Trocou de empresa (login) para ${vinculo[0].nome}`, origem: "Autenticação",
        });
      } catch { /* auditoria nao deve travar a troca de empresa */ }

      return res.json({ message: `Empresa alterada para ${vinculo[0].nome}`, token, tenant_id: Number(tenant_id) });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao trocar de empresa", details: err.message });
    }
  };

  // ── 2FA: Configuracao ──
exports.iniciar2FA = async (req, res) => {
  try {
    const [[user]] = await pool.query("SELECT email, totp_enabled FROM users WHERE id = ?", [req.user.id]);
    if (user.totp_enabled) return res.status(409).json({ error: "2FA ja esta ativado. Desative antes de configurar novamente." });

    const { base32, otpauthUrl } = twoFactor.gerarSegredo(user.email);
    const qrCodeDataUrl = await twoFactor.gerarQrCode(otpauthUrl);

    // Guarda o segredo temporariamente (ainda nao habilitado) ate a confirmacao
    await pool.query("UPDATE users SET totp_secret = ? WHERE id = ?", [base32, req.user.id]);

    res.json({ qr_code: qrCodeDataUrl, segredo_manual: base32 });
  } catch (err) {
    res.status(500).json({ error: "Erro ao iniciar configuracao de 2FA", details: err.message });
  }
};

exports.confirmar2FA = async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ error: "codigo e obrigatorio" });

    const [[user]] = await pool.query("SELECT totp_secret FROM users WHERE id = ?", [req.user.id]);
    if (!user.totp_secret) return res.status(400).json({ error: "Nenhuma configuracao de 2FA pendente. Inicie o processo primeiro." });

    const valido = twoFactor.verificarCodigo(user.totp_secret, codigo);
    if (!valido) return res.status(400).json({ error: "Codigo invalido. Confira o app autenticador e tente novamente." });

    const codigosBackup = twoFactor.gerarCodigosBackup();
    await pool.query(
      "UPDATE users SET totp_enabled = TRUE, totp_backup_codes = ? WHERE id = ?",
      [JSON.stringify(codigosBackup), req.user.id]
    );

    try {
      const audit = require("../services/auditService");
      await audit.registrar({
        tenantId: req.user.tenant_id, usuarioId: req.user.id, usuarioNome: req.user.email,
        acao: "Ativou autenticação em dois fatores", origem: "Segurança",
      });
    } catch {}

    res.json({ message: "2FA ativado com sucesso", codigos_backup: codigosBackup });
  } catch (err) {
    res.status(500).json({ error: "Erro ao confirmar 2FA", details: err.message });
  }
};

exports.desativar2FA = async (req, res) => {
  try {
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ error: "senha atual e obrigatoria para desativar 2FA" });

    const [[user]] = await pool.query("SELECT senha, email FROM users WHERE id = ?", [req.user.id]);
    const confere = await bcrypt.compare(senha, user.senha);
    if (!confere) return res.status(401).json({ error: "Senha incorreta" });

    await pool.query("UPDATE users SET totp_enabled = FALSE, totp_secret = NULL, totp_backup_codes = NULL WHERE id = ?", [req.user.id]);

    try {
      const audit = require("../services/auditService");
      await audit.registrar({
        tenantId: req.user.tenant_id, usuarioId: req.user.id, usuarioNome: user.email,
        acao: "Desativou autenticação em dois fatores", origem: "Segurança",
      });
    } catch {}

    res.json({ message: "2FA desativado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao desativar 2FA", details: err.message });
  }
};

exports.status2FA = async (req, res) => {
  try {
    const [[user]] = await pool.query("SELECT totp_enabled FROM users WHERE id = ?", [req.user.id]);
    res.json({ ativado: !!user.totp_enabled });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar status de 2FA", details: err.message });
  }
};