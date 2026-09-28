CREATE TABLE IF NOT EXISTS crm_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  customer_id INT NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_crm_activities_customer (tenant_id, customer_id)
);