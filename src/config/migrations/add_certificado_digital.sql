ALTER TABLE company_fiscal_data ADD COLUMN certificado_arquivo LONGBLOB NULL;
ALTER TABLE company_fiscal_data ADD COLUMN certificado_senha_criptografada VARBINARY(512) NULL;
ALTER TABLE company_fiscal_data ADD COLUMN certificado_validade DATE NULL;
ALTER TABLE company_fiscal_data ADD COLUMN certificado_status ENUM('nao_configurado','ativo','vencido','invalido') NOT NULL DEFAULT 'nao_configurado';
ALTER TABLE company_fiscal_data ADD COLUMN certificado_nome_arquivo VARCHAR(255) NULL;