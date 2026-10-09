// src/controllers/onboardingController.js
const pool = require("../config/db");
const onboardingIA = require("../services/onboardingIAService");

// mysql2 já converte colunas JSON em array/objeto automaticamente —
// só fazemos JSON.parse se por algum motivo vier como string ainda.
function parseSeNecessario(valor, padrao = []) {
  if (valor === null || valor === undefined) return padrao;
  if (typeof valor === "string") {
    try { return JSON.parse(valor); } catch { return padrao; }
  }
  return valor;
}

// No multipart/form-data as listas chegam como texto JSON.
function lista(valor) {
  if (Array.isArray(valor)) return valor;
  return parseSeNecessario(valor, []);
}

// Devolve as respostas salvas e o estado do onboarding.
// "pendente" = a conta foi criada e o onboarding ainda não foi concluído.
// Contas antigas (sem linha em company_onboarding) nunca ficam pendentes,
// então o onboarding só aparece para quem acabou de criar a conta.
exports.get = async (req, res) => {
  try {
    await onboardingIA.garantirEsquema();
    const [[row]] = await pool.query(
      "SELECT * FROM company_onboarding WHERE tenant_id = ?",
      [req.tenant_id]
    );
    if (!row) return res.json({ completed: false, pendente: false, answers: null });
    res.json({
      completed: !!row.completed_at,
      pendente: !row.completed_at,
      answers: {
        segmento: row.segmento,
        canais: parseSeNecessario(row.canais),
        sistema_gestao: row.sistema_gestao,
        areas_automatizar: parseSeNecessario(row.areas_automatizar),
        tamanho_operacao: row.tamanho_operacao,
        objetivo: row.objetivo,
        modulos_selecionados: parseSeNecessario(row.modulos_selecionados),
        descricao_empresa: row.descricao_empresa || "",
        documento_nome: row.documento_pdf ? row.documento_nome : null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar onboarding", details: err.message });
  }
};

// Salva/atualiza as respostas (multipart: campos + PDF opcional em "documento").
exports.save = async (req, res) => {
  try {
    await onboardingIA.garantirEsquema();
    const b = req.body || {};
    const descricao = typeof b.descricao_empresa === "string" ? b.descricao_empresa : "";

    await pool.query(
      `INSERT INTO company_onboarding
        (tenant_id, segmento, canais, sistema_gestao, areas_automatizar, tamanho_operacao, objetivo, descricao_empresa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        segmento = VALUES(segmento),
        canais = VALUES(canais),
        sistema_gestao = VALUES(sistema_gestao),
        areas_automatizar = VALUES(areas_automatizar),
        tamanho_operacao = VALUES(tamanho_operacao),
        objetivo = VALUES(objetivo),
        descricao_empresa = VALUES(descricao_empresa)`,
      [
        req.tenant_id,
        b.segmento || null,
        JSON.stringify(lista(b.canais)),
        b.sistema_gestao || null,
        JSON.stringify(lista(b.areas_automatizar)),
        b.tamanho_operacao || null,
        b.objetivo || null,
        descricao.trim() ? descricao : null,
      ]
    );

    if (req.file) {
      await pool.query(
        "UPDATE company_onboarding SET documento_pdf = ?, documento_nome = ? WHERE tenant_id = ?",
        [req.file.buffer, req.file.originalname.slice(0, 255), req.tenant_id]
      );
    } else if (b.remover_documento === "true") {
      await pool.query(
        "UPDATE company_onboarding SET documento_pdf = NULL, documento_nome = NULL WHERE tenant_id = ?",
        [req.tenant_id]
      );
    }

    res.json({ message: "Respostas salvas" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar onboarding", details: err.message });
  }
};

// A Aria lê respostas + texto + PDF e devolve o plano de configuração.
exports.analisar = async (req, res) => {
  try {
    const plano = await onboardingIA.analisar(req.tenant_id);
    res.json(plano);
  } catch (err) {
    res.status(500).json({ error: "Erro ao analisar a empresa", details: err.message });
  }
};

// Finaliza: instala os módulos escolhidos e aplica o plano (centros de custo
// e canais de venda), marcando o onboarding como concluído.
exports.complete = async (req, res) => {
  try {
    const modulos = lista(req.body?.modulos_selecionados).map(String);
    await onboardingIA.aplicar(req.tenant_id, modulos);
    res.json({ message: "Onboarding concluído" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao concluir onboarding", details: err.message });
  }
};
