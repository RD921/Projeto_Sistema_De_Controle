CREATE TABLE IF NOT EXISTS automations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('draft','active','paused','error','archived') DEFAULT 'draft',
  version INT DEFAULT 1,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenant (tenant_id)
);

CREATE TABLE IF NOT EXISTS automation_nodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  automation_id INT NOT NULL,
  node_id VARCHAR(64) NOT NULL,
  type VARCHAR(50) NOT NULL,
  label VARCHAR(255),
  config JSON,
  position_x INT DEFAULT 0,
  position_y INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE,
  INDEX idx_automation (automation_id)
);

CREATE TABLE IF NOT EXISTS automation_edges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  automation_id INT NOT NULL,
  source_node_id VARCHAR(64) NOT NULL,
  target_node_id VARCHAR(64) NOT NULL,
  source_handle VARCHAR(50) DEFAULT 'default',
  target_handle VARCHAR(50) DEFAULT 'default',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE,
  INDEX idx_automation (automation_id)
);

CREATE TABLE IF NOT EXISTS automation_executions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  automation_id INT NOT NULL,
  tenant_id INT NOT NULL,
  status ENUM('queued','running','success','failed','cancelled') DEFAULT 'queued',
  trigger_type VARCHAR(50) DEFAULT 'manual',
  trigger_data JSON,
  started_at DATETIME,
  finished_at DATETIME,
  duration_ms INT,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE,
  INDEX idx_automation (automation_id),
  INDEX idx_tenant (tenant_id)
);

CREATE TABLE IF NOT EXISTS automation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  execution_id INT NOT NULL,
  node_id VARCHAR(64),
  level ENUM('info','warning','error') DEFAULT 'info',
  message TEXT,
  input_data JSON,
  output_data JSON,
  duration_ms INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES automation_executions(id) ON DELETE CASCADE,
  INDEX idx_execution (execution_id)
);