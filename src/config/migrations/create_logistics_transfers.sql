CREATE TABLE logistics_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  product_id INT NOT NULL,
  warehouse_origem_id INT NOT NULL,
  warehouse_destino_id INT NOT NULL,
  quantidade INT NOT NULL,
  status ENUM('pendente','em_transito','concluida','cancelada') NOT NULL DEFAULT 'pendente',
  responsavel_id INT NULL,
  data_prevista DATE NULL,
  data_conclusao DATETIME NULL,
  observacoes VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_origem_id) REFERENCES logistics_warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_destino_id) REFERENCES logistics_warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (responsavel_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Saldo de estoque POR DEPOSITO (nao substitui products.estoque, que continua
-- sendo o total consolidado; esta tabela so existe para empresas que usam
-- mais de um deposito e precisam saber onde cada unidade fisica esta).
CREATE TABLE logistics_stock_by_warehouse (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  product_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  quantidade INT NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_produto_deposito (product_id, warehouse_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES logistics_warehouses(id) ON DELETE CASCADE
);