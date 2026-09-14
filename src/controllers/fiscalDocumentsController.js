const pool = require("../config/db");

// Este modulo cria e gerencia RASCUNHOS de documentos fiscais. Ele NAO transmite
// nada para a SEFAZ - isso exige certificado digital A1/A3, que ainda nao esta
// configurado. O XML gerado aqui e estrutural/nao assinado, servindo de base
// para quando a integracao real for implementada.

const TIPOS_VALIDOS = ["nfe", "nfce", "nfse"];

exports.listar = async (req, res) => {
  try {
    const { tipo, status } = req.query;
    let sql = "SELECT fd.*, c.nome AS customer_nome FROM fiscal_documents fd LEFT JOIN customers c ON c.id = fd.customer_id WHERE fd.tenant_id = ?";
    const params = [req.tenant_id];
    if (tipo) { sql += " AND fd.tipo = ?"; params.push(tipo); }
    if (status) { sql += " AND fd.status = ?"; params.push(status); }
    sql += " ORDER BY fd.created_at DESC";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar documentos fiscais", details: err.message });
  }
};

exports.detalhar = async (req, res) => {
  try {
    const [[doc]] = await pool.query(
      "SELECT fd.*, c.nome AS customer_nome FROM fiscal_documents fd LEFT JOIN customers c ON c.id = fd.customer_id WHERE fd.id = ? AND fd.tenant_id = ?",
      [req.params.id, req.tenant_id]
    );
    if (!doc) return res.status(404).json({ error: "Documento fiscal nao encontrado" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar documento fiscal", details: err.message });
  }
};

exports.criar = async (req, res) => {
  try {
    const { tipo, customer_id, itens, natureza_operacao, municipio_codigo_ibge, observacoes } = req.body;

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: `tipo deve ser um de: ${TIPOS_VALIDOS.join(", ")}` });
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: "itens deve ser uma lista com ao menos 1 item" });
    }
    if (tipo === "nfse" && !municipio_codigo_ibge) {
      return res.status(400).json({ error: "municipio_codigo_ibge e obrigatorio para NFS-e (o layout varia por prefeitura)" });
    }

    const valorTotal = itens.reduce((acc, item) => acc + Number(item.quantidade || 1) * Number(item.valor_unitario || 0), 0);

    const [result] = await pool.query(
      `INSERT INTO fiscal_documents (tenant_id, tipo, customer_id, municipio_codigo_ibge, natureza_operacao, itens, valor_total, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.tenant_id, tipo, customer_id || null, municipio_codigo_ibge || null, natureza_operacao || "Venda de mercadoria", JSON.stringify(itens), valorTotal, observacoes || null]
    );

    res.status(201).json({ id: result.insertId, status: "rascunho", valor_total: valorTotal });
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar documento fiscal", details: err.message });
  }
};

// Gera um XML ESTRUTURAL (nao assinado, sem chave de acesso valida) - serve
// para conferencia visual do layout antes da integracao real com certificado.
exports.gerarXmlRascunho = async (req, res) => {
  try {
    const [[doc]] = await pool.query(
      "SELECT fd.*, c.nome AS customer_nome, c.email AS customer_email FROM fiscal_documents fd LEFT JOIN customers c ON c.id = fd.customer_id WHERE fd.id = ? AND fd.tenant_id = ?",
      [req.params.id, req.tenant_id]
    );
    if (!doc) return res.status(404).json({ error: "Documento fiscal nao encontrado" });
    if (doc.status !== "rascunho") return res.status(409).json({ error: "So e possivel gerar XML de rascunho para documentos em status 'rascunho'" });

    const itens = typeof doc.itens === "string" ? JSON.parse(doc.itens) : doc.itens;
    const itensXml = itens.map((item, i) => `
    <det nItem="${i + 1}">
      <prod>
        <xProd>${item.descricao || ""}</xProd>
        <qCom>${item.quantidade}</qCom>
        <vUnCom>${Number(item.valor_unitario).toFixed(2)}</vUnCom>
      </prod>
    </det>`).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- RASCUNHO NAO ASSINADO - sem validade fiscal. Gerado em ${new Date().toISOString()} -->
<${doc.tipo.toUpperCase()}>
  <ide>
    <natOp>${doc.natureza_operacao}</natOp>
    <serie>${doc.serie}</serie>
  </ide>
  <dest>
    <xNome>${doc.customer_nome || "Consumidor nao identificado"}</xNome>
  </dest>${itensXml}
  <total>
    <vNF>${Number(doc.valor_total).toFixed(2)}</vNF>
  </total>
</${doc.tipo.toUpperCase()}>`;

    await pool.query("UPDATE fiscal_documents SET xml_rascunho = ?, status = 'aguardando_certificado' WHERE id = ?", [xml, doc.id]);

    res.json({ message: "XML de rascunho gerado. Emissao real requer certificado digital configurado.", xml });
  } catch (err) {
    res.status(500).json({ error: "Erro ao gerar XML de rascunho", details: err.message });
  }
};

exports.cancelar = async (req, res) => {
  try {
    const { motivo } = req.body;
    const [[doc]] = await pool.query("SELECT status FROM fiscal_documents WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!doc) return res.status(404).json({ error: "Documento fiscal nao encontrado" });
    if (doc.status === "emitida") {
      return res.status(409).json({ error: "Cancelamento de nota ja emitida exige integracao real com a SEFAZ (nao implementada ainda)" });
    }
    await pool.query("UPDATE fiscal_documents SET status = 'cancelada', motivo_cancelamento = ? WHERE id = ?", [motivo || null, req.params.id]);
    res.json({ message: "Rascunho cancelado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao cancelar documento fiscal", details: err.message });
  }
};

exports.excluir = async (req, res) => {
  try {
    const [[doc]] = await pool.query("SELECT status FROM fiscal_documents WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!doc) return res.status(404).json({ error: "Documento fiscal nao encontrado" });
    if (doc.status === "emitida") return res.status(409).json({ error: "Nao e possivel excluir documento emitido" });
    await pool.query("DELETE FROM fiscal_documents WHERE id = ?", [req.params.id]);
    res.json({ message: "Rascunho excluido" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir documento fiscal", details: err.message });
  }
};