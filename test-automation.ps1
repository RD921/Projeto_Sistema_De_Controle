$base = "http://localhost:3000/api"

# 1. Login
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType "application/json" -Body (@{
  email = "rodrigo@email.com"
  senha = "NovaSenha123!"
} | ConvertTo-Json)
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }
Write-Host "Login OK, token obtido." -ForegroundColor Green

# 2. Criar automação
$auto = Invoke-RestMethod -Uri "$base/automations" -Method Post -Headers $headers -ContentType "application/json" -Body (@{
  name = "Teste Ponta a Ponta"
  description = "Valida http_request, switch, database e log juntos"
} | ConvertTo-Json)
$automationId = $auto.id
Write-Host "Automacao criada, id: $automationId" -ForegroundColor Green

# 3. Montar o workflow (nodes + edges)
$definicao = @{
  nodes = @(
    @{ node_id = "trigger1"; type = "manual_trigger"; label = "Inicio"; config = @{}; position_x = 0; position_y = 0 },
    @{ node_id = "db1"; type = "database"; label = "Buscar contas nao pagas"; config = @{
        operation = "select"; table = "financial_entries"; limit = 5
        filters = @(@{ field = "status"; operator = "not_equals"; value = "pago" })
      }; position_x = 200; position_y = 0 },
    @{ node_id = "switch1"; type = "switch"; label = "Tem dados?"; config = @{
        field = "{{`$json.count}}"; defaultBranch = "tem_dados"
        cases = @(@{ value = "0"; branch = "vazio" })
      }; position_x = 400; position_y = 0 },
    @{ node_id = "http1"; type = "http_request"; label = "Chamada externa teste"; config = @{
        method = "GET"; url = "https://httpbin.org/get"
      }; position_x = 600; position_y = 0 },
    @{ node_id = "log1"; type = "log"; label = "Log final"; config = @{
        message = "Teste concluido - status HTTP: {{`$json.status}}"
      }; position_x = 800; position_y = 0 }
  )
  edges = @(
    @{ source_node_id = "trigger1"; target_node_id = "db1"; source_handle = "default"; target_handle = "default" },
    @{ source_node_id = "db1"; target_node_id = "switch1"; source_handle = "default"; target_handle = "default" },
    @{ source_node_id = "switch1"; target_node_id = "http1"; source_handle = "tem_dados"; target_handle = "default" },
    @{ source_node_id = "http1"; target_node_id = "log1"; source_handle = "success"; target_handle = "default" }
  )
}
Invoke-RestMethod -Uri "$base/automations/$automationId/definicao" -Method Put -Headers $headers -ContentType "application/json" -Body ($definicao | ConvertTo-Json -Depth 10)
Write-Host "Definicao salva." -ForegroundColor Green

# 4. Ativar
Invoke-RestMethod -Uri "$base/automations/$automationId/activate" -Method Post -Headers $headers
Write-Host "Automacao ativada." -ForegroundColor Green

# 5. Executar manualmente
$exec = Invoke-RestMethod -Uri "$base/automations/$automationId/execute" -Method Post -Headers $headers -ContentType "application/json" -Body (@{ data = @{} } | ConvertTo-Json)
Write-Host "Execucao: $($exec.status) (id $($exec.executionId))" -ForegroundColor Yellow

# 6. Ver os logs detalhados dessa execucao
Start-Sleep -Seconds 1
$logs = Invoke-RestMethod -Uri "$base/automations/executions/$($exec.executionId)/logs" -Method Get -Headers $headers
$logs | Format-Table node_id, level, message, duration_ms -AutoSize