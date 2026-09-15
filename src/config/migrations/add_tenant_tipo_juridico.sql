ALTER TABLE tenants
  ADD COLUMN tipo_juridico ENUM('mei','me','epp','ltda','outros','nao_definido') NOT NULL DEFAULT 'nao_definido';