-- src/config/migrations/create_integrations_catalog.sql

CREATE TABLE IF NOT EXISTS integrations_catalog (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  categoria VARCHAR(50) NOT NULL,
  icon VARCHAR(10),
  descricao VARCHAR(255),
  campos_credencial JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO integrations_catalog (id, label, categoria, icon, descricao, campos_credencial) VALUES
  ('nuvemshop', 'Nuvemshop', 'canais_venda', '🛍️', 'Loja virtual', JSON_ARRAY('access_token', 'store_id')),
  ('shopify', 'Shopify', 'canais_venda', '🛒', 'Loja virtual', JSON_ARRAY('api_key', 'api_secret', 'shop_url')),
  ('woocommerce', 'WooCommerce', 'canais_venda', '🧩', 'Loja virtual (WordPress)', JSON_ARRAY('consumer_key', 'consumer_secret', 'site_url')),
  ('mercadolivre', 'Mercado Livre', 'canais_venda', '🟡', 'Marketplace', JSON_ARRAY('client_id', 'client_secret')),
  ('shopee', 'Shopee', 'canais_venda', '🟠', 'Marketplace', JSON_ARRAY('partner_id', 'partner_key')),
  ('amazon', 'Amazon', 'canais_venda', '📦', 'Marketplace', JSON_ARRAY('seller_id', 'auth_token')),
  ('melhorenvio', 'Melhor Envio', 'logistica', '🚚', 'Cotação e etiquetas de frete', JSON_ARRAY('access_token')),
  ('frenet', 'Frenet', 'logistica', '📮', 'Cotação de frete', JSON_ARRAY('token')),
  ('correios', 'Correios', 'logistica', '📬', 'Rastreio e frete', JSON_ARRAY('usuario', 'senha')),
  ('nfe', 'Emissão de NF-e', 'fiscal', '🧾', 'Nota fiscal eletrônica', JSON_ARRAY('certificado_a1', 'senha_certificado')),
  ('bling', 'Bling', 'fiscal', '🔵', 'ERP e emissão de NF-e', JSON_ARRAY('client_id', 'client_secret')),
  ('mercadopago', 'Mercado Pago', 'pagamentos', '💳', 'Gateway de pagamento', JSON_ARRAY('access_token', 'public_key')),
  ('pagseguro', 'PagSeguro', 'pagamentos', '💰', 'Gateway de pagamento', JSON_ARRAY('token', 'email')),
  ('asaas', 'Asaas', 'pagamentos', '🏦', 'Gateway de pagamento', JSON_ARRAY('api_key'));

CREATE TABLE IF NOT EXISTS tenant_integrations (
  tenant_id INT NOT NULL,
  integration_id VARCHAR(50) NOT NULL,
  status ENUM('connected','disconnected') NOT NULL DEFAULT 'disconnected',
  credenciais JSON,
  connected_at DATETIME NULL,
  PRIMARY KEY (tenant_id, integration_id),
  FOREIGN KEY (integration_id) REFERENCES integrations_catalog(id)
);