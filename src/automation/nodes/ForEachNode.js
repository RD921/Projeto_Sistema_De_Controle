// A execucao real do for_each acontece dentro do AutomationEngine (precisa
// de acesso a nodes/edges/executionId, que um handler comum nao recebe).
// Este arquivo existe so para o node aparecer registrado no NodeRegistry.
module.exports = async (node, context) => {
  throw new Error("for_each nao deve ser executado como node comum - erro interno do engine");
};