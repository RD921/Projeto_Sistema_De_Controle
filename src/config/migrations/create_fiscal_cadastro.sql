USE ecomflow;

CREATE TABLE IF NOT EXISTS company_fiscal_data (
  tenant_id INT PRIMARY KEY,
  cnpj VARCHAR(18),
  razao_social VARCHAR(200),
  nome_fantasia VARCHAR(200),
  inscricao_estadual VARCHAR(30),
  inscricao_municipal VARCHAR(30),
  regime_tributario ENUM('simples_nacional','lucro_presumido','lucro_real','mei','isento') DEFAULT 'simples_nacional',
  natureza_juridica VARCHAR(100),
  cnaes VARCHAR(255),
  cep VARCHAR(10),
  endereco VARCHAR(200),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  pais VARCHAR(50) DEFAULT 'Brasil',
  contador_nome VARCHAR(150),
  contador_email VARCHAR(150),
  contador_telefone VARCHAR(20),
  contador_crc VARCHAR(30),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);