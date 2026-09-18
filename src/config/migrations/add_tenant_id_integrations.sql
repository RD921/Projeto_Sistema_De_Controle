ALTER TABLE integrations ADD COLUMN tenant_id INT NULL AFTER id;
ALTER TABLE integrations ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Remove a restricao antiga de unicidade por marketplace global (se existir),
-- e cria uma nova por tenant+marketplace, permitindo que cada empresa tenha sua propria conexao.
ALTER TABLE integrations ADD UNIQUE KEY uk_tenant_marketplace (tenant_id, marketplace);