Write-Host "`Iniciando definicoes de Variaveis" -ForegroundColor Cyan
# 1. Defina os caminhos das suas ferramentas (Ajuste conforme sua realidade)

$PYTHON_PATH = "C:\Users\Docker\AppData\Local\Python\pythoncore-3.14-64\"
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
$PYTHON_PATH = "C:\Users\Docker\AppData\Local\Python\pythoncore-3.14-64\"
# Variavel onde estará o GH (Deve ser ajustada conforme infraestrutura)
$GH_PATH     = "C:\Users\Docker\AppData\Local\github\" # Onde você descompactou o gh.exe

# Copia o arquivo gh_2.88.1_windows_amd64.zip do git para posterior descompactação
# .zip é obrigatorio pelas politicas de segurança do github/wget
#wget -O $env:USERPROFILE+"/ghzip.zip"+ "https://github.com/adrianorosa02-seducsp/versionamento/raw/refs/heads/main/gh_2.88.1_windows_amd64.zip"
Invoke-WebRequest -Uri "https://github.com/adrianorosa02-seducsp/versionamento/raw/refs/heads/main/gh_2.88.1_windows_amd64.zip" -OutFile "$env:USERPROFILE\ghzip.zip"
#Expand-Archive -Path $env:USERPROFILE+"/ghzip.zip  -DestinationPath "+ .$env:USERPROFILE+"/gh/"
#cd ..
#rm *.zip
#[Environment]::GetEnvironmentVariable("Path", "User") + ";C:\Program Files\Python313"
#[Environment]::SetEnvironmentVariable(
#    "Path", 
#    $env:Path +  ";C:\Program Files\Python313", 
#    [EnvironmentVariableTarget]::User
#)