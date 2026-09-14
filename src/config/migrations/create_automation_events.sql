-- src/config/migrations/create_automation_events.sql
CREATE TABLE IF NOT EXISTS automation_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  event_type VARCHAR(150) NOT NULL,
  payload JSON,
  automations_disparadas INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant (tenant_id),
  INDEX idx_event_type (event_type)
);