USE ecomflow;

CREATE TABLE IF NOT EXISTS financial_alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  tipo VARCHAR(50) NOT NULL COMMENT 'risco_caixa, obrigacao_proxima, despesa_acima_orcamento, margem_baixa, inadimplencia',
  severidade ENUM('normal','atencao','importante','critico') NOT NULL DEFAULT 'atencao',
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  referencia_tipo VARCHAR(50) NULL COMMENT 'ex: fiscal_obligation, financial_entry, cost_center',
  referencia_id INT NULL,
  lido BOOLEAN DEFAULT FALSE,
  resolvido BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);