CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  product_id INT NOT NULL,
  tipo ENUM('entrada','saida','ajuste') NOT NULL,
  quantidade INT NOT NULL,
  estoque_anterior INT NOT NULL,
  estoque_novo INT NOT NULL,
  motivo VARCHAR(255),
  user_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product (product_id)
);

INSERT IGNORE INTO event_types (code, label, category, description, module) VALUES
  ('stock_movement', 'Movimentacao de estoque', 'estoque', 'Disparado sempre que o estoque de um produto e alterado (entrada, saida ou ajuste)', 'estoque');