-- Tabela principal de contratos
CREATE TABLE IF NOT EXISTS contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  tipo ENUM('fornecedor', 'cliente') NOT NULL,
  nome_contraparte VARCHAR(255) NOT NULL,
  documento VARCHAR(20) NULL,
  descricao VARCHAR(255) NOT NULL,
  categoria VARCHAR(50) NOT NULL DEFAULT 'outros',
  cost_center_id INT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  tipo_recorrencia ENUM('unico', 'mensal', 'trimestral', 'semestral', 'anual') NOT NULL DEFAULT 'mensal',
  dia_vencimento TINYINT NOT NULL DEFAULT 10,
  data_inicio DATE NOT NULL,
  data_fim DATE NULL,
  renovacao_automatica TINYINT(1) NOT NULL DEFAULT 1,
  alerta_dias_antes INT NOT NULL DEFAULT 30,
  status ENUM('ativo', 'suspenso', 'encerrado') NOT NULL DEFAULT 'ativo',
  observacoes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_contracts_cost_center FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id)
  -- ⚠️ troque "cost_centers" pelo nome real da tabela confirmado no Passo 1
);

-- Rastreia quais lançamentos financeiros já foram gerados a partir de qual contrato/competência
-- (evita gerar o mesmo lançamento duas vezes ao clicar em "Gerar Lançamentos" de novo)
CREATE TABLE IF NOT EXISTS contract_generated_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contract_id INT NOT NULL,
  competencia VARCHAR(7) NOT NULL,
  financial_entry_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cge_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  CONSTRAINT fk_cge_entry FOREIGN KEY (financial_entry_id) REFERENCES financial_entries(id) ON DELETE CASCADE,
  UNIQUE KEY uq_contrato_competencia (contract_id, competencia)
);

CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX idx_contracts_status ON contracts(tenant_id, status);