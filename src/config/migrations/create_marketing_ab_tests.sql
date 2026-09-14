CREATE TABLE IF NOT EXISTS marketing_ab_tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  segment_id INT NULL,
  status ENUM('rascunho','rodando','finalizado') NOT NULL DEFAULT 'rascunho',
  vencedor_variant_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (segment_id) REFERENCES marketing_segments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS marketing_ab_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ab_test_id INT NOT NULL,
  nome VARCHAR(100) NOT NULL,
  automation_id INT NOT NULL,
  peso INT NOT NULL DEFAULT 50,
  FOREIGN KEY (ab_test_id) REFERENCES marketing_ab_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS marketing_ab_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ab_test_id INT NOT NULL,
  variant_id INT NOT NULL,
  lead_id INT NOT NULL,
  execution_id INT NULL,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ab_test_id) REFERENCES marketing_ab_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES marketing_ab_variants(id) ON DELETE CASCADE,
  UNIQUE KEY uq_test_lead (ab_test_id, lead_id)
);