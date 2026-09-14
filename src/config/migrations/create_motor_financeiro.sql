USE ecomflow;

-- Adiciona custo unitário nos produtos (usado pra calcular lucro real por venda)
ALTER TABLE products ADD COLUMN custo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Parâmetros do motor por empresa (percentuais padrão usados quando não há dado real do marketplace)
CREATE TABLE IF NOT EXISTS financial_settings (
  tenant_id INT PRIMARY KEY,
  imposto_padrao_pct DECIMAL(5,2) NOT NULL DEFAULT 11.50,
  comissao_marketplace_pct DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  taxa_gateway_pct DECIMAL(5,2) NOT NULL DEFAULT 3.50,
  frete_medio_pct DECIMAL(5,2) NOT NULL DEFAULT 8.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

INSERT INTO financial_settings (tenant_id)
SELECT id FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM financial_settings fs WHERE fs.tenant_id = t.id);

-- Raio-X financeiro de cada pedido: o "motor" propriamente dito
CREATE TABLE IF NOT EXISTS order_financial_breakdown (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  order_id INT NOT NULL,
  receita_bruta DECIMAL(12,2) NOT NULL,
  custo_produtos DECIMAL(12,2) NOT NULL DEFAULT 0,
  comissao_marketplace DECIMAL(12,2) NOT NULL DEFAULT 0,
  taxa_gateway DECIMAL(12,2) NOT NULL DEFAULT 0,
  frete DECIMAL(12,2) NOT NULL DEFAULT 0,
  impostos DECIMAL(12,2) NOT NULL DEFAULT 0,
  lucro_liquido DECIMAL(12,2) NOT NULL DEFAULT 0,
  margem_percentual DECIMAL(5,2) NOT NULL DEFAULT 0,
  processado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uniq_order (tenant_id, order_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);