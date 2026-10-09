# Roda todas as 76 migrations do projeto no MySQL do Aiven, uma por uma, na ordem certa.
# Uso: clique com o botao direito neste arquivo > "Executar com o PowerShell"
#      ou, no PowerShell:  powershell -ExecutionPolicy Bypass -File .\rodar_migrations.ps1

$mysql     = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$pasta     = "C:\Users\rodri\OneDrive\Documentos\Projetos\Projeto-atualizado\src\config\migrations"
$hostAiven = "sistema-mysql-rodrigoarrezzimaciel17-8321.i.aivencloud.com"
$porta     = "28017"
$banco     = "ecomflow"

$ordem = @(
  "add_ai_settings.sql",
  "add_configuracoes_v2.sql",
  "add_crm_activities.sql",
  "add_login_attempts.sql",
  "add_permissions_base.sql",
  "create_alertas.sql",
  "create_auditoria.sql",
  "create_automation_engine.sql",
  "create_automation_events.sql",
  "create_contabilidade.sql",
  "create_financeiro.sql",
  "create_bancos.sql",
  "create_centros_custo.sql",
  "create_event_types.sql",
  "create_cartoes_corporativos.sql",
  "create_company_onboarding.sql",
  "create_compras_module.sql",
  "create_compras_cotacoes.sql",
  "create_contratos.sql",
  "create_crm.sql",
  "create_documentos.sql",
  "create_estoque_movimentacoes.sql",
  "create_execution_pause.sql",
  "create_fiscal_cadastro.sql",
  "create_fiscal_calculos.sql",
  "create_fiscal_documents.sql",
  "create_google_integration.sql",
  "create_integrations_catalog.sql",
  "create_logistics_base.sql",
  "create_logistics_returns.sql",
  "create_logistics_transfers.sql",
  "create_marketing_ab_tests.sql",
  "create_marketing_attribution.sql",
  "create_marketing_forms.sql",
  "create_marketing_fundacao.sql",
  "create_marketing_journeys.sql",
  "create_marketing_landing_pages.sql",
  "create_marketing_scoring.sql",
  "create_ml_webhook_log.sql",
  "create_modules_system.sql",
  "create_motor_automacao_financeira.sql",
  "create_motor_financeiro.sql",
  "create_multiempresa.sql",
  "create_obrigacoes_fiscais.sql",
  "create_orcamento.sql",
  "create_sac_conhecimento.sql",
  "create_sac_module.sql",
  "create_sac_filas_equipes.sql",
  "create_sac_qualidade.sql",
  "create_sac_sla.sql",
  "create_rentabilidade.sql",
  "create_sales_channels.sql",
  "create_scenarios.sql",
  "create_tesouraria.sql",
  "add_2fa.sql",
  "add_certificado_digital.sql",
  "add_crm_module.sql",
  "add_crm_task_notified.sql",
  "add_financial_events.sql",
  "add_integracao_ativa_flag.sql",
  "add_logistics_events.sql",
  "add_logistics_operation.sql",
  "add_moeda_tenants.sql",
  "add_password_reset.sql",
  "add_tenant_id_integrations.sql",
  "add_tenant_id_marketplace_orders.sql",
  "add_tenant_tipo_juridico.sql",
  "alter_fiscal_calculos_add_obrigacao.sql",
  "alter_modules_nativo.sql",
  "evolucao_contas_pagar_receber.sql",
  "fix_modulos_logistica_relatorios_financeiro.sql",
  "fix_user_tenants_empresa_padrao.sql",
  "merge_ecommerce_module.sql",
  "remove_atendimento_modulo_catalogo.sql",
  "remove_compras_modulo_catalogo.sql",
  "remove_fiscal_modulo_catalogo.sql"
)

$senhaSegura = Read-Host "Senha do Aiven (avnadmin)" -AsSecureString
$env:MYSQL_PWD = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($senhaSegura))

$ok = 0; $avisos = 0
foreach ($arquivo in $ordem) {
  $caminho = Join-Path $pasta $arquivo
  if (-not (Test-Path $caminho)) { Write-Host "FALTANDO  $arquivo" -ForegroundColor Red; continue }
  $sql = "SET FOREIGN_KEY_CHECKS=0; source " + ($caminho -replace '\\','/') + "; SET FOREIGN_KEY_CHECKS=1;"
  $saida = & $mysql -h $hostAiven -P $porta -u avnadmin --ssl-mode=REQUIRED --force --default-character-set=utf8mb4 $banco --execute=$sql 2>&1
  $erros = $saida | Where-Object { "$_" -match "^ERROR" -and "$_" -notmatch "Duplicate" }
  if ($erros) {
    Write-Host "ERRO      $arquivo" -ForegroundColor Red
    $erros | ForEach-Object { Write-Host "          $_" -ForegroundColor Red }
  } elseif ($saida | Where-Object { "$_" -match "Duplicate" }) {
    Write-Host "OK (ja existia em parte)  $arquivo" -ForegroundColor Yellow; $avisos++; $ok++
  } else {
    Write-Host "OK        $arquivo" -ForegroundColor Green; $ok++
  }
}

$total = & $mysql -h $hostAiven -P $porta -u avnadmin --ssl-mode=REQUIRED -N $banco --execute="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$banco';" 2>$null
Remove-Item Env:MYSQL_PWD
Write-Host ""
Write-Host "Tabelas no banco agora: $total" -ForegroundColor Cyan
Write-Host "Concluido: $ok de $($ordem.Count) arquivos rodados."
Read-Host "Aperte Enter para fechar"
