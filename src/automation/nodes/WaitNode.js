module.exports = async (node, context) => {
  const cfg = node.config || {};
  let resumeAt;
  if (cfg.until) {
    resumeAt = new Date(cfg.until);
  } else {
    const amount = Number(cfg.amount) || 1;
    const unit = cfg.unit || "minutes";
    const ms = { minutes: 60000, hours: 3600000, days: 86400000 }[unit] || 60000;
    resumeAt = new Date(Date.now() + amount * ms);
  }
  return { waiting: true, waitReason: "delay", resumeAt, output: context.ultimoOutput, log: `Aguardando ate ${resumeAt.toISOString()}` };
};