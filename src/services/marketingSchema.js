// Estrutura de banco da Central de Marketing.
// O servidor cria o que faltar sozinho na primeira chamada de /api/marketing
// (mesma ideia do onboarding), então não depende de rodar migration à mão.
// Tudo aqui é idempotente: pode rodar quantas vezes quiser sem estragar nada.
const pool = require("../config/db");

const TABELAS = [
  `CREATE TABLE IF NOT EXISTS marketing_tenant_setup (
    tenant_id INT PRIMARY KEY,
    scoring_seed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS marketing_funnels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    descricao VARCHAR(255) NULL,
    padrao BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id)
  )`,
  `CREATE TABLE IF NOT EXISTS marketing_funnel_stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    funnel_id INT NOT NULL,
    tenant_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    ordem INT NOT NULL DEFAULT 0,
    tipo ENUM('etapa','ganho','perdido') NOT NULL DEFAULT 'etapa',
    status_lead VARCHAR(20) NULL,
    FOREIGN KEY (funnel_id) REFERENCES marketing_funnels(id) ON DELETE CASCADE,
    INDEX idx_funnel (funnel_id)
  )`,
  `CREATE TABLE IF NOT EXISTS marketing_lead_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    lead_id INT NOT NULL,
    tipo VARCHAR(40) NOT NULL,
    descricao VARCHAR(500) NULL,
    dados JSON NULL,
    user_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES marketing_leads(id) ON DELETE CASCADE,
    INDEX idx_lead (lead_id),
    INDEX idx_tenant_tipo (tenant_id, tipo, created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS marketing_tracking_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    slug VARCHAR(40) NOT NULL UNIQUE,
    destino VARCHAR(1000) NOT NULL,
    utm_source VARCHAR(100) NULL,
    utm_medium VARCHAR(100) NULL,
    utm_campaign VARCHAR(150) NULL,
    utm_content VARCHAR(150) NULL,
    utm_term VARCHAR(150) NULL,
    campaign_id INT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id)
  )`,
  `CREATE TABLE IF NOT EXISTS marketing_link_clicks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    link_id INT NOT NULL,
    tenant_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (link_id) REFERENCES marketing_tracking_links(id) ON DELETE CASCADE,
    INDEX idx_link (link_id, created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS marketing_spend (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    campaign_id INT NULL,
    data DATE NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    canal VARCHAR(100) NULL,
    observacao VARCHAR(255) NULL,
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_data (tenant_id, data),
    INDEX idx_campaign (campaign_id)
  )`,
  `CREATE TABLE IF NOT EXISTS marketing_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    tipo VARCHAR(40) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NULL,
    motivo TEXT NULL,
    impacto ENUM('baixo','medio','alto') NOT NULL DEFAULT 'medio',
    esforco ENUM('baixo','medio','alto') NOT NULL DEFAULT 'medio',
    confianca INT NOT NULL DEFAULT 50,
    custo_estimado DECIMAL(12,2) NULL,
    prioridade INT NOT NULL DEFAULT 0,
    dados JSON NULL,
    tarefas JSON NULL,
    status ENUM('pendente','aceita','descartada') NOT NULL DEFAULT 'pendente',
    chave VARCHAR(120) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE KEY uq_tenant_chave (tenant_id, chave),
    INDEX idx_tenant_status (tenant_id, status)
  )`,
  `CREATE TABLE IF NOT EXISTS marketing_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NULL,
    prioridade ENUM('baixa','media','alta') NOT NULL DEFAULT 'media',
    status ENUM('aguardando_aprovacao','aberta','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'aberta',
    prazo DATE NULL,
    responsavel_id INT NULL,
    lead_id INT NULL,
    customer_id INT NULL,
    campaign_id INT NULL,
    recomendacao_id INT NULL,
    estrategia_id INT NULL,
    origem ENUM('manual','aria','recuperacao') NOT NULL DEFAULT 'manual',
    requer_aprovacao BOOLEAN NOT NULL DEFAULT FALSE,
    aprovada_em DATETIME NULL,
    concluida_em DATETIME NULL,
    chave VARCHAR(120) NULL,
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant_status (tenant_id, status),
    INDEX idx_chave (tenant_id, chave)
  )`,
  `CREATE TABLE IF NOT EXISTS marketing_recovery_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    tipo ENUM('lead_sem_contato','negociacao_parada','proposta_parada','cliente_inativo','recompra','pedido_pendente') NOT NULL,
    dias INT NOT NULL,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    criar_tarefa BOOLEAN NOT NULL DEFAULT TRUE,
    disparar_automacao BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE KEY uq_tenant_tipo (tenant_id, tipo)
  )`,
  `CREATE TABLE IF NOT EXISTS marketing_strategies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    pedido TEXT NOT NULL,
    origem ENUM('ia','regras') NOT NULL DEFAULT 'regras',
    dados_suficientes BOOLEAN NOT NULL DEFAULT FALSE,
    plano JSON NOT NULL,
    status ENUM('rascunho','aplicada','descartada') NOT NULL DEFAULT 'rascunho',
    created_by INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    INDEX idx_tenant (tenant_id, created_at)
  )`,
];

