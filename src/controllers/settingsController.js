const pool = require("../config/db");

const LABELS_TIPO_JURIDICO = {
  mei: "MEI — Microempreendedor Individual",
  me: "ME — Microempresa",
  epp: "EPP — Empresa de Pequeno Porte",
  ltda: "LTDA — Sociedade Limitada",
  outros: "Outros",
  nao_definido: "Não definido",
};

exports.overview = async (req, res) => {
  try {
    const [[tenant]] = await pool.query(
      `SELECT t.id, t.nome, t.tipo_juridico, t.moeda, p.nome AS plano_nome, p.preco_mensal, p.limite_usuarios, p.limite_produtos
       FROM tenants t LEFT JOIN plans p ON p.id = t.plan_id
       WHERE t.id = ?`,
      [req.tenant_id]
    );

    const [[totalUsuarios]] = await pool.query(
      "SELECT COUNT(*) AS total FROM users WHERE tenant_id = ? AND ativo = TRUE",
      [req.tenant_id]
    );

    res.json({
      empresa: { nome: tenant.nome, tipo_juridico: tenant.tipo_juridico, tipo_juridico_label: LABELS_TIPO_JURIDICO[tenant.tipo_juridico] },
      plano: { nome: tenant.plano_nome, preco_mensal: tenant.preco_mensal, limite_usuarios: tenant.limite_usuarios, limite_produtos: tenant.limite_produtos, status: "ativo" },
      sistema: { moeda: tenant.moeda, status: "Tudo funcionando normalmente" },
      total_usuarios: totalUsuarios.total,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar configurações", details: err.message });
  }
};