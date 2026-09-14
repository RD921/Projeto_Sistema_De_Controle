USE ecomflow;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  user_id INT NULL,
  user_email VARCHAR(150) NULL,
  acao VARCHAR(100) NOT NULL,
  entidade_tipo VARCHAR(50) NOT NULL,
  entidade_id INT NULL,
  detalhes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS approval_thresholds (
  tenant_id INT PRIMARY KEY,
  valor_minimo DECIMAL(12,2) NOT NULL DEFAULT 5000.00 COMMENT 'valor a partir do qual só admin pode aprovar',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

INSERT INTO approval_thresholds (tenant_id)
SELECT id FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM approval_thresholds at WHERE at.tenant_id = t.id);