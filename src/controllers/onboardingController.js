// src/controllers/onboardingController.js
const pool = require("../config/db");

// mysql2 já converte colunas JSON em array/objeto automaticamente —
// só fazemos JSON.parse se por algum motivo vier como string ainda.
function parseSeNecessario(valor) {
  if (valor === null || valor === undefined) return [];
  if (typeof valor === "string") {
    try { return JSON.parse(valor); } catch { return []; }
  }
  return valor;
}

// Devolve as respostas salvas (se houver) e se o onboarding já foi concluído.
exports.get = async (req, res) => {
  try {
    const [[row]] = await pool.query(
      "SELECT * FROM company_onboarding WHERE tenant_id = ?",
      [req.tenant_id]
    );
    if (!row) return res.json({ completed: false, answers: null });
    res.json({
      completed: !!row.completed_at,
      answers: {
        segmento: row.segmento,
        canais: parseSeNecessario(row.canais),
        sistema_gestao: row.sistema_gestao,
        areas_automatizar: parseSeNecessario(row.areas_automatizar),
        tamanho_operacao: row.tamanho_operacao,
        objetivo: row.objetivo,
        modulos_selecionados: parseSeNecessario(row.modulos_selecionados),
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar onboarding", details: err.message });
  }
};

// Salva/atualiza as respostas (chamado a cada etapa, sem finalizar ainda).
exports.save = async (req, res) => {
  try {
    const { segmento, canais, sistema_gestao, areas_automatizar, tamanho_operacao, objetivo } = req.body;
    await pool.query(
      `INSERT INTO company_onboarding
        (tenant_id, segmento, canais, sistema_gestao, areas_automatizar, tamanho_operacao, objetivo)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        segmento = VALUES(segmento),
        canais = VALUES(canais),
        sistema_gestao = VALUES(sistema_gestao),
        areas_automatizar = VALUES(areas_automatizar),
        tamanho_operacao = VALUES(tamanho_operacao),
        objetivo = VALUES(objetivo)`,
      [
        req.tenant_id,
        segmento || null,
        JSON.stringify(canais || []),
        sistema_gestao || null,
        JSON.stringify(areas_automatizar || []),
        tamanho_operacao || null,
        objetivo || null,
      ]
    );
    res.json({ message: "Respostas salvas" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar onboarding", details: err.message });
  }
};

// Finaliza o onboarding: grava os módulos escolhidos, marca completed_at,
// e instala de fato os módulos escolhidos em tenant_modules.
exports.complete = async (req, res) => {
  try {
    const { modulos_selecionados } = req.body;
    const modulos = modulos_selecionados || [];
    await pool.query(
      `UPDATE company_onboarding
       SET modulos_selecionados = ?, completed_at = NOW()
       WHERE tenant_id = ?`,
      [JSON.stringify(modulos), req.tenant_id]
    );
    // Instala de fato os módulos escolhidos (o SELECT ... WHERE id = ?
    // garante que só instala se o id realmente existir no catálogo,
    // evitando erro de FK caso o id não bata).
    for (const moduloId of modulos) {
      await pool.query(
        `INSERT IGNORE INTO tenant_modules (tenant_id, module_id, status)
         SELECT ?, id, 'active' FROM modules_catalog WHERE id = ?`,
        [req.tenant_id, moduloId]
      );
    }
    res.json({ message: "Onboarding concluído" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao concluir onboarding", details: err.message });
  }
};