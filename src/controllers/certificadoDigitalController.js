const pool = require("../config/db");
const { criptografarSenha, descriptografarSenha, validarEExtrairInfo } = require("../services/certificadoDigitalService");
const { registrar } = require("../services/auditoriaService");

// Recebe o .pfx/.p12 do cliente + a senha, valida o arquivo de verdade
// (nao so confia que e um certificado), extrai a validade real do certificado,
// criptografa a senha antes de guardar, e nunca devolve a senha depois.
exports.uploadCertificado = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado. Envie o certificado .pfx ou .p12" });
    const { senha } = req.body;
    if (!senha) return res.status(400).json({ error: "senha do certificado e obrigatoria" });

    const info = validarEExtrairInfo(req.file.buffer, senha);
    if (!info.valido) {
      return res.status(400).json({ error: info.erro });
    }

    const senhaCriptografada = criptografarSenha(senha);

    await pool.query(
      `INSERT INTO company_fiscal_data (tenant_id, certificado_arquivo, certificado_senha_criptografada, certificado_validade, certificado_status, certificado_nome_arquivo)
       VALUES (?, ?, ?, ?, 'ativo', ?)
       ON DUPLICATE KEY UPDATE
         certificado_arquivo = VALUES(certificado_arquivo),
         certificado_senha_criptografada = VALUES(certificado_senha_criptografada),
         certificado_validade = VALUES(certificado_validade),
         certificado_status = 'ativo',
         certificado_nome_arquivo = VALUES(certificado_nome_arquivo)`,
      [req.tenant_id, req.file.buffer, senhaCriptografada, info.validade, req.file.originalname]
    );

    await registrar(req.tenant_id, req.user, "upload_certificado_digital", "company_fiscal_data", null, `Certificado digital configurado (titular: ${info.titular || "não identificado"}, válido até ${info.validade.toISOString().slice(0, 10)})`);

    res.json({ message: "Certificado configurado com sucesso", validade: info.validade, titular: info.titular });
  } catch (err) {
    res.status(500).json({ error: "Erro ao processar certificado", details: err.message });
  }
};

// Retorna so metadados (nunca o arquivo nem a senha) - para a tela mostrar
// "certificado configurado, valido ate XX/XX/XXXX" sem expor nada sensivel.
exports.statusCertificado = async (req, res) => {
  try {
    const [[dados]] = await pool.query(
      "SELECT certificado_status, certificado_validade, certificado_nome_arquivo FROM company_fiscal_data WHERE tenant_id = ?",
      [req.tenant_id]
    );

    if (!dados || dados.certificado_status === "nao_configurado") {
      return res.json({ configurado: false });
    }

    const vencido = dados.certificado_validade && new Date(dados.certificado_validade) < new Date();

    res.json({
      configurado: true,
      status: vencido ? "vencido" : dados.certificado_status,
      validade: dados.certificado_validade,
      nome_arquivo: dados.certificado_nome_arquivo,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar status do certificado", details: err.message });
  }
};

exports.removerCertificado = async (req, res) => {
  try {
    await pool.query(
      `UPDATE company_fiscal_data SET certificado_arquivo = NULL, certificado_senha_criptografada = NULL,
       certificado_validade = NULL, certificado_status = 'nao_configurado', certificado_nome_arquivo = NULL
       WHERE tenant_id = ?`,
      [req.tenant_id]
    );
    await registrar(req.tenant_id, req.user, "remover_certificado_digital", "company_fiscal_data", null, "Removeu o certificado digital configurado");
    res.json({ message: "Certificado removido" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao remover certificado", details: err.message });
  }
};