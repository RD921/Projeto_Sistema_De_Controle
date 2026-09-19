CREATE TABLE compras_fornecedores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome VARCHAR(200) NOT NULL,
  cnpj VARCHAR(20) NULL,
  contato VARCHAR(150) NULL,
  telefone VARCHAR(30) NULL,
  email VARCHAR(150) NULL,
  prazo_entrega_dias INT NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE compras_pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  fornecedor_id INT NOT NULL,
  status ENUM('rascunho','enviado','confirmado','parcialmente_recebido','recebido','cancelado') NOT NULL DEFAULT 'rascunho',
  data_prevista DATE NULL,
  observacoes TEXT NULL,
  valor_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (fornecedor_id) REFERENCES compras_fornecedores(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE compras_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  product_id INT NOT NULL,
  quantidade INT NOT NULL,
  quantidade_recebida INT NOT NULL DEFAULT 0,
  preco_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES compras_pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);