-- Vincula cada usuario a tenant_id como sua empresa padrao em user_tenants.
-- Sem isso, /auth/minhas-empresas (o seletor "Empresa Padrao") volta vazio,
-- porque o seed (SEED_APAGA_TUDO / o antigo dump com DROP DATABASE) recria
-- users.tenant_id mas nunca populava user_tenants.
-- Idempotente: pode rodar de novo sem duplicar nem sobrescrever is_default
-- de vinculos que ja existiam antes desta migracao.

INSERT INTO user_tenants (user_id, tenant_id, role, is_default)
SELECT u.id, u.tenant_id, u.role, 1
FROM users u
WHERE u.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_tenants ut
    WHERE ut.user_id = u.id AND ut.tenant_id = u.tenant_id
  );

-- Mantem o cargo em user_tenants alinhado ao cargo em users para o vinculo
-- "de casa" de cada usuario (o tenant que esta em users.tenant_id).
UPDATE user_tenants ut
JOIN users u ON u.id = ut.user_id AND u.tenant_id = ut.tenant_id
SET ut.role = u.role;