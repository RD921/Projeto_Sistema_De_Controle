USE ecomflow;

CREATE TABLE IF NOT EXISTS financial_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome_original VARCHAR(255) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL COMMENT 'nome salvo em disco, unico',
  tipo_documento ENUM('nfe','nfce','nfse','cte','mdfe','contrato','boleto','recibo','comprovante','outro') NOT NULL DEFAULT 'outro',
  mimetype VARCHAR(100),
  tamanho_bytes INT,
  entidade_tipo ENUM('lancamento_financeiro','lancamento_contabil','obrigacao','fornecedor','nenhuma') DEFAULT 'nenhuma',
  entidade_id INT NULL,
  descricao VARCHAR(255),
  uploaded_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);