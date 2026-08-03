# ==============================================================================
# SCRIPT DE AUDITORIA - HARDWARE E ÚLTIMO USUÁRIO (SEM EVENT VIEWER)
# ==============================================================================

# 1. Definição do Auditor
if ([string]::IsNullOrWhiteSpace($auditorAtual)) {
    $auditorAtual = if ($env:USERNAME) { $env:USERNAME } else { "Sistema/Automático" }
}

# 2. Coleta das informações do sistema (WMI/CIM)
$cs   = Get-CimInstance -ClassName Win32_ComputerSystem
$bios = Get-CimInstance -ClassName Win32_Bios
$proc = Get-CimInstance -ClassName Win32_Processor

# Coleta memória RAM
$ramPentes = Get-CimInstance -ClassName Win32_PhysicalMemory
if ($ramPentes) {
    $ramSum = ($ramPentes | Measure-Object -Property Capacity -Sum).Sum
    $ramGB  = [math]::Round($ramSum / 1GB, 2)
} else {
    $ramGB  = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
}

# 3. Identifica o Usuário ATUAL para poder ignorá-lo na busca do anterior
$usuarioAtual = if ($env:USERNAME) { $env:USERNAME } else { $cs.UserName }
if ($usuarioAtual -match '\\') { $usuarioAtual = $usuarioAtual.Split('\')[1] }

# 4. Busca os perfis de usuários direto no disco (C:\Users) ordenados por modificação
$caminhoUsers = "C:\Users"
$ultimoAnteriorNome = "N/A"
$dataUltimoLogin    = "N/A"

if (Test-Path $caminhoUsers) {
    # Lista as pastas de perfil ignorando pastas padrão do sistema e o usuário atual
    $perfilAnterior = Get-ChildItem -Path $caminhoUsers -Directory | Where-Object {
        $_.Name -notmatch 'Public|Publico|Default|Default User|All Users|WDAGUtilityAccount|systemprofile|LocalService|NetworkService' -and
        $_.Name -ne $usuarioAtual
    } | Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if ($perfilAnterior) {
        $ultimoAnteriorNome = $perfilAnterior.Name
        $dataUltimoLogin    = $perfilAnterior.LastWriteTime.ToString("dd/MM/yyyy HH:mm:ss")
    }
}

# 5. Monta o payload JSON limpo
$payload = @{
    # Dados de Auditoria
    Equipamento           = $env:COMPUTERNAME
    Auditor               = $auditorAtual
    UsuarioAtual          = $usuarioAtual
    UltimoUsuarioAnterior = $ultimoAnteriorNome
    DataHoraLoginAnterior = $dataUltimoLogin

    # Dados do Hardware
    Fabricante            = $cs.Manufacturer
    Modelo                = $cs.Model
    Processador           = $proc.Name
    Memoria               = "$ramGB GB"
    RAM_GB                = $ramGB
    NumeroSerie           = $bios.SerialNumber
} | ConvertTo-Json -Depth 3

# 6. Endpoint do Webhook
$uriWebhook = "https://webhook.inetz.com.br/webhook/api_auditoria"
#$uriWebhook = "https://n8n.inetz.com.br/webhook-test/api_auditoria"

# 7. Envio dos dados via HTTP POST
try {
    Invoke-RestMethod -Uri $uriWebhook -Method Post -Body $payload -ContentType "application/json; charset=utf-8"
    Write-Host "`n[+] Dados de auditoria enviados com sucesso para o n8n!" -ForegroundColor Green
} catch {
    Write-Host "`n[-] Falha ao enviar dados para o webhook: $_" -ForegroundColor Red
}
