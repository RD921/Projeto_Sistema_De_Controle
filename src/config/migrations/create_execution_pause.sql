ALTER TABLE automation_executions
  MODIFY status ENUM('queued','running','waiting','success','failed','cancelled') DEFAULT 'queued';

CREATE TABLE IF NOT EXISTS automation_execution_state (
  execution_id INT NOT NULL PRIMARY KEY,
  node_id VARCHAR(64) NOT NULL,
  wait_reason ENUM('delay','approval') NOT NULL,
  resume_at DATETIME NULL,
  branch VARCHAR(50) NULL,
  context_snapshot JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (execution_id) REFERENCES automation_executions(id) ON DELETE CASCADE,
  INDEX idx_resume (resume_at)
);