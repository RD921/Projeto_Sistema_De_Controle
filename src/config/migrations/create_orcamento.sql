USE ecomflow;

CREATE TABLE IF NOT EXISTS budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  competencia VARCHAR(7) NOT NULL COMMENT 'formato AAAA-MM',
  tipo ENUM('receita','despesa') NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  cost_center_id INT NOT NULL,
  valor_planejado DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_orcamento (tenant_id, competencia, tipo, categoria, cost_center_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)
);