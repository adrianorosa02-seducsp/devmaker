# ==============================================================================
# SCRIPT DE AUDITORIA DE HARDWARE E LOGINS
# ==============================================================================

# 1. Coleta das informações do sistema (WMI/CIM)
$cs   = Get-CimInstance -ClassName Win32_ComputerSystem
$bios = Get-CimInstance -ClassName Win32_Bios
$proc = Get-CimInstance -ClassName Win32_Processor

# Coleta os pentes de RAM físicos
$ramPentes = Get-CimInstance -ClassName Win32_PhysicalMemory

# Garante o cálculo correto caso haja 1 ou mais pentes de RAM
if ($ramPentes) {
    $ramSum = ($ramPentes | Measure-Object -Property Capacity -Sum).Sum
    $ramGB  = [math]::Round($ramSum / 1GB, 2)
} else {
    # Fallback usando a memória total do sistema caso a leitura dos pentes falhe
    $ramGB  = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
}

# 2. Busca os últimos 3 logins no Event Log do Windows (Event ID 4624)
$ultimosLogins = @()

try {
    # Busca até 500 eventos de login no log de segurança para filtrar logins reais de usuários
    $eventosLogin = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        Id      = 4624
    } -MaxEvents 500 -ErrorAction Stop | Where-Object {
        $logonType = $_.Properties[8].Value
        # Filtra por logon Interativo Local (Tipo 2) ou RDP (Tipo 10)
        # Ignora contas do sistema, serviços e nomes de máquinas ($)
        ($logonType -eq 2 -or $logonType -eq 10) -and 
        ($_.Properties[5].Value -notlike '*$') -and 
        ($_.Properties[5].Value -ne 'SYSTEM') -and
        ($_.Properties[5].Value -ne 'UMFD-0') -and
        ($_.Properties[5].Value -ne 'DWM-1')
    } | Select-Object -First 3

    # Mapeia os eventos encontrados
    $ultimosLogins = foreach ($evento in $eventosLogin) {
        @{
            Usuario  = $evento.Properties[5].Value
            Dominio  = $evento.Properties[6].Value
            Tipo     = if ($evento.Properties[8].Value -eq 2) { "Interativo (Local)" } else { "RDP (Remoto)" }
            DataHora = $evento.TimeCreated.ToString("dd/MM/yyyy HH:mm:ss")
        }
    }
} catch {
    # Caso ocorra falha de permissão (script não rodando como Admin) ou Log desativado
    Write-Warning "Não foi possível obter o histórico de logins do Event Viewer: $_"
}

# 3. Tratamento e validação do último login individual (compatibilidade retroativa)
$dataHoraFormatada = if ([string]::IsNullOrWhiteSpace($ultimoUsuarioAnterior.DataHora)) {
    if ($ultimosLogins.Count -gt 0) { $ultimosLogins[0].DataHora } else { "N/A" }
} elseif ($ultimoUsuarioAnterior.DataHora -is [datetime]) {
    $ultimoUsuarioAnterior.DataHora.ToString("dd/MM/yyyy HH:mm:ss")
} else {
    (Get-Date $ultimoUsuarioAnterior.DataHora).ToString("dd/MM/yyyy HH:mm:ss")
}

$ultimoUsuarioNome = if ([string]::IsNullOrWhiteSpace($ultimoUsuarioAnterior.Usuario)) {
    if ($ultimosLogins.Count -gt 0) { $ultimosLogins[0].Usuario } else { "Desconhecido" }
} else {
    $ultimoUsuarioAnterior.Usuario
}

# 4. Monta o payload JSON completo
$payload = @{
    # Dados de Auditoria
    Equipamento   = $env:COMPUTERNAME
    Auditor       = $auditorAtual
    UltimoUsuario = $ultimoUsuarioNome
    DataHoraLogin = $dataHoraFormatada
    UltimosLogins = $ultimosLogins  # Array com os últimos 3 logins detalhados

    # Dados do Hardware
    Fabricante    = $cs.Manufacturer
    Modelo        = $cs.Model
    Processador   = $proc.Name
    Memoria       = "$ramGB GB"
    RAM_GB        = $ramGB
    NumeroSerie   = $bios.SerialNumber
} | ConvertTo-Json -Depth 4

# 5. Endpoint do Webhook (Comentário corrigido com #)
# $uriWebhook = "https://n8n.inetz.com.br/webhook-test/api_auditoria"
$uriWebhook = "https://webhook.inetz.com.br/webhook/api_auditoria"

# 6. Envio dos dados via HTTP POST com tratamento de erros
try {
    Invoke-RestMethod -Uri $uriWebhook -Method Post -Body $payload -ContentType "application/json; charset=utf-8"
    Write-Host "`n[+] Dados de auditoria enviados com sucesso para o n8n!" -ForegroundColor Green
} catch {
    Write-Host "`n[-] Falha ao enviar dados para o webhook: $_" -ForegroundColor Red
}
