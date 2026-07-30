# 1. Coleta das informações do sistema (WMI/CIM)
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

# 2. Busca os últimos 3 logins no Event Viewer
try {
    $eventosLogin = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        Id      = 4624
    } -MaxEvents 500 -ErrorAction Stop | Where-Object {
        $logonType = $_.Properties[8].Value
        ($logonType -eq 2 -or $logonType -eq 10) -and 
        ($_.Properties[5].Value -notlike '*$') -and 
        ($_.Properties[5].Value -ne 'SYSTEM')
    } | Select-Object -First 3

    $ultimosLogins = foreach ($evento in $eventosLogin) {
        @{
            Usuario  = $evento.Properties[5].Value
            Dominio  = $evento.Properties[6].Value
            Tipo     = if ($evento.Properties[8].Value -eq 2) { "Interativo (Local)" } else { "RDP (Remoto)" }
            DataHora = $evento.TimeCreated.ToString("dd/MM/yyyy HH:mm:ss")
        }
    }
} catch {
    # Caso ocorra erro de permissão ou o log esteja desativado
    $ultimosLogins = @()
}

# 3. Monta o payload completo
$payload = @{
    # Dados de Auditoria
    Equipamento   = $env:COMPUTERNAME
    Auditor       = $auditorAtual
    UltimosLogins = $ultimosLogins  # Envia a lista com os 3 últimos logins

    # Dados do Hardware
    Fabricante    = $cs.Manufacturer
    Modelo        = $cs.Model
    Processador   = $proc.Name
    Memoria       = "$ramGB GB"
    RAM_GB        = $ramGB
    NumeroSerie   = $bios.SerialNumber
} | ConvertTo-Json -Depth 4  # Aumentado o Depth para suportar o array aninhado

# 4. Endpoint do Webhook
$uriWebhook = "https://webhook.inetz.com.br/webhook/api_auditoria"

# 5. Envio dos dados com tratamento de erro
try {
    Invoke-RestMethod -Uri $uriWebhook -Method Post -Body $payload -ContentType "application/json; charset=utf-8"
    Write-Host "`n[+] Dados de auditoria enviados com sucesso para o n8n!" -ForegroundColor Green
} catch {
    Write-Host "`n[-] Falha ao enviar dados para o webhook: $_" -ForegroundColor Red
}
