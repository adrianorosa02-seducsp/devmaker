Write-Host "`Iniciando definicoes de Variaveis" -ForegroundColor Cyan
# 1. Defina os caminhos das suas ferramentas (Ajuste conforme sua realidade)

$PYTHON_PATH = "C:\Program Files\Python313\python.exe"
$GH_PATH     = "C:\Users\Docker\AppData\Local\github\" # Onde você descompactou o gh.exe

# 2. Captura o PATH atual para não apagar o que já existe
$CURRENT_PATH = [Environment]::GetEnvironmentVariable("Path", "User")
echo $CURRENT_PATH
$env:CURRENT_PATH
## 3. Adiciona os novos caminhos se eles ainda não estiverem lá
#$NEW_PATHS = @($PYTHON_PATH, "$PYTHON_PATH\Scripts", $GH_PATH)

#foreach ($PATH in $NEW_PATHS) {
#    if ($CURRENT_PATH -notlike "*$PATH*") {
#        $CURRENT_PATH = "$PATH;$CURRENT_PATH"
#        Write-Host "✅ Adicionando ao PATH: $PATH" -ForegroundColor Green
#    }
#}

## 4. Tenta salvar permanentemente no nível de USUÁRIO (Não precisa de Admin)
#[Environment]::SetEnvironmentVariable("Path", $CURRENT_PATH, "User")

Write-Host "`n🚀 Ambiente configurado! Reinicie o terminal para aplicar." -ForegroundColor Cyan


## Laboratorio realizado em sala de aula: Reginado juntamnete com o
## Aluno Straitto
# Variavel onde estará o python (Deve ser ajustada conforme infraestrutura)
#$PYTHON_PATH = "C:\Users\Docker\AppData\Local\Python\pythoncore-3.14-64\"
# Variavel onde estará o GH (Deve ser ajustada conforme infraestrutura)
#$GH_PATH     = "C:\Users\Docker\AppData\Local\github\" # Onde você descompactou o gh.exe

# Copia o arquivo gh_2.88.1_windows_amd64.zip do git para posterior descompactação
# .zip é obrigatorio pelas politicas de segurança do github/wget
#wget -O $env:USERPROFILE+"/ghzip.zip"+ "https://github.com/adrianorosa02-seducsp/versionamento/raw/refs/heads/main/gh_2.88.1_windows_amd64.zip"
# 1. Define o caminho do arquivo
$zipPath = "$env:USERPROFILE\ghzip.zip"
$destPath = "$env:USERPROFILE\gh\"
Invoke-WebRequest -Uri "https://github.com/adrianorosa02-seducsp/versionamento/raw/refs/heads/main/gh_2.88.1_windows_amd64.zip" -OutFile "$env:USERPROFILE\ghzip.zip"

Expand-Archive -Path $zipPath -DestinationPath $destPath -Force
Remove-Item -Path $zipPath -Force

Write-Host "Instalação concluída e arquivos temporários removidos!" -ForegroundColor Green
# 1. Define o caminho da pasta bin
$ghBinPath = "$env:USERPROFILE\gh\bin"

# 2. Captura o PATH atual do Usuário (não o do Sistema, por segurança)
$oldPath = [Environment]::GetEnvironmentVariable("Path", "User")

# 3. Verifica se o caminho já existe no PATH para não duplicar
if ($oldPath -notlike "*$ghBinPath*") {
    $newPath = "$oldPath;$ghBinPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Sucesso! O PATH foi atualizado." -ForegroundColor Green
} else {
    Write-Host "O caminho já consta no PATH." -ForegroundColor Yellow
}

# Define os caminhos reais (Base e Scripts)
$pythonHome = "C:\Program Files\Python313\"
$pythonScripts = "$pythonHome\Scripts"

# Captura o PATH atual do Usuário
$oldPath = [Environment]::GetEnvironmentVariable("Path", "User")

# Monta o novo PATH colocando o Python NO INÍCIO (Prioridade total)
# Isso garante que o Windows encontre este Python antes dos links da AppData/Local/Microsoft/WindowsApps
$newPath = "$pythonHome;$pythonScripts;$oldPath"

# Aplica permanentemente no Registro do Windows
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")

# Atualiza a sessão atual do terminal
$env:Path = [Environment]::GetEnvironmentVariable("Path", "User")

Write-Host "Sucesso! Python 3.14 e Scripts priorizados no PATH." -ForegroundColor Green


$env:Path = [Environment]::GetEnvironmentVariable("Path", "User")
#cd ..
#rm *.zip
#[Environment]::GetEnvironmentVariable("Path", "User") + ";C:\Program Files\Python313"
#[Environment]::SetEnvironmentVariable(
#    "Path", 
#    $env:Path +  ";C:\Program Files\Python313", 
#    [EnvironmentVariableTarget]::User
#)