// [tabela, coluna, definição]
const COLUNAS = [
  ["marketing_leads", "utm_source", "VARCHAR(150) NULL"],
  ["marketing_leads", "utm_medium", "VARCHAR(150) NULL"],
  ["marketing_leads", "utm_campaign", "VARCHAR(150) NULL"],
  ["marketing_leads", "utm_content", "VARCHAR(150) NULL"],
  ["marketing_leads", "utm_term", "VARCHAR(150) NULL"],
  ["marketing_leads", "campaign_id", "INT NULL"],
  ["marketing_leads", "funnel_stage_id", "INT NULL"],
  ["marketing_leads", "funnel_max_ordem", "INT NULL"],
  ["marketing_leads", "tracking_link_id", "INT NULL"],
  ["marketing_leads", "deal_id", "INT NULL"],
  ["marketing_leads", "interesse", "VARCHAR(255) NULL"],
  ["marketing_leads", "valor_estimado", "DECIMAL(12,2) NULL"],
  ["marketing_leads", "proxima_acao", "VARCHAR(255) NULL"],
  ["marketing_leads", "motivo_perda", "VARCHAR(255) NULL"],
  ["marketing_leads", "consentimento", "TINYINT NULL"],
  ["marketing_leads", "ultimo_contato_em", "DATETIME NULL"],
  ["marketing_leads", "convertido_em", "DATETIME NULL"],
  ["marketing_leads", "telefone_normalizado", "VARCHAR(20) NULL"],
  ["marketing_campaigns", "canal", "VARCHAR(100) NULL"],
  ["marketing_campaigns", "etapa_funil", "VARCHAR(20) NULL"],
  ["marketing_campaigns", "meta_leads", "INT NULL"],
  ["marketing_campaigns", "meta_clientes", "INT NULL"],
  ["marketing_campaigns", "meta_receita", "DECIMAL(12,2) NULL"],
  ["marketing_campaigns", "responsavel_id", "INT NULL"],
  ["marketing_campaigns", "conteudo", "TEXT NULL"],
  ["marketing_campaigns", "criativos", "TEXT NULL"],
  ["marketing_scoring_rules", "tipo", "VARCHAR(10) NOT NULL DEFAULT 'evento'"],
  ["marketing_scoring_rules", "campo", "VARCHAR(40) NULL"],
  ["marketing_scoring_rules", "operador", "VARCHAR(20) NULL"],
  ["marketing_scoring_rules", "valor", "VARCHAR(150) NULL"],
  ["marketing_segments", "base", "VARCHAR(10) NOT NULL DEFAULT 'leads'"],
];

const INDICES = [
  ["marketing_leads", "idx_mkt_leads_email", "(tenant_id, email)"],
  ["marketing_leads", "idx_mkt_leads_campaign", "(campaign_id)"],
  ["marketing_leads", "idx_mkt_leads_tel", "(tenant_id, telefone_normalizado)"],
  ["marketing_leads", "idx_mkt_leads_created", "(tenant_id, created_at)"],
];

const EVENT_TYPES = [
  ["lead_enviado_crm", "Lead enviado ao CRM", "Disparado quando um lead de marketing vira oportunidade no CRM"],
  ["marketing_oportunidade_recuperacao", "Oportunidade de recuperação", "Disparado quando uma regra de recuperação encontra uma oportunidade (lead parado, cliente inativo etc.)"],
  ["marketing_tarefa_criada", "Tarefa de marketing criada", "Disparado quando uma tarefa de marketing é criada"],
];

