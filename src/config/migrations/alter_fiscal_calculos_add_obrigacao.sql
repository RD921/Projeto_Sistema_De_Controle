ALTER TABLE fiscal_calculos
  ADD COLUMN obrigacao_id INT DEFAULT NULL AFTER financial_entry_id,
  ADD CONSTRAINT fk_fiscal_calculos_obrigacao
    FOREIGN KEY (obrigacao_id) REFERENCES fiscal_obligations(id) ON DELETE SET NULL;
