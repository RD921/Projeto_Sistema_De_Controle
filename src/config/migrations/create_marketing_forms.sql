CREATE TABLE IF NOT EXISTS marketing_forms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  campos JSON NOT NULL,
  origem_padrao VARCHAR(100),
  canal_padrao VARCHAR(100),
  campaign_id INT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  INDEX idx_token (token)
);

CREATE TABLE IF NOT EXISTS marketing_form_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  form_id INT NOT NULL,
  tenant_id INT NOT NULL,
  lead_id INT NULL,
  dados JSON NOT NULL,
  ip_origem VARCHAR(45),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (form_id) REFERENCES marketing_forms(id) ON DELETE CASCADE,
  INDEX idx_form (form_id)
);