const { ErroValidacao } = require("./leadService");

// Resposta de erro padrão: validações voltam como 400 com a mensagem; qualquer outro
// erro é registrado no servidor e o cliente recebe uma mensagem genérica (sem vazar detalhes internos).
function responderErro(res, err, contexto = "Erro no módulo de Marketing") {
  if (err instanceof ErroValidacao) return res.status(400).json({ error: err.message });
  console.error(`[MARKETING] ${contexto}:`, err.message);
  return res.status(500).json({ error: contexto });
}

module.exports = { responderErro, ErroValidacao };
