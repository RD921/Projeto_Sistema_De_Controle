CREATE TABLE permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chave VARCHAR(100) NOT NULL UNIQUE,
  label VARCHAR(150) NOT NULL,
  modulo VARCHAR(50) NOT NULL,
  descricao VARCHAR(255) NULL
);

CREATE TABLE user_permissions (
  user_id INT NOT NULL,
  permission_id INT NOT NULL,
  concedido_por INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (concedido_por) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed inicial: uma permissao por modulo instalavel, cobrindo "ver" e "editar".
-- Nao e uma matriz completa de acoes - e a base minima pra comecar.
INSERT INTO permissions (chave, label, modulo, descricao) VALUES
  ('financeiro.ver', 'Ver Financeiro', 'financeiro', 'Visualizar dados do modulo Financeiro'),
  ('financeiro.editar', 'Editar Financeiro', 'financeiro', 'Criar/editar lancamentos financeiros'),
  ('crm.ver', 'Ver CRM', 'crm', 'Visualizar pipeline e clientes do CRM'),
  ('crm.editar', 'Editar CRM', 'crm', 'Criar/editar oportunidades e tarefas'),
  ('logistica.ver', 'Ver Logistica', 'logistica', 'Visualizar envios e indicadores logisticos'),
  ('logistica.editar', 'Editar Logistica', 'logistica', 'Criar/editar envios, depositos e transportadoras'),
  ('marketing.ver', 'Ver Marketing', 'marketing', 'Visualizar leads e campanhas'),
  ('marketing.editar', 'Editar Marketing', 'marketing', 'Criar/editar campanhas e leads'),
  ('usuarios.gerenciar', 'Gerenciar Usuários', 'sistema', 'Criar usuarios, mudar papel, ativar/desativar'),
  ('relatorios.ver', 'Ver Relatórios', 'relatorios', 'Visualizar relatorios e dashboard executivo');