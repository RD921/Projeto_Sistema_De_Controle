CREATE TABLE IF NOT EXISTS scenarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome VARCHAR(150) NOT NULL,
  tipo ENUM('variacao_percentual', 'contratar_demitir', 'novo_contrato', 'livre') NOT NULL,
  parametros JSON NOT NULL,
  meses_projecao INT NOT NULL DEFAULT 6,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scenarios_tenant ON scenarios(tenant_id);