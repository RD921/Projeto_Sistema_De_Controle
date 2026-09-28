ALTER TABLE marketplace_orders ADD COLUMN tenant_id INT NULL AFTER id;
ALTER TABLE marketplace_orders ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;