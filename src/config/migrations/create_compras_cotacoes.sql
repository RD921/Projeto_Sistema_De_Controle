CREATE TABLE compras_cotacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  status ENUM('aberta','fechada','convertida') NOT NULL DEFAULT 'aberta',
  data_limite DATE NULL,
  observacoes TEXT NULL,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE compras_cotacao_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cotacao_id INT NOT NULL,
  product_id INT NOT NULL,
  quantidade INT NOT NULL,
  FOREIGN KEY (cotacao_id) REFERENCES compras_cotacoes(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE compras_cotacao_fornecedores (
  cotacao_id INT NOT NULL,
  fornecedor_id INT NOT NULL,
  PRIMARY KEY (cotacao_id, fornecedor_id),
  FOREIGN KEY (cotacao_id) REFERENCES compras_cotacoes(id) ON DELETE CASCADE,
  FOREIGN KEY (fornecedor_id) REFERENCES compras_fornecedores(id) ON DELETE CASCADE
);

CREATE TABLE compras_cotacao_precos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cotacao_item_id INT NOT NULL,
  fornecedor_id INT NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  prazo_entrega_dias INT NULL,
  UNIQUE KEY uk_item_fornecedor (cotacao_item_id, fornecedor_id),
  FOREIGN KEY (cotacao_item_id) REFERENCES compras_cotacao_itens(id) ON DELETE CASCADE,
  FOREIGN KEY (fornecedor_id) REFERENCES compras_fornecedores(id) ON DELETE CASCADE
);