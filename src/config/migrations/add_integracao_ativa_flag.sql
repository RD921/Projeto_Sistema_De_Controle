ALTER TABLE integrations_catalog ADD COLUMN sincronizacao_real BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE integrations_catalog SET sincronizacao_real = TRUE WHERE id = 'mercadolivre';