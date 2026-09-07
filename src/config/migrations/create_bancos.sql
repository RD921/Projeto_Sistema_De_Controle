USE ecomflow;

CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome VARCHAR(100) NOT NULL COMMENT 'Ex: Conta Corrente Itaú',
  banco VARCHAR(100),
  agencia VARCHAR(20),
  numero_conta VARCHAR(30),
  tipo ENUM('corrente','poupanca','caixa','digital') NOT NULL DEFAULT 'corrente',
  conta_contabil_id INT NULL COMMENT 'vincula ao plano de contas (ex: 1.1.02 Bancos)',
  saldo_inicial DECIMAL(12,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (conta_contabil_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  bank_account_id INT NOT NULL,
  data DATE NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  tipo ENUM('entrada','saida') NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  conciliado BOOLEAN DEFAULT FALSE,
  financial_entry_id INT NULL COMMENT 'lançamento financeiro (Resumo) associado, se conciliado',
  accounting_entry_id INT NULL COMMENT 'lançamento contábil associado, se conciliado',
  origem VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (financial_entry_id) REFERENCES financial_entries(id) ON DELETE SET NULL,
  FOREIGN KEY (accounting_entry_id) REFERENCES accounting_entries(id) ON DELETE SET NULL
);