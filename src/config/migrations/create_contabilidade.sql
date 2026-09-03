USE ecomflow;

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  codigo VARCHAR(20) NOT NULL,
  nome VARCHAR(150) NOT NULL,
  tipo ENUM('ativo','passivo','patrimonio_liquido','receita','despesa') NOT NULL,
  natureza ENUM('devedora','credora') NOT NULL,
  conta_pai_id INT NULL,
  nivel ENUM('sintetica','analitica') NOT NULL DEFAULT 'analitica',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (conta_pai_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  UNIQUE KEY uniq_codigo_tenant (tenant_id, codigo)
);

CREATE TABLE IF NOT EXISTS accounting_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  data DATE NOT NULL,
  historico VARCHAR(255) NOT NULL,
  documento VARCHAR(100),
  origem VARCHAR(50) DEFAULT 'manual',
  usuario_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS accounting_entry_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL,
  conta_id INT NOT NULL,
  tipo ENUM('debito','credito') NOT NULL,
  valor DECIMAL(12,2) NOT NULL,

  FOREIGN KEY (entry_id) REFERENCES accounting_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (conta_id) REFERENCES chart_of_accounts(id)
);

-- Plano de contas inicial básico (sintéticas + algumas analíticas de exemplo).
-- O usuário pode editar/expandir depois pela tela.
INSERT INTO chart_of_accounts (tenant_id, codigo, nome, tipo, natureza, conta_pai_id, nivel)
SELECT t.id, '1', 'ATIVO', 'ativo', 'devedora', NULL, 'sintetica' FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts c WHERE c.tenant_id = t.id AND c.codigo = '1');

INSERT INTO chart_of_accounts (tenant_id, codigo, nome, tipo, natureza, conta_pai_id, nivel)
SELECT t.id, '1.1', 'Ativo Circulante', 'ativo', 'devedora',
  (SELECT id FROM chart_of_accounts WHERE tenant_id = t.id AND codigo = '1'), 'sintetica'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts c WHERE c.tenant_id = t.id AND c.codigo = '1.1');

INSERT INTO chart_of_accounts (tenant_id, codigo, nome, tipo, natureza, conta_pai_id, nivel)
SELECT t.id, '1.1.01', 'Caixa', 'ativo', 'devedora',
  (SELECT id FROM chart_of_accounts WHERE tenant_id = t.id AND codigo = '1.1'), 'analitica'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts c WHERE c.tenant_id = t.id AND c.codigo = '1.1.01');

INSERT INTO chart_of_accounts (tenant_id, codigo, nome, tipo, natureza, conta_pai_id, nivel)
SELECT t.id, '1.1.02', 'Bancos', 'ativo', 'devedora',
  (SELECT id FROM chart_of_accounts WHERE tenant_id = t.id AND codigo = '1.1'), 'analitica'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts c WHERE c.tenant_id = t.id AND c.codigo = '1.1.02');

INSERT INTO chart_of_accounts (tenant_id, codigo, nome, tipo, natureza, conta_pai_id, nivel)
SELECT t.id, '1.1.03', 'Contas a Receber', 'ativo', 'devedora',
  (SELECT id FROM chart_of_accounts WHERE tenant_id = t.id AND codigo = '1.1'), 'analitica'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts c WHERE c.tenant_id = t.id AND c.codigo = '1.1.03');

INSERT INTO chart_of_accounts (tenant_id, codigo, nome, tipo, natureza, conta_pai_id, nivel)
SELECT t.id, '2', 'PASSIVO', 'passivo', 'credora', NULL, 'sintetica' FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts c WHERE c.tenant_id = t.id AND c.codigo = '2');

INSERT INTO chart_of_accounts (tenant_id, codigo, nome, tipo, natureza, conta_pai_id, nivel)
SELECT t.id, '2.1', 'Passivo Circulante', 'passivo', 'credora',
  (SELECT id FROM chart_of_accounts WHERE tenant_id = t.id AND codigo = '2'), 'sintetica'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts c WHERE c.tenant_id = t.id AND c.codigo = '2.1');

INSERT INTO chart_of_accounts (tenant_id, codigo, nome, tipo, natureza, conta_pai_id, nivel)
SELECT t.id, '2.1.01', 'Fornecedores', 'passivo', 'credora',
  (SELECT id FROM chart_of_accounts WHERE tenant_id = t.id AND codigo = '2.1'), 'analitica'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts c WHERE c.tenant_id = t.id AND c.codigo = '2.1.01');

INSERT INTO chart_of_accounts (tenant_id, codigo, nome, tipo, natureza, conta_pai_id, nivel)
SELECT t.id, '3', 'RECEITAS', 'receita', 'credora', NULL, 'sintetica' FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts c WHERE c.tenant_id = t.id AND c.codigo = '3');

INSERT INTO chart_of_accounts (tenant_id, codigo, nome, tipo, natureza, conta_pai_id, nivel)
SELECT t.id, '3.1.01', 'Receita de Vendas', 'receita', 'credora',
  (SELECT id FROM chart_of_accounts WHERE tenant_id = t.id AND codigo = '3'), 'analitica'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts c WHERE c.tenant_id = t.id AND c.codigo = '3.1.01');

INSERT INTO chart_of_accounts (tenant_id, codigo, nome, tipo, natureza, conta_pai_id, nivel)
SELECT t.id, '4', 'DESPESAS', 'despesa', 'devedora', NULL, 'sintetica' FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts c WHERE c.tenant_id = t.id AND c.codigo = '4');

INSERT INTO chart_of_accounts (tenant_id, codigo, nome, tipo, natureza, conta_pai_id, nivel)
SELECT t.id, '4.1.01', 'Despesas Administrativas', 'despesa', 'devedora',
  (SELECT id FROM chart_of_accounts WHERE tenant_id = t.id AND codigo = '4'), 'analitica'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts c WHERE c.tenant_id = t.id AND c.codigo = '4.1.01');