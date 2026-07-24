try {
     Invoke-RestMethod -Uri $uriWebhook -Method Post -Body $jsonBody -ContentType "application/json; charset=utf-8"
     Write-Host "`n[+] Dados de auditoria enviados com sucesso para o n8n!" -ForegroundColor Green
 } catch {
     Write-Host "`n[-] Falha ao enviar dados para o webhook: $_" -ForegroundColor Red
 }
