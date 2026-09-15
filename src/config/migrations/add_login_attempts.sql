CREATE TABLE login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  user_id INT NULL,
  tenant_id INT NULL,
  sucesso BOOLEAN NOT NULL,
  motivo_falha VARCHAR(100) NULL,
  ip VARCHAR(45) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_tenant (tenant_id)
);