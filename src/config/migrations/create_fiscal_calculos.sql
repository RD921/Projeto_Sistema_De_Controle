CREATE TABLE IF NOT EXISTS fiscal_calculos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  competencia VARCHAR(7) NOT NULL,
  regime_tributario VARCHAR(30) NOT NULL,
  receita_bruta DECIMAL(14,2) NOT NULL DEFAULT 0,
  lucro_contabil DECIMAL(14,2) DEFAULT NULL,
  base_calculo DECIMAL(14,2) NOT NULL DEFAULT 0,
  detalhes JSON NOT NULL,
  total_impostos DECIMAL(14,2) NOT NULL DEFAULT 0,
  financial_entry_id INT DEFAULT NULL,
  status ENUM('calculado','guia_gerada') NOT NULL DEFAULT 'calculado',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tenant_competencia (tenant_id, competencia),
  FOREIGN KEY (financial_entry_id) REFERENCES financial_entries(id) ON DELETE SET NULL
);
