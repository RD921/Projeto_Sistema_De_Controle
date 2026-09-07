USE ecomflow;

ALTER TABLE financial_entries
  ADD COLUMN entidade_nome VARCHAR(150) NULL COMMENT 'nome do fornecedor (despesa) ou cliente (receita)' AFTER descricao,
  ADD COLUMN entidade_documento VARCHAR(30) NULL COMMENT 'CPF/CNPJ do fornecedor/cliente' AFTER entidade_nome,
  ADD COLUMN parcela_atual INT NULL DEFAULT 1 AFTER data_vencimento,
  ADD COLUMN total_parcelas INT NULL DEFAULT 1 AFTER parcela_atual,
  ADD COLUMN grupo_parcelamento VARCHAR(36) NULL COMMENT 'UUID que agrupa parcelas da mesma compra/venda' AFTER total_parcelas,
  ADD COLUMN forma_pagamento VARCHAR(30) NULL AFTER grupo_parcelamento,
  ADD COLUMN aprovacao_status ENUM('nao_requer','pendente','aprovado','rejeitado') NOT NULL DEFAULT 'nao_requer' AFTER status,
  ADD COLUMN aprovado_por INT NULL AFTER aprovacao_status,
  ADD COLUMN aprovado_em DATETIME NULL AFTER aprovado_por,
  ADD CONSTRAINT fk_financial_entries_aprovado_por FOREIGN KEY (aprovado_por) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_financial_entries_grupo ON financial_entries(grupo_parcelamento);