CREATE TABLE IF NOT EXISTS sales_channels (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  tipo ENUM('loja_fisica','site','marketplace','rede_social','outro') NOT NULL,
  nome VARCHAR(100) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  taxa_media_percentual DECIMAL(5,2) NULL,
  prazo_medio_dias INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sales_channels_tenant (tenant_id)
);

CREATE TABLE IF NOT EXISTS stores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  sales_channel_id INT NULL,
  nome VARCHAR(150) NOT NULL,
  endereco VARCHAR(255) NULL,
  cidade VARCHAR(100) NULL,
  estado CHAR(2) NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sales_channel_id) REFERENCES sales_channels(id) ON DELETE SET NULL,
  INDEX idx_stores_tenant (tenant_id)
);

ALTER TABLE orders ADD COLUMN sales_channel_id INT NULL AFTER canal;
ALTER TABLE orders ADD COLUMN store_id INT NULL AFTER sales_channel_id;
ALTER TABLE orders ADD COLUMN vendedor_id INT NULL AFTER store_id;
ALTER TABLE orders ADD FOREIGN KEY (sales_channel_id) REFERENCES sales_channels(id) ON DELETE SET NULL;
ALTER TABLE orders ADD FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;
ALTER TABLE orders ADD FOREIGN KEY (vendedor_id) REFERENCES users(id) ON DELETE SET NULL;

INSERT INTO sales_channels (tenant_id, tipo, nome, ativo)
SELECT id, 'site', 'Loja Própria', TRUE FROM tenants;

UPDATE orders o
JOIN sales_channels sc ON sc.tenant_id = o.tenant_id AND sc.nome = 'Loja Própria'
SET o.sales_channel_id = sc.id
WHERE o.sales_channel_id IS NULL;