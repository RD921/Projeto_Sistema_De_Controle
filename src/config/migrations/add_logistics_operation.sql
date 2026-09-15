ALTER TABLE logistics_shipments
  ADD COLUMN separacao_operador_id INT NULL AFTER prioridade,
  ADD COLUMN separacao_inicio DATETIME NULL AFTER separacao_operador_id,
  ADD COLUMN separacao_fim DATETIME NULL AFTER separacao_inicio,
  ADD COLUMN embalagem_operador_id INT NULL AFTER separacao_fim,
  ADD COLUMN embalagem_dimensoes VARCHAR(50) NULL AFTER embalagem_operador_id,
  ADD COLUMN embalagem_custo DECIMAL(10,2) NULL AFTER embalagem_dimensoes,
  ADD FOREIGN KEY (separacao_operador_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD FOREIGN KEY (embalagem_operador_id) REFERENCES users(id) ON DELETE SET NULL;