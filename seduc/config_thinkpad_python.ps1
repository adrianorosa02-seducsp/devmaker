# ================================
# Instalar Python sem administrador (Windows 11)
# ================================

# Defina a versão desejada do Python
$pythonVersion = "3.12.2"

# URL da versão embutida (embeddable) do Python para Windows 64 bits
$pythonUrl = "https://www.python.org/ftp/python/$pythonVersion/python-$pythonVersion-embed-amd64.zip"

# Pasta de destino no perfil do usuário
$installDir = "$env:USERPROFILE\Python$pythonVersion"
$installDir = "C:\Program Files\Python$pythonVersion" 

# Criar pasta de instalação
if (-Not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir | Out-Null
}

# Caminho do arquivo ZIP temporário
$zipPath = "$env:TEMP\python_embed.zip"

Write-Host "Baixando Python $pythonVersion..."
Invoke-WebRequest -Uri $pythonUrl -OutFile $zipPath

Write-Host "Extraindo arquivos..."
Expand-Archive -Path $zipPath -DestinationPath $installDir -Force

# Remover arquivo ZIP temporário
Remove-Item $zipPath

# Adicionar Python ao PATH do usuário (sem admin)
$envPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($envPath -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$envPath;$installDir", "User")
}

Write-Host "Python $pythonVersion instalado em: $installDir"
Write-Host "Feche e reabra o PowerShell para usar o comando 'python'."