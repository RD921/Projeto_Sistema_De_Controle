CREATE TABLE IF NOT EXISTS marketing_landing_pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  slug VARCHAR(150) NOT NULL,
  blocos JSON NOT NULL,
  form_id INT NULL,
  campaign_id INT NULL,
  status ENUM('rascunho','publicada','arquivada') NOT NULL DEFAULT 'rascunho',
  total_visualizacoes INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (form_id) REFERENCES marketing_forms(id) ON DELETE SET NULL,
  FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  UNIQUE KEY uq_tenant_slug (tenant_id, slug),
  INDEX idx_status (status)
);