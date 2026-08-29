USE ecomflow;

CREATE TABLE IF NOT EXISTS financial_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  tipo ENUM('receita','despesa') NOT NULL,
  categoria VARCHAR(50) NOT NULL DEFAULT 'outros',
  descricao VARCHAR(255) NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE NULL,
  status ENUM('pendente','pago','atrasado') NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

UPDATE modules_catalog SET rota = '/financeiro' WHERE id = 'financeiro';