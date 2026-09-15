CREATE TABLE logistics_warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  endereco VARCHAR(255) NULL,
  cidade VARCHAR(100) NULL,
  estado VARCHAR(2) NULL,
  cep VARCHAR(10) NULL,
  capacidade INT NULL,
  responsavel VARCHAR(255) NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE logistics_carriers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20) NULL,
  contato VARCHAR(255) NULL,
  modalidades VARCHAR(255) NULL,
  prazo_medio_dias DECIMAL(5,1) NULL,
  custo_medio DECIMAL(10,2) NULL,
  score DECIMAL(5,1) NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE logistics_shipments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  order_id INT NOT NULL,
  warehouse_id INT NULL,
  carrier_id INT NULL,
  status ENUM(
    'aguardando_separacao','em_separacao','conferencia','em_embalagem','pronto_expedicao',
    'despachado','em_transito','saiu_entrega','entregue',
    'cancelado','devolvido','extraviado','endereco_invalido','aguardando_informacao',
    'tentativa_entrega','entrega_recusada','problema_transporte'
  ) NOT NULL DEFAULT 'aguardando_separacao',
  prioridade ENUM('baixa','normal','alta') NOT NULL DEFAULT 'normal',
  tracking_code VARCHAR(100) NULL,
  peso_kg DECIMAL(8,3) NULL,
  volumes INT NULL DEFAULT 1,
  frete_valor DECIMAL(10,2) NULL,
  data_prevista DATE NULL,
  data_despacho DATETIME NULL,
  data_entrega DATETIME NULL,
  observacoes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES logistics_warehouses(id) ON DELETE SET NULL,
  FOREIGN KEY (carrier_id) REFERENCES logistics_carriers(id) ON DELETE SET NULL
);

CREATE TABLE logistics_tracking_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  shipment_id INT NOT NULL,
  evento VARCHAR(100) NOT NULL,
  descricao VARCHAR(255) NULL,
  localizacao VARCHAR(255) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (shipment_id) REFERENCES logistics_shipments(id) ON DELETE CASCADE
);