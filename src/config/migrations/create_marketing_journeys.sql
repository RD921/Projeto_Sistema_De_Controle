CREATE TABLE IF NOT EXISTS marketing_journey_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  campaign_id INT NOT NULL,
  lead_id INT NULL,
  execution_id INT NOT NULL,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (execution_id) REFERENCES automation_executions(id) ON DELETE CASCADE,
  INDEX idx_campaign (campaign_id)
);