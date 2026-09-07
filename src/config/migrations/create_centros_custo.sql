USE ecomflow;

CREATE TABLE IF NOT EXISTS cost_centers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  codigo VARCHAR(20) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao VARCHAR(255),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_codigo_tenant (tenant_id, codigo)
);

-- Cria um centro de custo "Geral" para cada empresa já existente,
-- necessário para não deixar órfãos os lançamentos que já existem.
INSERT INTO cost_centers (tenant_id, codigo, nome, descricao)
SELECT t.id, 'GERAL', 'Geral', 'Centro de custo padrão para lançamentos não classificados'
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM cost_centers c WHERE c.tenant_id = t.id AND c.codigo = 'GERAL');

-- ── financial_entries: adiciona a coluna, preenche com o centro "Geral", depois trava como obrigatória ──
ALTER TABLE financial_entries ADD COLUMN cost_center_id INT NULL AFTER categoria;

UPDATE financial_entries fe
JOIN cost_centers cc ON cc.tenant_id = fe.tenant_id AND cc.codigo = 'GERAL'
SET fe.cost_center_id = cc.id
WHERE fe.cost_center_id IS NULL;

ALTER TABLE financial_entries
  MODIFY COLUMN cost_center_id INT NOT NULL,
  ADD CONSTRAINT fk_financial_entries_cost_center FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id);

-- ── accounting_entry_lines: mesma lógica, cada linha de lançamento contábil também exige centro de custo ──
ALTER TABLE accounting_entry_lines ADD COLUMN cost_center_id INT NULL AFTER conta_id;

UPDATE accounting_entry_lines l
JOIN accounting_entries e ON e.id = l.entry_id
JOIN cost_centers cc ON cc.tenant_id = e.tenant_id AND cc.codigo = 'GERAL'
SET l.cost_center_id = cc.id
WHERE l.cost_center_id IS NULL;

ALTER TABLE accounting_entry_lines
  MODIFY COLUMN cost_center_id INT NOT NULL,
  ADD CONSTRAINT fk_accounting_lines_cost_center FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id);