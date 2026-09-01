USE ecomflow;

CREATE TABLE IF NOT EXISTS google_integrations (
  tenant_id INT PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  expires_at DATETIME,
  connected_at DATETIME,
  ativo BOOLEAN DEFAULT TRUE,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);