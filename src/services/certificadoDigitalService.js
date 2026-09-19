const crypto = require("crypto");
const forge = require("node-forge");

const ALGORITMO = "aes-256-gcm";
// Chave derivada do JWT_SECRET do ambiente - nao adiciona uma variavel nova
// de segredo, reaproveitando o que ja e protegido/rotacionado no .env.
function obterChave() {
  return crypto.createHash("sha256").update(process.env.JWT_SECRET).digest();
}

function criptografarSenha(senhaPlana) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMO, obterChave(), iv);
  const criptografado = Buffer.concat([cipher.update(senhaPlana, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Formato: iv (12) + tag (16) + dados criptografados
  return Buffer.concat([iv, tag, criptografado]);
}

function descriptografarSenha(buffer) {
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const dados = buffer.subarray(28);
  const decipher = crypto.createDecipheriv(ALGORITMO, obterChave(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(dados), decipher.final()]).toString("utf8");
}

// Valida o arquivo .pfx/.p12 e extrai a data de validade real do certificado -
// nao confia em nenhum dado informado manualmente pelo cliente sobre a validade.
function validarEExtrairInfo(bufferArquivo, senha) {
  try {
    const p12Asn1 = forge.asn1.fromDer(bufferArquivo.toString("binary"));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);

    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = bags[forge.pki.oids.certBag][0];
    const certificado = certBag.cert;

    return {
      valido: true,
      validade: certificado.validity.notAfter,
      titular: certificado.subject.getField("CN")?.value || null,
    };
  } catch (err) {
    return { valido: false, erro: "Arquivo invalido ou senha incorreta para este certificado." };
  }
}

module.exports = { criptografarSenha, descriptografarSenha, validarEExtrairInfo };