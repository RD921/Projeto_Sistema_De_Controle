CREATE TABLE sac_sla_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  prioridade ENUM('baixa','normal','alta','urgente') NOT NULL,
  primeira_resposta_minutos INT NOT NULL,
  resolucao_minutos INT NOT NULL,
  UNIQUE KEY uk_tenant_prioridade (tenant_id, prioridade),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Seed com valores padrao razoaveis por prioridade, ajustaveis depois pela tela
INSERT INTO sac_sla_rules (tenant_id, prioridade, primeira_resposta_minutos, resolucao_minutos)
SELECT id, 'urgente', 15, 240 FROM tenants
UNION ALL SELECT id, 'alta', 60, 480 FROM tenants
UNION ALL SELECT id, 'normal', 240, 1440 FROM tenants
UNION ALL SELECT id, 'baixa', 480, 4320 FROM tenants;