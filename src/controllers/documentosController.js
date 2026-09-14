const pool = require("../config/db");
const path = require("path");
const fs = require("fs");

const PASTA_UPLOADS = path.join(__dirname, "..", "..", "uploads", "documents");

exports.listar = async (req, res) => {
  try {
    const { tipo_documento, entidade_tipo, entidade_id } = req.query;
    let sql = "SELECT id, nome_original, tipo_documento, mimetype, tamanho_bytes, entidade_tipo, entidade_id, descricao, created_at FROM financial_documents WHERE tenant_id = ?";
    const params = [req.tenant_id];
    if (tipo_documento) { sql += " AND tipo_documento = ?"; params.push(tipo_documento); }
    if (entidade_tipo) { sql += " AND entidade_tipo = ?"; params.push(entidade_tipo); }
    if (entidade_id) { sql += " AND entidade_id = ?"; params.push(entidade_id); }
    sql += " ORDER BY created_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar documentos", details: err.message });
  }
};

exports.upload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const { tipo_documento, entidade_tipo, entidade_id, descricao } = req.body;

    const [result] = await pool.query(
      `INSERT INTO financial_documents
        (tenant_id, nome_original, nome_arquivo, tipo_documento, mimetype, tamanho_bytes, entidade_tipo, entidade_id, descricao, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.tenant_id,
        req.file.originalname,
        req.file.filename,
        tipo_documento || "outro",
        req.file.mimetype,
        req.file.size,
        entidade_tipo || "nenhuma",
        entidade_id || null,
        descricao || null,
        req.user?.id || null,
      ]
    );
    res.status(201).json({ id: result.insertId, message: "Documento enviado com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar documento", details: err.message });
  }
};

exports.baixar = async (req, res) => {
  try {
    const { id } = req.params;
    const [[doc]] = await pool.query(
      "SELECT nome_original, nome_arquivo, mimetype FROM financial_documents WHERE id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );
    if (!doc) return res.status(404).json({ error: "Documento não encontrado" });

    const caminhoArquivo = path.join(PASTA_UPLOADS, String(req.tenant_id), doc.nome_arquivo);
    if (!fs.existsSync(caminhoArquivo)) return res.status(404).json({ error: "Arquivo não encontrado em disco" });

    res.setHeader("Content-Disposition", `inline; filename="${doc.nome_original}"`);
    res.setHeader("Content-Type", doc.mimetype || "application/octet-stream");
    fs.createReadStream(caminhoArquivo).pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Erro ao baixar documento", details: err.message });
  }
};

exports.excluir = async (req, res) => {
  try {
    const { id } = req.params;
    const [[doc]] = await pool.query(
      "SELECT nome_arquivo FROM financial_documents WHERE id = ? AND tenant_id = ?",
      [id, req.tenant_id]
    );
    if (!doc) return res.status(404).json({ error: "Documento não encontrado" });

    await pool.query("DELETE FROM financial_documents WHERE id = ? AND tenant_id = ?", [id, req.tenant_id]);

    const caminhoArquivo = path.join(PASTA_UPLOADS, String(req.tenant_id), doc.nome_arquivo);
    if (fs.existsSync(caminhoArquivo)) fs.unlinkSync(caminhoArquivo);

    res.json({ message: "Documento excluído" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir documento", details: err.message });
  }
};

// Vincula um documento já enviado a um lançamento financeiro (ou desvincula, se null)
exports.vincular = async (req, res) => {
  try {
    const { id } = req.params;
    const { entidade_tipo, entidade_id } = req.body;

    const tiposValidos = ["lancamento_financeiro", "lancamento_contabil", "obrigacao", "fornecedor", "nenhuma"];
    if (entidade_tipo && !tiposValidos.includes(entidade_tipo)) {
      return res.status(400).json({ error: "entidade_tipo inválido" });
    }

    const [result] = await pool.query(
      "UPDATE financial_documents SET entidade_tipo = ?, entidade_id = ? WHERE id = ? AND tenant_id = ?",
      [entidade_tipo || "nenhuma", entidade_id || null, id, req.tenant_id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Documento não encontrado" });
    res.json({ message: "Vínculo atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao vincular documento", details: err.message });
  }
};

// Lista os documentos vinculados a uma entidade específica (usado na tela do lançamento)
exports.porEntidade = async (req, res) => {
  try {
    const { tipo, id } = req.params;
    const [rows] = await pool.query(
      "SELECT id, nome_original, tipo_documento, mimetype, tamanho_bytes, descricao, created_at FROM financial_documents WHERE tenant_id = ? AND entidade_tipo = ? AND entidade_id = ?",
      [req.tenant_id, tipo, id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar documentos da entidade", details: err.message });
  }
};