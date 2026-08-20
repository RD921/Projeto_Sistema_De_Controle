// src/controllers/onboardingController.js
const pool = require("../config/db");

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
        canais: row.canais ? JSON.parse(row.canais) : [],
        sistema_gestao: row.sistema_gestao,
        areas_automatizar: row.areas_automatizar ? JSON.parse(row.areas_automatizar) : [],
        tamanho_operacao: row.tamanho_operacao,
        objetivo: row.objetivo,
        modulos_selecionados: row.modulos_selecionados ? JSON.parse(row.modulos_selecionados) : [],
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

// Finaliza o onboarding: grava os módulos escolhidos e marca completed_at.
// NOTA: isso ainda não ativa/desativa funcionalidades de verdade no
// sistema (não existe ainda um sistema de módulos instaláveis no banco).
// Por enquanto, guarda a intenção do usuário para uso futuro.
exports.complete = async (req, res) => {
  try {
    const { modulos_selecionados } = req.body;

    await pool.query(
      `UPDATE company_onboarding
       SET modulos_selecionados = ?, completed_at = NOW()
       WHERE tenant_id = ?`,
      [JSON.stringify(modulos_selecionados || []), req.tenant_id]
    );

    res.json({ message: "Onboarding concluído" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao concluir onboarding", details: err.message });
  }
};