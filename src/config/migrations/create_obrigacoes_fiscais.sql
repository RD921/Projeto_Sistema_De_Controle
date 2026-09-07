USE ecomflow;

CREATE TABLE IF NOT EXISTS fiscal_obligations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  nome VARCHAR(150) NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'outra',
  competencia VARCHAR(7) NOT NULL COMMENT 'formato AAAA-MM',
  prazo DATE NOT NULL,
  responsavel VARCHAR(150),
  status ENUM('nao_iniciado','em_preparacao','aguardando_revisao','com_erro','pronto','transmitido','recebido','rejeitado','retificado')
    NOT NULL DEFAULT 'nao_iniciado',
  protocolo VARCHAR(100),
  data_transmissao DATETIME,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);