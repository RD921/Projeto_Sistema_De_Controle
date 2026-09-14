INSERT IGNORE INTO modules_catalog (id, label, descricao, icon, rota, disponivel)
VALUES ('crm', 'CRM', 'Pipeline de vendas, oportunidades e relacionamento com clientes', '💼', '/crm/pipeline', 1);

INSERT IGNORE INTO tenant_modules (tenant_id, module_id, status)
VALUES (1, 'crm', 'active');