const { enviarEmail } = require("../../services/emailService");
const { resolverTemplate } = require("../engine/TemplateResolver");

module.exports = async (node, context) => {
  const cfg = node.config || {};
  const to = resolverTemplate(cfg.to, context);
  const subject = resolverTemplate(cfg.subject, context);
  const html = resolverTemplate(cfg.html || cfg.body || "", context);

  if (!to || !to.includes("@")) {
    throw new Error(`Destinatario invalido para envio de email: "${to}"`);
  }

  const resultado = await enviarEmail({ to, subject, html, fromName: cfg.fromName || "EcomFlow Marketing" });

  return {
    output: { enviado: true, to, subject, messageId: resultado.messageId },
    log: `Email enviado para ${to} - assunto: "${subject}"`,
  };
};