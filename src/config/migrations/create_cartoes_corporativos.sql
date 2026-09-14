CREATE TABLE IF NOT EXISTS corporate_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome VARCHAR(150) NOT NULL,
  bandeira ENUM('visa', 'mastercard', 'elo', 'amex', 'outro') NOT NULL DEFAULT 'outro',
  banco VARCHAR(100) NULL,
  final_cartao VARCHAR(4) NULL,
  limite DECIMAL(12,2) NOT NULL,
  dia_fechamento TINYINT NOT NULL DEFAULT 25,
  dia_vencimento TINYINT NOT NULL DEFAULT 10,
  cost_center_id INT NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cards_cost_center FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)
);

CREATE TABLE IF NOT EXISTS card_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  card_id INT NOT NULL,
  data DATE NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  categoria VARCHAR(50) NOT NULL DEFAULT 'outros',
  valor DECIMAL(12,2) NOT NULL,
  cost_center_id INT NULL,
  competencia VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ct_card FOREIGN KEY (card_id) REFERENCES corporate_cards(id) ON DELETE CASCADE,
  CONSTRAINT fk_ct_cost_center FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)
);

CREATE TABLE IF NOT EXISTS card_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  card_id INT NOT NULL,
  competencia VARCHAR(7) NOT NULL,
  valor_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('aberta', 'fechada', 'paga') NOT NULL DEFAULT 'aberta',
  financial_entry_id INT NULL,
  data_fechamento DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ci_card FOREIGN KEY (card_id) REFERENCES corporate_cards(id) ON DELETE CASCADE,
  CONSTRAINT fk_ci_entry FOREIGN KEY (financial_entry_id) REFERENCES financial_entries(id) ON DELETE SET NULL,
  UNIQUE KEY uq_card_competencia (card_id, competencia)
);

CREATE INDEX idx_cards_tenant ON corporate_cards(tenant_id);
CREATE INDEX idx_ct_card_competencia ON card_transactions(card_id, competencia);
CREATE TABLE IF NOT EXISTS marketing_leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(50),
  empresa VARCHAR(255),
  origem VARCHAR(100),
  canal VARCHAR(100),
  status ENUM('novo','contactado','engajado','qualificado','oportunidade','cliente','perdido','inativo') NOT NULL DEFAULT 'novo',
  score INT NOT NULL DEFAULT 0,
  temperatura ENUM('frio','morno','quente') NOT NULL DEFAULT 'morno',
  customer_id INT NULL,
  responsavel_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tenant (tenant_id),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS marketing_segments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo ENUM('estatico','dinamico') NOT NULL DEFAULT 'estatico',
  criterios JSON NULL,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tenant (tenant_id)
);

CREATE TABLE IF NOT EXISTS marketing_segment_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  segment_id INT NOT NULL,
  lead_id INT NULL,
  customer_id INT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (segment_id) REFERENCES marketing_segments(id) ON DELETE CASCADE,
  INDEX idx_segment (segment_id)
);

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  objetivo VARCHAR(255),
  tipo ENUM('email','sms','whatsapp','push','ads','social','outro') NOT NULL DEFAULT 'outro',
  segment_id INT NULL,
  automation_id INT NULL,
  status ENUM('rascunho','agendada','ativa','pausada','finalizada','cancelada') NOT NULL DEFAULT 'rascunho',
  orcamento DECIMAL(10,2) NULL,
  data_inicio DATE NULL,
  data_fim DATE NULL,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (segment_id) REFERENCES marketing_segments(id) ON DELETE SET NULL,
  FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE SET NULL,
  INDEX idx_tenant (tenant_id),
  INDEX idx_status (status)
);

INSERT IGNORE INTO event_types (code, label, category, description, module) VALUES
  ('lead_created', 'Lead criado', 'marketing', 'Disparado quando um novo lead e cadastrado no sistema', 'marketing'),
  ('lead_status_changed', 'Status do lead alterado', 'marketing', 'Disparado quando o status de um lead muda (ex: qualificado, perdido)', 'marketing'),
  ('campaign_started', 'Campanha iniciada', 'marketing', 'Disparado quando uma campanha de marketing e ativada', 'marketing');