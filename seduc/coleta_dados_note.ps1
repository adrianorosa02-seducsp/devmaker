# ==============================================================================
# SCRIPT DE AUDITORIA DE HARDWARE E ÚLTIMO USUÁRIO ANTERIOR
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

# 3. Identifica o usuário ATUAL para poder ignorá-lo na busca do anterior
$usuarioAtual = $cs.UserName
if ([string]::IsNullOrWhiteSpace($usuarioAtual)) {
    $usuarioAtual = $env:USERNAME
}
if ($usuarioAtual -match '\\') { $usuarioAtual = $usuarioAtual.Split('\')[1] }

# 4. Busca os perfis no Registro do Windows ordenados pelo último carregamento
$caminhoRegistro = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList"
$perfis = Get-ChildItem -Path $caminhoRegistro | ForEach-Object {
    $prop = Get-ItemProperty -Path $_.PsPath
    $profilePath = $prop.ProfileImagePath
    
    if ($profilePath) {
        $nomeConta = Split-Path -Path $profilePath -Leaf
        
        # Filtra apenas perfis de usuários reais
        if ($nomeConta -notmatch 'Public|Publico|systemprofile|LocalService|NetworkService') {
            
            # Converte a data de último carregamento do perfil (se existir)
            $dataLogin = $null
            if ($prop.LocalProfileLoadTimeHigh -and $prop.LocalProfileLoadTimeLow) {
                $fileTime = ([int64]$prop.LocalProfileLoadTimeHigh -shl 32) -bor [uint32]$prop.LocalProfileLoadTimeLow
                $dataLogin = [datetime]::FromFileTime($fileTime)
            } else {
                # Fallback: Data de modificação da pasta do perfil no disco
                if (Test-Path $profilePath) {
                    $dataLogin = (Get-Item $profilePath).LastWriteTime
                }
            }

            [PSCustomObject]@{
                Usuario   = $nomeConta
                DataLogin = $dataLogin
            }
        }
    }
} | Where-Object { $_.DataLogin -ne $null } | Sort-Object DataLogin -Descending

# 5. Filtra para pegar o primeiro perfil que NÃO SEJA o usuário atual
$ultimoUsuarioAnterior = $perfis | Where-Object { $_.Usuario -ne $usuarioAtual } | Select-Object -First 1

if ($ultimoUsuarioAnterior) {
    $nomeUltimoUsuario = $ultimoUsuarioAnterior.Usuario
    $dataUltimoLogin   = $ultimoUsuarioAnterior.DataLogin.ToString("dd/MM/yyyy HH:mm:ss")
} else {
    $nomeUltimoUsuario = "Nenhum usuário anterior encontrado"
    $dataUltimoLogin   = "N/A"
}

# 6. Monta o payload JSON completo
$payload = @{
    # Dados de Auditoria
    Equipamento           = $env:COMPUTERNAME
    Auditor               = $auditorAtual
    UsuarioAtual          = $usuarioAtual
    UltimoUsuarioAnterior = $nomeUltimoUsuario
    DataHoraLoginAnterior = $dataUltimoLogin

    # Dados do Hardware
    Fabricante            = $cs.Manufacturer
    Modelo                = $cs.Model
    Processador           = $proc.Name
    Memoria               = "$ramGB GB"
    RAM_GB                = $ramGB
    NumeroSerie           = $bios.SerialNumber
} | ConvertTo-Json -Depth 3

# 7. Endpoint do Webhook
$uriWebhook = "https://webhook.inetz.com.br/webhook/api_auditoria"

# 8. Envio dos dados via HTTP POST
try {
    Invoke-RestMethod -Uri $uriWebhook -Method Post -Body $payload -ContentType "application/json; charset=utf-8"
    Write-Host "`n[+] Dados de auditoria enviados com sucesso para o n8n!" -ForegroundColor Green
} catch {
    Write-Host "`n[-] Falha ao enviar dados para o webhook: $_" -ForegroundColor Red
}
