-- Tabela de vínculo usuário ↔ empresa (N:N)
CREATE TABLE IF NOT EXISTS user_tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tenant_id INT NOT NULL,
  role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ut_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ut_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_tenant (user_id, tenant_id)
);

-- Migra os vínculos que já existem hoje (users.tenant_id) para a tabela nova
INSERT INTO user_tenants (user_id, tenant_id, role, is_default)
SELECT id, tenant_id, role, 1
FROM users
WHERE tenant_id IS NOT NULL
ON DUPLICATE KEY UPDATE is_default = 1;

CREATE INDEX idx_user_tenants_user ON user_tenants(user_id);