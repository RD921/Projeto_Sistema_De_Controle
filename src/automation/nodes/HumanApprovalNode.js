module.exports = async (node, context) => {
  return { waiting: true, waitReason: "approval", resumeAt: null, output: context.ultimoOutput, log: "Aguardando aprovacao humana" };
};