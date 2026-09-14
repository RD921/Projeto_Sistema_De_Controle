CREATE TABLE IF NOT EXISTS crm_deals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  customer_id INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  valor DECIMAL(10,2),
  estagio ENUM('prospeccao','qualificacao','proposta','negociacao','ganho','perdido') NOT NULL DEFAULT 'prospeccao',
  responsavel_id INT NULL,
  motivo_perda VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_tenant (tenant_id),
  INDEX idx_estagio (estagio)
);

CREATE TABLE IF NOT EXISTS crm_interactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  customer_id INT NOT NULL,
  deal_id INT NULL,
  tipo ENUM('ligacao','reuniao','email','nota','whatsapp') NOT NULL,
  descricao TEXT NOT NULL,
  user_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE SET NULL,
  INDEX idx_customer (customer_id)
);

CREATE TABLE IF NOT EXISTS crm_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  customer_id INT NULL,
  deal_id INT NULL,
  titulo VARCHAR(255) NOT NULL,
  prazo DATETIME NULL,
  concluida BOOLEAN NOT NULL DEFAULT FALSE,
  responsavel_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE,
  INDEX idx_tenant (tenant_id)
);

INSERT IGNORE INTO event_types (code, label, category, description, module) VALUES
  ('deal_created', 'Oportunidade criada', 'crm', 'Disparado quando uma nova oportunidade e criada no pipeline', 'crm'),
  ('deal_stage_changed', 'Estagio da oportunidade alterado', 'crm', 'Disparado quando uma oportunidade muda de estagio', 'crm'),
  ('deal_won', 'Oportunidade ganha', 'crm', 'Disparado quando uma oportunidade e marcada como ganha', 'crm'),
  ('deal_lost', 'Oportunidade perdida', 'crm', 'Disparado quando uma oportunidade e marcada como perdida', 'crm');