# ================================
# Instalar Python sem administrador (Windows 11)
# ================================

# Defina a versão desejada do Python
$pythonVersion = "3.13.0"

# URL da versão embutida (embeddable) do Python para Windows 64 bits
$pythonUrl = "https://www.python.org/ftp/python/$pythonVersion/python-$pythonVersion-embed-amd64.zip"

# Pasta de destino no perfil do usuário
$installDir = "$env:USERPROFILE\Python$pythonVersion"
#$installDir = "C:\Program Files\Python313" 

#Instalação GH



## 4. Tenta salvar permanentemente no nível de USUÁRIO (Não precisa de Admin)
#[Environment]::SetEnvironmentVariable("Path", $CURRENT_PATH, "User")

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

# Variavel onde estará o GH (Deve ser ajustada conforme infraestrutura)
#$GH_PATH     = "C:\Users\Docker\AppData\Local\github\" # Onde você descompactou o gh.exe

# Copia o arquivo gh_2.88.1_windows_amd64.zip do git para posterior descompactação
# .zip é obrigatorio pelas politicas de segurança do github/wget
wget -O $env:USERPROFILE+"/ghzip.zip"+ "https://github.com/adrianorosa02-seducsp/versionamento/raw/refs/heads/main/gh_2.88.1_windows_amd64.zip"
# 1. Define o caminho do arquivo
$zipPath = "$env:USERPROFILE\ghzip.zip"
$destPath = "$env:USERPROFILE\gh\"
Invoke-WebRequest -Uri "https://github.com/adrianorosa02-seducsp/versionamento/raw/refs/heads/main/gh_2.88.1_windows_amd64.zip" -OutFile "$env:USERPROFILE\ghzip.zip"

Expand-Archive -Path $zipPath -DestinationPath $destPath -Force
Remove-Item -Path $zipPath -Force

# Adicionar Python ao PATH do usuário (sem admin)
$envPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($envPath -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$envPath;$installDir", "User")
}

Write-Host "Python $pythonVersion instalado em: $installDir"
Write-Host "Feche e reabra o PowerShell para usar o comando 'python'."
