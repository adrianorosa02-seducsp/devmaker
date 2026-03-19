# 1. Defina os caminhos das suas ferramentas (Ajuste conforme sua realidade)
$PYTHON_PATH = "C:\Users\arosa725\AppData\Local\Programs\Python\Python311"
$GH_PATH     = "C:\Users\arosa725\Tools\gh_bin\bin" # Onde você descompactou o gh.exe

# 2. Captura o PATH atual para não apagar o que já existe
$CURRENT_PATH = [Environment]::GetEnvironmentVariable("Path", "User")

# 3. Adiciona os novos caminhos se eles ainda não estiverem lá
$NEW_PATHS = @($PYTHON_PATH, "$PYTHON_PATH\Scripts", $GH_PATH)

foreach ($PATH in $NEW_PATHS) {
    if ($CURRENT_PATH -notlike "*$PATH*") {
        $CURRENT_PATH = "$PATH;$CURRENT_PATH"
        Write-Host "✅ Adicionando ao PATH: $PATH" -ForegroundColor Green
    }
}

# 4. Tenta salvar permanentemente no nível de USUÁRIO (Não precisa de Admin)
[Environment]::SetEnvironmentVariable("Path", $CURRENT_PATH, "User")

Write-Host "`n🚀 Ambiente configurado! Reinicie o terminal para aplicar." -ForegroundColor Cyan