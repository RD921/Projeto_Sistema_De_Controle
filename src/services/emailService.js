const nodemailer = require("nodemailer");

// Reaproveita a mesma configuracao SMTP ja usada em authController.js (formulario de suporte),
// mas de forma generica: aceita destinatario/assunto/corpo como parametros.
function criarTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function enviarEmail({ to, subject, html, fromName = "EcomFlow" }) {
  if (!to) throw new Error("Destinatario (to) e obrigatorio para enviar email");
  if (!subject) throw new Error("Assunto (subject) e obrigatorio para enviar email");

  const transporter = criarTransporter();
  const info = await transporter.sendMail({
    from: `"${fromName}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: html || "",
  });
  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

module.exports = { enviarEmail };