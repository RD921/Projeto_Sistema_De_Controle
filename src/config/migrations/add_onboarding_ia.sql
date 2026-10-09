-- Onboarding com IA: texto livre "Me conte mais sobre a sua empresa", PDF
-- enviado pelo cliente e o plano/resumo que a Aria monta a partir disso.
-- O servidor também cria essas colunas sozinho se faltarem
-- (src/services/onboardingIAService.js -> garantirEsquema).
ALTER TABLE company_onboarding ADD COLUMN descricao_empresa LONGTEXT NULL;
ALTER TABLE company_onboarding ADD COLUMN documento_nome VARCHAR(255) NULL;
ALTER TABLE company_onboarding ADD COLUMN documento_pdf MEDIUMBLOB NULL;
ALTER TABLE company_onboarding ADD COLUMN plano_ia JSON NULL;
ALTER TABLE company_onboarding ADD COLUMN resumo_ia TEXT NULL;
