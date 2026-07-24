# 1. Monta o objeto e converte para JSON com suporte a caracteres especiais
$payload = @{
    Equipamento   = $nomeMaquina
    Auditor       = $auditorAtual
    UltimoUsuario = $ultimoUsuarioAnterior.Usuario
    DataHoraLogin = $ultimoUsuarioAnterior.DataHora
} | ConvertTo-Json -Depth 3

# 2. Define a URL do Webhook
$uriWebhook = "https://n8n.inetz.com.br/webhook-test/api_auditoria"

# 3. Tenta enviar os dados com tratamento de exceção
try {
    Invoke-RestMethod -Uri $uriWebhook -Method Post -Body $payload -ContentType "application/json; charset=utf-8"
    Write-Host "`n[+] Dados de auditoria enviados com sucesso para o n8n!" -ForegroundColor Green
} catch {
    Write-Host "`n[-] Falha ao enviar dados para o webhook: $_" -ForegroundColor Red
}
