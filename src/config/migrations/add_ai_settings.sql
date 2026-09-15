CREATE TABLE ai_settings (
  tenant_id INT PRIMARY KEY,
  nivel_detalhamento ENUM('objetivo','equilibrado','detalhado','executivo') NOT NULL DEFAULT 'equilibrado',
  forma_comunicacao ENUM('direta','executiva','tecnica','explicativa') NOT NULL DEFAULT 'direta',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);