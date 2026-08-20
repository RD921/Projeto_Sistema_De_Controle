-- src/config/migrations/create_company_onboarding.sql
CREATE TABLE IF NOT EXISTS company_onboarding (
  tenant_id INT PRIMARY KEY,
  segmento VARCHAR(50),
  canais JSON,
  sistema_gestao VARCHAR(50),
  areas_automatizar JSON,
  tamanho_operacao VARCHAR(20),
  objetivo VARCHAR(50),
  modulos_selecionados JSON,
  completed_at DATETIME NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);