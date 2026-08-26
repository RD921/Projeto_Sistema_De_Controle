-- src/config/migrations/create_modules_system.sql

-- Catálogo global de módulos que existem (ou vão existir) no sistema.
-- "disponivel" = a funcionalidade real já está construída e pode ser
-- acessada; módulos com disponivel=0 aparecem como "Em breve".
CREATE TABLE IF NOT EXISTS modules_catalog (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  descricao VARCHAR(255),
  icon VARCHAR(10),
  rota VARCHAR(100),
  disponivel TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO modules_catalog (id, label, descricao, icon, rota, disponivel) VALUES
  ('pedidos', 'Pedidos', 'Processamento e controle de pedidos', '📦', '/orders', 1),
  ('produtos', 'Produtos & Estoque', 'Catálogo de produtos e controle de estoque', '🛒', '/products', 1),
  ('clientes', 'Clientes', 'Cadastro e relacionamento com clientes', '👥', '/customers', 1),
  ('marketing', 'Marketing', 'Campanhas, copy com IA e lead scoring', '📣', '/marketing', 1),
  ('automacoes', 'Automações', 'Motor de automação visual', '⚡', '/automacoes', 1),
  ('integracoes', 'Integrações', 'Bling, Mercado Livre e outras plataformas', '🔗', '/integracoes', 1),
  ('financeiro', 'Financeiro', 'Contas a pagar/receber e fluxo de caixa', '💰', NULL, 0),
  ('atendimento', 'Atendimento', 'Suporte e relacionamento com clientes', '🎧', NULL, 0),
  ('relatorios', 'Relatórios e BI', 'Dashboards e análises inteligentes', '📈', NULL, 0),
  ('logistica', 'Logística', 'Envios e rastreamento de entregas', '🚛', NULL, 0),
  ('fiscal', 'Fiscal e Contábil', 'Notas fiscais e obrigações fiscais', '🧾', NULL, 0),
  ('compras', 'Compras', 'Gestão de fornecedores e compras', '🛍️', NULL, 0);

-- Quais módulos cada tenant tem "instalado" (ativado). Populado
-- automaticamente pelo onboarding, mas pode ser alterado depois.
CREATE TABLE IF NOT EXISTS tenant_modules (
  tenant_id INT NOT NULL,
  module_id VARCHAR(50) NOT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, module_id),
  FOREIGN KEY (module_id) REFERENCES modules_catalog(id)
);