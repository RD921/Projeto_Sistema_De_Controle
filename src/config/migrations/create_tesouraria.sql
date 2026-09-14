USE ecomflow;

CREATE TABLE IF NOT EXISTS bank_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  conta_origem_id INT NOT NULL,
  conta_destino_id INT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data DATE NOT NULL,
  descricao VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (conta_origem_id) REFERENCES bank_accounts(id),
  FOREIGN KEY (conta_destino_id) REFERENCES bank_accounts(id)
);

CREATE TABLE IF NOT EXISTS investments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  bank_account_id INT NOT NULL COMMENT 'conta de origem do dinheiro aplicado',
  nome VARCHAR(150) NOT NULL,
  tipo ENUM('cdb','tesouro_direto','fundo','poupanca','outro') NOT NULL DEFAULT 'outro',
  valor_aplicado DECIMAL(12,2) NOT NULL,
  valor_atual DECIMAL(12,2) NOT NULL,
  data_aplicacao DATE NOT NULL,
  data_vencimento DATE NULL COMMENT 'null = sem vencimento definido (liquidez diaria)',
  status ENUM('ativo','resgatado') NOT NULL DEFAULT 'ativo',
  data_resgate DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);