const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const crypto = require("crypto");

function gerarSegredo(emailUsuario) {
  const segredo = speakeasy.generateSecret({
    name: `EcomFlow (${emailUsuario})`,
    length: 20,
  });
  return { base32: segredo.base32, otpauthUrl: segredo.otpauth_url };
}

async function gerarQrCode(otpauthUrl) {
  return qrcode.toDataURL(otpauthUrl);
}

function verificarCodigo(segredoBase32, codigo) {
  return speakeasy.totp.verify({
    secret: segredoBase32,
    encoding: "base32",
    token: codigo,
    window: 1, // tolera 1 intervalo de 30s para antes/depois, cobrindo pequena diferenca de relogio
  });
}

// Codigos de backup: usados caso o usuario perca acesso ao app autenticador.
// Cada codigo so pode ser usado uma vez - a lista vai encolhendo conforme usados.
function gerarCodigosBackup(quantidade = 8) {
  const codigos = [];
  for (let i = 0; i < quantidade; i++) {
    codigos.push(crypto.randomBytes(4).toString("hex"));
  }
  return codigos;
}

module.exports = { gerarSegredo, gerarQrCode, verificarCodigo, gerarCodigosBackup };