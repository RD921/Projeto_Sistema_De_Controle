USE ecomflow;

ALTER TABLE orders ADD COLUMN canal VARCHAR(50) NOT NULL DEFAULT 'loja_propria';