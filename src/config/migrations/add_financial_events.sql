ALTER TABLE financial_entries
  ADD COLUMN overdue_notified_at DATETIME NULL AFTER data_vencimento;

INSERT IGNORE INTO event_types (code, label, category, description, module) VALUES
  ('financial.account_receivable.overdue', 'Conta a receber vencida', 'financeiro', 'Disparado uma unica vez quando uma conta a receber ultrapassa a data de vencimento sem ter sido paga', 'financeiro');