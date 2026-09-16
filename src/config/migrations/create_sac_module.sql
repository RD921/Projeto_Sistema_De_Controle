CREATE TABLE sac_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  customer_id INT NULL,
  order_id INT NULL,
  assunto VARCHAR(255) NOT NULL,
  descricao TEXT NULL,
  categoria VARCHAR(50) NOT NULL DEFAULT 'outros',
  prioridade ENUM('baixa','normal','alta','urgente') NOT NULL DEFAULT 'normal',
  status ENUM('novo','em_atendimento','aguardando_cliente','aguardando_empresa','resolvido','encerrado','reaberto') NOT NULL DEFAULT 'novo',
  canal ENUM('email','whatsapp','chat','formulario','marketplace','outros') NOT NULL DEFAULT 'chat',
  responsavel_id INT NULL,
  primeira_resposta_em DATETIME NULL,
  resolvido_em DATETIME NULL,
  encerrado_em DATETIME NULL,
  reaberto_em DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (responsavel_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE sac_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  remetente_id INT NULL,
  tipo ENUM('cliente','atendente','sistema') NOT NULL,
  conteudo TEXT NOT NULL,
  interna BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES sac_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (remetente_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE sac_ticket_historico (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  usuario_id INT NULL,
  evento VARCHAR(100) NOT NULL,
  valor_anterior VARCHAR(100) NULL,
  valor_novo VARCHAR(100) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES sac_tickets(id) ON DELETE CASCADE
);