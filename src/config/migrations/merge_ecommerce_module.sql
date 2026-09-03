USE ecomflow;

INSERT IGNORE INTO modules_catalog (id, label, descricao, icon, rota, disponivel, nativo)
VALUES ('ecommerce', 'E-commerce', 'Gerencie seus produtos, pedidos e clientes em um só lugar.', '🛒', '/products', 1, 0);

-- Preserva instalação: se qualquer um dos 3 antigos estava ativo, ecommerce fica ativo
INSERT INTO tenant_modules (tenant_id, module_id, status)
SELECT DISTINCT tenant_id, 'ecommerce', 'active'
FROM tenant_modules
WHERE module_id IN ('produtos', 'pedidos', 'clientes') AND status = 'active'
ON DUPLICATE KEY UPDATE status = 'active';

-- Remove os 3 antigos do catálogo (cascade apaga o vínculo em tenant_modules)
DELETE FROM modules_catalog WHERE id IN ('produtos', 'pedidos', 'clientes');