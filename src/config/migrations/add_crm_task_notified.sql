ALTER TABLE crm_tasks
  ADD COLUMN overdue_notified_at DATETIME NULL AFTER prazo;

INSERT IGNORE INTO event_types (code, label, category, description, module) VALUES
  ('crm_task_overdue', 'Tarefa de CRM vencida', 'crm', 'Disparado uma unica vez quando uma tarefa do CRM passa do prazo sem ser concluida', 'crm');