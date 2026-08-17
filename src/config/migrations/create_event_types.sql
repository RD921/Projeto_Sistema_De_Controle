-- src/config/migrations/create_event_types.sql
CREATE TABLE IF NOT EXISTS event_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'geral',
  description TEXT,
  module VARCHAR(50) NOT NULL DEFAULT 'core',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_module (module)
);

INSERT IGNORE INTO event_types (code, label, category, description, module) VALUES
  ('ORDER_CREATED', 'Pedido criado', 'vendas', 'Disparado quando um novo pedido é registrado no sistema', 'ecommerce'),
  ('ORDER_PAID',    'Pedido pago',   'vendas', 'Disparado quando um pedido é marcado como pago', 'ecommerce'),
  ('STOCK_LOW',     'Estoque baixo', 'estoque', 'Disparado quando o estoque de um produto atinge o nível mínimo (≤10)', 'ecommerce');