const ETAPAS_PADRAO = [
  ["Novo", "etapa", "novo"],
  ["Contactado", "etapa", "contactado"],
  ["Engajado", "etapa", "engajado"],
  ["Qualificado", "etapa", "qualificado"],
  ["Oportunidade", "etapa", "oportunidade"],
  ["Cliente", "ganho", "cliente"],
  ["Perdido", "perdido", "perdido"],
];

let pronto = null;

async function colunaExiste(tabela, coluna) {
  const [[r]] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`, [tabela, coluna]);
  return r.n > 0;
}

async function indiceExiste(tabela, indice) {
  const [[r]] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`, [tabela, indice]);
  return r.n > 0;
}

async function aplicar() {
  for (const sql of TABELAS) await pool.query(sql);
  for (const [tabela, coluna, def] of COLUNAS) {
    if (!(await colunaExiste(tabela, coluna))) {
      await pool.query(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${def}`);
      if (tabela === "marketing_leads" && coluna === "convertido_em") {
        await pool.query("UPDATE marketing_leads SET convertido_em = updated_at WHERE status = 'cliente' AND convertido_em IS NULL");
      }
    }
  }
  for (const [tabela, indice, cols] of INDICES) {
    if (!(await indiceExiste(tabela, indice))) await pool.query(`CREATE INDEX ${indice} ON ${tabela} ${cols}`);
  }
  for (const [code, label, description] of EVENT_TYPES) {
    try {
      await pool.query(
        "INSERT IGNORE INTO event_types (code, label, category, description, module) VALUES (?, ?, 'marketing', ?, 'marketing')",
        [code, label, description]);
    } catch { /* event_types pode não existir em bancos muito antigos */ }
  }
}

// Garante a estrutura uma única vez por processo.
function garantirEsquema() {
  if (!pronto) {
    pronto = aplicar().catch(err => { pronto = null; throw err; });
  }
  return pronto;
}

// Cria o funil padrão (espelha os status dos leads) e liga os leads antigos a ele.
async function garantirFunilPadrao(tenantId) {
  const [[existente]] = await pool.query(
    "SELECT id FROM marketing_funnels WHERE tenant_id = ? AND padrao = TRUE LIMIT 1", [tenantId]);
  let funnelId = existente?.id;
  if (!funnelId) {
    const [r] = await pool.query(
      "INSERT INTO marketing_funnels (tenant_id, nome, descricao, padrao) VALUES (?, 'Funil de vendas', 'Do primeiro contato até virar cliente', TRUE)",
      [tenantId]);
    funnelId = r.insertId;
    let ordem = 1;
    for (const [nome, tipo, status] of ETAPAS_PADRAO) {
      await pool.query(
        "INSERT INTO marketing_funnel_stages (funnel_id, tenant_id, nome, ordem, tipo, status_lead) VALUES (?, ?, ?, ?, ?, ?)",
        [funnelId, tenantId, nome, ordem++, tipo, status]);
    }
  }
  await pool.query(
    `UPDATE marketing_leads l
     JOIN marketing_funnel_stages s ON s.funnel_id = ? AND s.status_lead = l.status
     SET l.funnel_stage_id = s.id
     WHERE l.tenant_id = ? AND l.funnel_stage_id IS NULL`, [funnelId, tenantId]);
  // Leads antigos: o ponto mais avançado conhecido é a etapa atual (perdidos ficam sem valor)
  await pool.query(
    `UPDATE marketing_leads l
     JOIN marketing_funnel_stages s ON s.id = l.funnel_stage_id AND s.tipo <> 'perdido'
     SET l.funnel_max_ordem = s.ordem
     WHERE l.tenant_id = ? AND l.funnel_max_ordem IS NULL`, [tenantId]);
  return funnelId;
}

const REGRAS_RECUPERACAO_PADRAO = [
  ["lead_sem_contato", 3],
  ["negociacao_parada", 7],
  ["proposta_parada", 5],
  ["cliente_inativo", 90],
  ["recompra", 0],
  ["pedido_pendente", 2],
];

async function garantirRegrasRecuperacao(tenantId) {
  for (const [tipo, dias] of REGRAS_RECUPERACAO_PADRAO) {
    await pool.query(
      "INSERT IGNORE INTO marketing_recovery_rules (tenant_id, tipo, dias) VALUES (?, ?, ?)", [tenantId, tipo, dias]);
  }
}

// Regras de pontuação iniciais. Todas editáveis/removíveis na tela de Lead Scoring.
// Eventos: [event_type, pontos, descrição]
const REGRAS_SCORE_EVENTO = [
  ["lead_created", 10, "Lead entrou no sistema"],
  ["reentrada", 10, "Voltou a se cadastrar (sinal de interesse)"],
  ["lead_contactado", 10, "Primeiro contato realizado"],
  ["lead_engajado", 15, "Lead respondeu ou interagiu"],
  ["lead_qualificado", 30, "Lead marcado como qualificado"],
  ["lead_oportunidade", 20, "Lead virou oportunidade"],
  ["lead_perdido", -40, "Lead marcado como perdido"],
  ["lead_inativo", -20, "Lead marcado como inativo"],
  ["interacao_resposta", 20, "Lead respondeu uma mensagem"],
  ["interacao_reuniao", 25, "Reunião ou demonstração realizada"],
  ["interacao_proposta", 15, "Proposta enviada"],
  ["clique_link", 5, "Clicou em um link da campanha"],
  ["visita_pagina", 5, "Visitou uma página"],
];
// Atributos: [campo, operador, valor, pontos, descrição]
const REGRAS_SCORE_ATRIBUTO = [
  ["telefone", "preenchido", null, 10, "Informou telefone"],
  ["empresa", "preenchido", null, 5, "Informou a empresa"],
  ["interesse", "preenchido", null, 10, "Declarou interesse em algo específico"],
  ["origem", "igual", "indicacao", 15, "Veio por indicação"],
  ["valor_estimado", "maior_igual", "1000", 15, "Negócio estimado em R$ 1.000 ou mais"],
];

async function garantirRegrasScore(tenantId) {
  const [[setup]] = await pool.query("SELECT scoring_seed FROM marketing_tenant_setup WHERE tenant_id = ?", [tenantId]);
  if (setup?.scoring_seed) return;
  const [existentes] = await pool.query(
    "SELECT event_type FROM marketing_scoring_rules WHERE tenant_id = ? AND tipo = 'evento'", [tenantId]);
  const jaTem = new Set(existentes.map(r => r.event_type));
  for (const [ev, pontos, desc] of REGRAS_SCORE_EVENTO) {
    if (jaTem.has(ev)) continue;
    await pool.query(
      "INSERT INTO marketing_scoring_rules (tenant_id, event_type, tipo, pontos, descricao) VALUES (?, ?, 'evento', ?, ?)",
      [tenantId, ev, pontos, desc]);
  }
  for (const [campo, operador, valor, pontos, desc] of REGRAS_SCORE_ATRIBUTO) {
    await pool.query(
      "INSERT INTO marketing_scoring_rules (tenant_id, event_type, tipo, campo, operador, valor, pontos, descricao) VALUES (?, 'atributo', 'atributo', ?, ?, ?, ?, ?)",
      [tenantId, campo, operador, valor, pontos, desc]);
  }
  await pool.query("UPDATE marketing_tenant_setup SET scoring_seed = TRUE WHERE tenant_id = ?", [tenantId]);
}

// Prepara tudo que a empresa precisa para usar o módulo (uma vez por processo).
const tenantsProntos = new Map();
function prepararTenant(tenantId) {
  if (!tenantId) return Promise.resolve();
  if (!tenantsProntos.has(tenantId)) {
    const p = (async () => {
      await garantirEsquema();
      await pool.query("INSERT IGNORE INTO marketing_tenant_setup (tenant_id) VALUES (?)", [tenantId]);
      await garantirFunilPadrao(tenantId);
      await garantirRegrasRecuperacao(tenantId);
      await garantirRegrasScore(tenantId);
    })().catch(err => { tenantsProntos.delete(tenantId); throw err; });
    tenantsProntos.set(tenantId, p);
  }
  return tenantsProntos.get(tenantId);
}

// Middleware: garante a estrutura do banco antes de qualquer rota de marketing
// (inclusive as públicas). Os dados base de cada empresa são criados sob demanda
// pelos serviços, via prepararTenant().
async function middleware(req, res, next) {
  try {
    await garantirEsquema();
    next();
  } catch (err) {
    console.error("[MARKETING] Erro ao preparar estrutura:", err.message);
    res.status(500).json({ error: "Erro ao preparar o módulo de Marketing" });
  }
}

module.exports = { garantirEsquema, garantirFunilPadrao, garantirRegrasRecuperacao, prepararTenant, middleware, ETAPAS_PADRAO };
