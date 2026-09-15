CREATE TABLE logistics_returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  shipment_id INT NOT NULL,
  motivo ENUM('defeito','arrependimento','produto_incorreto','avaria','problema_transporte','descricao_incorreta','outros') NOT NULL,
  descricao TEXT NULL,
  status ENUM('solicitada','em_analise','aprovada','rejeitada','etiqueta_gerada','em_transporte','recebida','conferida','concluida') NOT NULL DEFAULT 'solicitada',
  destino_produto ENUM('estoque','descarte','assistencia','nao_definido') NOT NULL DEFAULT 'nao_definido',
  reembolso_valor DECIMAL(10,2) NULL,
  reembolso_status ENUM('nao_aplicavel','pendente','processado') NOT NULL DEFAULT 'nao_aplicavel',
  custo_logistica_reversa DECIMAL(10,2) NULL,
  responsavel_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (shipment_id) REFERENCES logistics_shipments(id) ON DELETE CASCADE,
  FOREIGN KEY (responsavel_id) REFERENCES users(id) ON DELETE SET NULL
);