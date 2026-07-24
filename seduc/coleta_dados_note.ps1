# 1. Coleta das informações do sistema (WMI/CIM)
$cs     = Get-CimInstance -ClassName Win32_ComputerSystem
$bios   = Get-CimInstance -ClassName Win32_Bios
$proc   = Get-CimInstance -ClassName Win32_Processor
$ram    = Get-CimInstance -ClassName Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum

# Converte a memória RAM total para GB
$ramGB  = [math]::Round($ram.Sum / 1GB, 2)

# Formata a Data e Hora do Login (Se for um objeto DateTime válido)
$dataHoraFormatada = if ($ultimoUsuarioAnterior.DataHora -is [datetime]) {
    $ultimoUsuarioAnterior.DataHora.ToString("dd/MM/yyyy HH:mm:ss")
} else {
    Get-Date $ultimoUsuarioAnterior.DataHora -Format "dd/MM/yyyy HH:mm:ss"
}

# 2. Monta o payload completo
$payload = @{
    # Dados de Auditoria
    Equipamento   = $nomeMaquina
    Auditor       = $auditorAtual
    UltimoUsuario = $ultimoUsuarioAnterior.Usuario
    DataHoraLogin = $dataHoraFormatada

    # Dados do Hardware
    Fabricante    = $cs.Manufacturer
    Modelo        = $cs.Model
    Processador   = $proc.Name
    Memoria       = "$ramGB GB"
    RAM_GB        = $ramGB
    NumeroSerie   = $bios.SerialNumber
} | ConvertTo-Json -Depth 3

# 3. Endpoint do Webhook
$uriWebhook = "https://n8n.inetz.com.br/webhook-test/api_auditoria"

# 4. Envio dos dados com tratamento de erro
try {
    Invoke-RestMethod -Uri $uriWebhook -Method Post -Body $payload -ContentType "application/json; charset=utf-8"
    Write-Host "`n[+] Dados de auditoria enviados com sucesso para o n8n!" -ForegroundColor Green
} catch {
    Write-Host "`n[-] Falha ao enviar dados para o webhook: $_" -ForegroundColor Red
}
