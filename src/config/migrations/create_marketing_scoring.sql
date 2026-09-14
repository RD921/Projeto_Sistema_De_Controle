CREATE TABLE IF NOT EXISTS marketing_scoring_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  event_type VARCHAR(150) NOT NULL,
  pontos INT NOT NULL,
  descricao VARCHAR(255),
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  INDEX idx_tenant_event (tenant_id, event_type)
);

CREATE TABLE IF NOT EXISTS marketing_lead_score_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  tenant_id INT NOT NULL,
  rule_id INT NULL,
  pontos_aplicados INT NOT NULL,
  score_resultante INT NOT NULL,
  motivo VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES marketing_leads(id) ON DELETE CASCADE,
  FOREIGN KEY (rule_id) REFERENCES marketing_scoring_rules(id) ON DELETE SET NULL,
  INDEX idx_lead (lead_id)
);

-- Regras iniciais de exemplo, editaveis/removiveis pelo usuario depois
INSERT INTO marketing_scoring_rules (tenant_id, event_type, pontos, descricao) VALUES
  (1, 'lead_created', 10, 'Lead entrou no sistema'),
  (1, 'lead_qualificado', 30, 'Lead marcado como qualificado'),
  (1, 'lead_perdido', -40, 'Lead marcado como perdido'),
  (1, 'lead_inativo', -20, 'Lead marcado como inativo');