const pool = require("../config/db");
const audit = require("../services/auditService");
const { toolDeclarations } = require("../services/ai/businessTools");

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
    const tenantId = req.tenant_id;

    const [[tenant]] = await pool.query(
      `SELECT t.id, t.nome, t.tipo_juridico, t.moeda, t.pais, p.nome AS plano_nome, p.preco_mensal, p.limite_usuarios, p.limite_produtos
       FROM tenants t LEFT JOIN plans p ON p.id = t.plan_id
       WHERE t.id = ?`,
      [tenantId]
    );
    const [[usuario]] = await pool.query("SELECT nome, email FROM users WHERE id = ?", [req.user.id]);
    const [[totalUsuarios]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE tenant_id = ? AND ativo = TRUE", [tenantId]);
    const [[fiscal]] = await pool.query("SELECT cnpj, razao_social FROM company_fiscal_data WHERE tenant_id = ?", [tenantId]);

    // ── Status de configuracao: cada check e um fato real verificavel no banco ──
    const checks = [
      { chave: "conta_configurada", label: "Conta configurada", ok: !!(usuario.nome && usuario.email) },
      { chave: "empresa_configurada", label: "Dados da empresa configurados", ok: !!(fiscal && fiscal.cnpj) },
      { chave: "tipo_empresa_configurado", label: "Tipo de empresa configurado", ok: tenant.tipo_juridico !== "nao_definido" },
      { chave: "usuarios_configurados", label: "Usuários configurados", ok: totalUsuarios.total > 1 },
      { chave: "sistema_configurado", label: "Sistema configurado", ok: !!tenant.moeda },
      { chave: "pagamento_configurado", label: "Pagamento/plano configurado", ok: !!tenant.plano_nome },
    ];
    const totalOk = checks.filter(c => c.ok).length;
    const percentual = Math.round((totalOk / checks.length) * 100);

    // ── Modulos instalados: reaproveita a mesma logica do moduleController.list ──
    const [catalogo] = await pool.query("SELECT id, label, nativo FROM modules_catalog ORDER BY nativo DESC, label");
    const [instalados] = await pool.query("SELECT module_id, status FROM tenant_modules WHERE tenant_id = ?", [tenantId]);
    const mapaInstalados = Object.fromEntries(instalados.map(i => [i.module_id, i.status]));
    const modulos = catalogo.map(m => ({
      id: m.id,
      label: m.label,
      instalado: m.nativo ? true : mapaInstalados[m.id] === "active",
    }));
    const totalModulosInstalados = modulos.filter(m => m.instalado).length;

    res.json({
      usuario: { nome: usuario.nome, email: usuario.email },
      empresa: {
        nome: tenant.nome,
        tipo_juridico: tenant.tipo_juridico,
        tipo_juridico_label: LABELS_TIPO_JURIDICO[tenant.tipo_juridico],
        pais: tenant.pais,
        moeda: tenant.moeda,
        cnpj: fiscal?.cnpj || null,
      },
      plano: { nome: tenant.plano_nome, preco_mensal: tenant.preco_mensal, limite_usuarios: tenant.limite_usuarios, limite_produtos: tenant.limite_produtos },
      sistema: { moeda: tenant.moeda, status: "Tudo funcionando normalmente" },
      status_configuracao: { percentual, checks },
      modulos: { total_instalados: totalModulosInstalados, total_disponiveis: modulos.length, lista: modulos },
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar configurações", details: err.message });
  }
};

exports.sistemaInfo = async (req, res) => {
  try {
    const [[dbCheck]] = await pool.query("SELECT 1 AS ok");
    res.json({
      node_version: process.version,
      uptime_segundos: Math.floor(process.uptime()),
      ambiente: process.env.NODE_ENV || "development",
      banco_conectado: !!dbCheck,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar informacoes do sistema", details: err.message });
  }
};

// ── Atividade Recente / Auditoria ──
exports.atividadeRecente = async (req, res) => {
  try {
    const limite = Number(req.query.limite) || 10;
    const [rows] = await pool.query(
      "SELECT id, usuario_nome, acao, origem, valor_anterior, valor_novo, created_at FROM audit_log WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?",
      [req.tenant_id, limite]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar atividade recente", details: err.message });
  }
};

// ── Conta ──
exports.atualizarConta = async (req, res) => {
  try {
    const { nome, email } = req.body;
    if (!nome || !email) return res.status(400).json({ error: "nome e email sao obrigatorios" });

    const [[existente]] = await pool.query("SELECT id FROM users WHERE email = ? AND id != ?", [email, req.user.id]);
    if (existente) return res.status(409).json({ error: "Este e-mail ja esta em uso por outro usuario" });

    const [[antigo]] = await pool.query("SELECT nome, email FROM users WHERE id = ?", [req.user.id]);
    await pool.query("UPDATE users SET nome = ?, email = ? WHERE id = ?", [nome, email, req.user.id]);

    await audit.registrar({
      tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: nome,
      acao: "Atualizou dados da conta", origem: "Central de Configurações",
      valorAnterior: `${antigo.nome} / ${antigo.email}`, valorNovo: `${nome} / ${email}`,
    });

    res.json({ message: "Conta atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar conta", details: err.message });
  }
};

exports.alterarSenha = async (req, res) => {
  try {
    const bcrypt = require("bcryptjs");
    const { senha_atual, senha_nova } = req.body;
    if (!senha_atual || !senha_nova) return res.status(400).json({ error: "senha_atual e senha_nova sao obrigatorias" });
    if (senha_nova.length < 8) return res.status(400).json({ error: "A nova senha deve ter ao menos 8 caracteres" });

    const [[user]] = await pool.query("SELECT senha, nome FROM users WHERE id = ?", [req.user.id]);
    const confere = await bcrypt.compare(senha_atual, user.senha);
    if (!confere) return res.status(401).json({ error: "Senha atual incorreta" });

    const hash = await bcrypt.hash(senha_nova, 10);
    await pool.query("UPDATE users SET senha = ? WHERE id = ?", [hash, req.user.id]);

    await audit.registrar({
      tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: user.nome,
      acao: "Alterou a senha", origem: "Central de Configurações",
    });

    res.json({ message: "Senha alterada com sucesso" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao alterar senha", details: err.message });
  }
};

// ── Tipo de Empresa ──
exports.atualizarTipoJuridico = async (req, res) => {
  try {
    const { tipo_juridico } = req.body;
    const validos = ["mei", "me", "epp", "ltda", "outros"];
    if (!validos.includes(tipo_juridico)) return res.status(400).json({ error: `tipo_juridico deve ser um de: ${validos.join(", ")}` });

    const [[antigo]] = await pool.query("SELECT tipo_juridico, nome FROM tenants t WHERE t.id = ?", [req.tenant_id]);
    const [[usuario]] = await pool.query("SELECT nome FROM users WHERE id = ?", [req.user.id]);
    await pool.query("UPDATE tenants SET tipo_juridico = ? WHERE id = ?", [tipo_juridico, req.tenant_id]);

    await audit.registrar({
      tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: usuario.nome,
      acao: "Atualizou o tipo de empresa", origem: "Tipo de Empresa",
      valorAnterior: LABELS_TIPO_JURIDICO[antigo.tipo_juridico], valorNovo: LABELS_TIPO_JURIDICO[tipo_juridico],
    });

    res.json({ message: "Tipo de empresa atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar tipo de empresa", details: err.message });
  }
};

// ── Sistema ──
exports.atualizarSistema = async (req, res) => {
  try {
    const { moeda } = req.body;
    const validas = ["BRL", "USD", "EUR"];
    if (!validas.includes(moeda)) return res.status(400).json({ error: `moeda deve ser uma de: ${validas.join(", ")}` });

    const [[antigo]] = await pool.query("SELECT moeda FROM tenants WHERE id = ?", [req.tenant_id]);
    const [[usuario]] = await pool.query("SELECT nome FROM users WHERE id = ?", [req.user.id]);
    await pool.query("UPDATE tenants SET moeda = ? WHERE id = ?", [moeda, req.tenant_id]);

    await audit.registrar({
      tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: usuario.nome,
      acao: "Alterou a moeda do sistema", origem: "Sistema",
      valorAnterior: antigo.moeda, valorNovo: moeda,
    });

    res.json({ message: "Configuracao do sistema atualizada" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar sistema", details: err.message });
  }
};

// ── Usuarios e Permissoes ──
exports.listarUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nome, email, role, ativo, created_at FROM users WHERE tenant_id = ? ORDER BY created_at ASC",
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar usuarios", details: err.message });
  }
};

exports.mudarRoleUsuario = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["admin", "user"].includes(role)) return res.status(400).json({ error: "role deve ser 'admin' ou 'user'" });
    if (Number(req.params.id) === req.user.id) return res.status(409).json({ error: "Voce nao pode alterar a propria role" });

    const [[alvo]] = await pool.query("SELECT id, nome, role FROM users WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!alvo) return res.status(404).json({ error: "Usuario nao encontrado" });

    const [[usuario]] = await pool.query("SELECT nome FROM users WHERE id = ?", [req.user.id]);
    await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id]);

    await audit.registrar({
      tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: usuario.nome,
      acao: `Alterou o papel de ${alvo.nome}`, origem: "Usuários e Permissões",
      valorAnterior: alvo.role, valorNovo: role,
    });

    res.json({ message: "Papel do usuario atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao mudar role", details: err.message });
  }
};

exports.alternarAtivoUsuario = async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id) return res.status(409).json({ error: "Voce nao pode desativar a propria conta" });

    const [[alvo]] = await pool.query("SELECT ativo, nome FROM users WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!alvo) return res.status(404).json({ error: "Usuario nao encontrado" });

    const [[usuario]] = await pool.query("SELECT nome FROM users WHERE id = ?", [req.user.id]);
    await pool.query("UPDATE users SET ativo = ? WHERE id = ?", [!alvo.ativo, req.params.id]);

    await audit.registrar({
      tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: usuario.nome,
      acao: alvo.ativo ? `Desativou ${alvo.nome}` : `Reativou ${alvo.nome}`, origem: "Usuários e Permissões",
    });

    res.json({ message: alvo.ativo ? "Usuario desativado" : "Usuario reativado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao alternar status do usuario", details: err.message });
  }
};

