USE ecomflow;

CREATE TABLE IF NOT EXISTS financial_automation_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome VARCHAR(150) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  ordem INT NOT NULL DEFAULT 0 COMMENT 'ordem de avaliação, menor = avaliado primeiro',

  -- Condições (todas precisam bater; NULL = ignora essa condição)
  condicao_tipo ENUM('receita','despesa') NULL,
  condicao_categoria VARCHAR(50) NULL,
  condicao_cost_center_id INT NULL,
  condicao_valor_operador ENUM('maior_que','menor_que','igual','entre') NULL,
  condicao_valor_min DECIMAL(12,2) NULL,
  condicao_valor_max DECIMAL(12,2) NULL,

  -- Ação a executar quando a condição bate
  acao ENUM('aprovar_automatico','exigir_aprovacao','marcar_pago_automatico','rejeitar') NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (condicao_cost_center_id) REFERENCES cost_centers(id)
);

CREATE TABLE IF NOT EXISTS financial_automation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  rule_id INT NULL,
  financial_entry_id INT NOT NULL,
  acao_executada VARCHAR(50) NOT NULL,
  detalhes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (rule_id) REFERENCES financial_automation_rules(id) ON DELETE SET NULL,
  FOREIGN KEY (financial_entry_id) REFERENCES financial_entries(id) ON DELETE CASCADE
);