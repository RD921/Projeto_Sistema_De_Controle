UPDATE modules_catalog SET disponivel = 1 WHERE id = 'financeiro';
UPDATE modules_catalog SET rota = '/logistica',  disponivel = 1 WHERE id = 'logistica';
UPDATE modules_catalog SET rota = '/relatorios', disponivel = 1 WHERE id = 'relatorios';

INSERT IGNORE INTO tenant_modules (tenant_id, module_id, status)
SELECT t.id, m.id, 'active'
FROM tenants t
JOIN modules_catalog m ON m.id IN ('logistica', 'relatorios')
WHERE t.ativo = 1;
