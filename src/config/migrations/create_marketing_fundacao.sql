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