// ── Configuracao da IA ──
// Importante: a Aria hoje SO CONSULTA dados (nenhuma ferramenta de execucao existe).
// Por isso o nivel de autonomia e fixo em "somente_analise" - nao inventamos
// niveis 2/3/4 que nao teriam efeito real nenhum no comportamento da IA.
exports.iaOverview = async (req, res) => {
  try {
    const tenantId = req.tenant_id;

    let [[config]] = await pool.query("SELECT * FROM ai_settings WHERE tenant_id = ?", [tenantId]);
    if (!config) {
      await pool.query("INSERT INTO ai_settings (tenant_id) VALUES (?)", [tenantId]);
      [[config]] = await pool.query("SELECT * FROM ai_settings WHERE tenant_id = ?", [tenantId]);
    }

    // Permissoes de consulta = as ferramentas reais que a Aria possui (businessTools.js).
    // Isso nunca fica desatualizado, porque le direto da fonte, nao de uma lista fixa.
    const permissoesConsulta = toolDeclarations.map(t => ({ nome: t.name, descricao: t.description }));

    const [catalogo] = await pool.query("SELECT id, label, nativo FROM modules_catalog ORDER BY nativo DESC, label");
    const [instalados] = await pool.query("SELECT module_id, status FROM tenant_modules WHERE tenant_id = ?", [tenantId]);
    const mapaInstalados = Object.fromEntries(instalados.map(i => [i.module_id, i.status]));
    const modulos = catalogo.map(m => ({ id: m.id, label: m.label, instalado: m.nativo ? true : mapaInstalados[m.id] === "active" }));

    res.json({
      status: "ativa",
      nivel_autonomia: "somente_analise",
      comportamento: { nivel_detalhamento: config.nivel_detalhamento, forma_comunicacao: config.forma_comunicacao },
      permissoes_consulta: permissoesConsulta,
      total_ferramentas: permissoesConsulta.length,
      modulos,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar configuracao da IA", details: err.message });
  }
};

exports.atualizarIaComportamento = async (req, res) => {
  try {
    const { nivel_detalhamento, forma_comunicacao } = req.body;
    const niveisValidos = ["objetivo", "equilibrado", "detalhado", "executivo"];
    const formasValidas = ["direta", "executiva", "tecnica", "explicativa"];
    if (!niveisValidos.includes(nivel_detalhamento) || !formasValidas.includes(forma_comunicacao)) {
      return res.status(400).json({ error: "Valores invalidos para nivel_detalhamento ou forma_comunicacao" });
    }

    await pool.query(
      `INSERT INTO ai_settings (tenant_id, nivel_detalhamento, forma_comunicacao) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE nivel_detalhamento = ?, forma_comunicacao = ?`,
      [req.tenant_id, nivel_detalhamento, forma_comunicacao, nivel_detalhamento, forma_comunicacao]
    );

    const [[usuario]] = await pool.query("SELECT nome FROM users WHERE id = ?", [req.user.id]);
    await audit.registrar({
      tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: usuario.nome,
      acao: "Atualizou o comportamento da IA", origem: "Configuração da IA",
      valorNovo: `${nivel_detalhamento} / ${forma_comunicacao}`,
    });

    res.json({ message: "Comportamento da IA atualizado" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar comportamento da IA", details: err.message });
  }
};

// ── Checklist inteligente da Visao Geral (v2) ──
// Cada item aqui e verificavel no banco - nada de numero fixo.
exports.checklist = async (req, res) => {
  try {
    const tenantId = req.tenant_id;

    const [[tenant]] = await pool.query("SELECT nome, tipo_juridico, moeda, pais, plan_id FROM tenants WHERE id = ?", [tenantId]);
    const [[fiscal]] = await pool.query("SELECT cnpj FROM company_fiscal_data WHERE tenant_id = ?", [tenantId]);
    const [[usuario]] = await pool.query("SELECT nome, email FROM users WHERE id = ?", [req.user.id]);
    const [[iaConfig]] = await pool.query("SELECT nivel_detalhamento, forma_comunicacao FROM ai_settings WHERE tenant_id = ?", [tenantId]);

    const iaPersonalizada = iaConfig && (iaConfig.nivel_detalhamento !== "equilibrado" || iaConfig.forma_comunicacao !== "direta");

    // Itens que realmente influenciam o percentual (todos verificaveis com dado real)
    const itens = [
      {
        chave: "perfil_empresa", label: "Perfil da empresa", prioridade: "alta",
        status: fiscal?.cnpj ? "concluido" : "pendente",
        recomendacao: "Complete os dados cadastrais da empresa (CNPJ, razão social, endereço).",
        link: "/configuracoes/tipo-empresa",
      },
      {
        chave: "tipo_empresa", label: "Tipo de empresa", prioridade: "media",
        status: tenant.tipo_juridico !== "nao_definido" ? "concluido" : "pendente",
        recomendacao: "Defina o tipo jurídico da sua empresa (MEI, ME, EPP, LTDA, etc).",
        link: "/configuracoes/tipo-empresa",
      },
      {
        chave: "conta", label: "Conta", prioridade: "alta",
        status: (usuario.nome && usuario.email) ? "concluido" : "pendente",
        recomendacao: "Complete seus dados de conta.",
        link: "/configuracoes/conta",
      },
      {
        chave: "sistema", label: "Sistema", prioridade: "baixa",
        status: tenant.moeda ? "concluido" : "pendente",
        recomendacao: "Defina a moeda e preferências do sistema.",
        link: "/configuracoes/sistema",
      },
      {
        chave: "pagamento", label: "Pagamentos", prioridade: "media",
        status: tenant.plan_id ? "concluido" : "pendente",
        recomendacao: "Revise o plano contratado.",
        link: "/configuracoes/pagamento",
      },
      {
        chave: "ia", label: "Inteligência Artificial", prioridade: "media",
        status: iaPersonalizada ? "concluido" : "recomendado",
        recomendacao: "A Aria está ativa, mas ainda utiliza as preferências padrão de comportamento.",
        link: "/configuracoes/ia",
      },
    ];

    const concluidos = itens.filter(i => i.status === "concluido").length;
    const pendentes = itens.filter(i => i.status === "pendente").length;
    const emAndamento = itens.filter(i => i.status === "recomendado").length;
    const percentual = Math.round((concluidos / itens.length) * 100);

    // Segurança: nao existe nenhuma configuracao real implementada ainda (sem 2FA,
    // sem sessoes, etc.) - por isso NAO entra no percentual, so aparece como contexto
    // honesto de que a area ainda esta em desenvolvimento.
    const contextoSeguranca = {
      chave: "seguranca", label: "Segurança", prioridade: "baixa",
      status: "indisponivel",
      recomendacao: "A área de segurança avançada (autenticação adicional, sessões) ainda está em desenvolvimento.",
      link: "/configuracoes/backup",
    };

    // Ordena pendencias por prioridade para achar o proximo passo
    const ordemPrioridade = { alta: 0, media: 1, baixa: 2 };
    const pendenciasReais = itens.filter(i => i.status !== "concluido").sort((a, b) => ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade]);
    const proximoPasso = pendenciasReais[0] || null;

    const [atividade] = await pool.query(
      "SELECT acao, origem, created_at FROM audit_log WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 4",
      [tenantId]
    );

    res.json({
      percentual,
      resumo: { concluidos, pendentes, em_andamento: emAndamento, total: itens.length },
      checklist: [...itens, contextoSeguranca],
      proximo_passo: proximoPasso,
      empresa_contexto: { nome: tenant.nome, tipo_juridico: tenant.tipo_juridico, pais: tenant.pais, moeda: tenant.moeda },
      atividade_recente: atividade,
    });
  } catch (err) {
    res.status(500).json({ error: "Erro ao carregar checklist de configuração", details: err.message });
  }
};

  // ── Base de Permissoes (alem de admin/user) ──
// Admin continua tendo acesso total (comportamento atual preservado).
// 'user' pode receber permissoes extras especificas. Nenhuma rota existente
// checa essas permissoes ainda - essa e a base de dados + gestao, pronta para
// rotas especificas passarem a usar no futuro.
exports.listarPermissoes = async (req, res) => {
  try {
    const [permissoes] = await pool.query("SELECT * FROM permissions ORDER BY modulo, chave");
    res.json(permissoes);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar permissoes", details: err.message });
  }
};

exports.permissoesDoUsuario = async (req, res) => {
  try {
    const [[alvo]] = await pool.query("SELECT id, nome, role FROM users WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!alvo) return res.status(404).json({ error: "Usuario nao encontrado" });

    const [concedidas] = await pool.query(
      "SELECT p.id, p.chave, p.label, p.modulo FROM user_permissions up JOIN permissions p ON p.id = up.permission_id WHERE up.user_id = ?",
      [req.params.id]
    );

    res.json({ usuario: alvo, permissoes_concedidas: concedidas, acesso_total: alvo.role === "admin" });
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar permissoes do usuario", details: err.message });
  }
};

exports.atualizarPermissoesUsuario = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { permission_ids } = req.body;
    if (!Array.isArray(permission_ids)) return res.status(400).json({ error: "permission_ids deve ser uma lista" });

    const [[alvo]] = await conn.query("SELECT id, role FROM users WHERE id = ? AND tenant_id = ?", [req.params.id, req.tenant_id]);
    if (!alvo) { conn.release(); return res.status(404).json({ error: "Usuario nao encontrado" }); }
    if (alvo.role === "admin") { conn.release(); return res.status(409).json({ error: "Administradores ja possuem acesso total; nao e necessario conceder permissoes especificas" }); }

    await conn.beginTransaction();
    await conn.query("DELETE FROM user_permissions WHERE user_id = ?", [req.params.id]);
    for (const permId of permission_ids) {
      await conn.query("INSERT INTO user_permissions (user_id, permission_id, concedido_por) VALUES (?, ?, ?)", [req.params.id, permId, req.user.id]);
    }
    await conn.commit();
    conn.release();

    const [[usuario]] = await pool.query("SELECT nome FROM users WHERE id = ?", [req.user.id]);
    const [[alvoNome]] = await pool.query("SELECT nome FROM users WHERE id = ?", [req.params.id]);
    await audit.registrar({
      tenantId: req.tenant_id, usuarioId: req.user.id, usuarioNome: usuario.nome,
      acao: `Atualizou permissões de ${alvoNome.nome}`, origem: "Usuários e Permissões",
      valorNovo: `${permission_ids.length} permissão(ões) concedida(s)`,
    });

    res.json({ message: "Permissoes atualizadas" });
  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ error: "Erro ao atualizar permissoes", details: err.message });
  }
};