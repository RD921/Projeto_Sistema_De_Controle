CREATE TABLE IF NOT EXISTS marketing_conversions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  campaign_id INT NOT NULL,
  lead_id INT NULL,
  customer_id INT NOT NULL,
  order_id INT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  UNIQUE KEY uq_campaign_order (campaign_id, order_id),
  INDEX idx_tenant (tenant_id),
  INDEX idx_campaign (campaign_id)
);

INSERT IGNORE INTO event_types (code, label, category, description, module) VALUES
  ('campaign_conversion', 'Conversao de campanha', 'marketing', 'Disparado quando um pedido e atribuido a uma campanha de marketing', 'marketing');