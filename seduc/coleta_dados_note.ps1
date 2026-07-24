# Envia os dados da auditoria para um webhook (ex: Power Automate, Google Sheets ou servidor próprio)
$dados = @{
    Equipamento   = $nomeMaquina
    Auditor       = $auditorAtual
    UltimoUsuario = $ultimoUsuarioAnterior.Usuario
    DataHoraLogin = $ultimoUsuarioAnterior.DataHora
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://n8n.inetz.com.br/webhook-test/api_auditoria" -Method Post -Body $dados -ContentType "application/json"
try {
     Invoke-RestMethod -Uri $uriWebhook -Method Post -Body $jsonBody -ContentType "application/json; charset=utf-8"
     Write-Host "`n[+] Dados de auditoria enviados com sucesso para o n8n!" -ForegroundColor Green
 } catch {
     Write-Host "`n[-] Falha ao enviar dados para o webhook: $_" -ForegroundColor Red
 }
