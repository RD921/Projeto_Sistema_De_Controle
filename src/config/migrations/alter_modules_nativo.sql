-- src/config/migrations/alter_modules_nativo.sql

ALTER TABLE modules_catalog
  ADD COLUMN nativo TINYINT(1) NOT NULL DEFAULT 0;

-- Automações, Integrações e Financeiro são núcleo do sistema:
-- sempre ativos, não passam por instalar/desinstalar.
-- Central de Controle nunca fez parte deste catálogo (é acessível
-- direto pela tela de Módulos), então não precisa de linha aqui.
UPDATE modules_catalog SET nativo = 1 WHERE id IN ('automacoes', 'integracoes', 'financeiro');