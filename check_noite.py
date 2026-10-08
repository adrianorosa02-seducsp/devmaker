import requests
import json

url = "https://geduc.inetz.com.br/painel/dashboard/legacy?escola_id=c83b5925-3c67-43d7-8ccf-7b72ff4dd479"
try:
    response = requests.get(url, timeout=10)
    data = response.json()
    horarios = data.get('horarios', [])
    print("Total de horários:", len(horarios))
    
    night_classes_found = False
    for h in horarios:
        # Pega horários da noite (ex: 19:00 pra cima)
        hora = int(h['horario'].split(':')[0])
        if hora >= 18:
            night_classes_found = True
            print("------------------------")
            print("Horário NOITE:", h['horario'])
            print("Turmas extraídas:", list(h['turmas'].keys()))
    
    if not night_classes_found:
        print("Nenhum horário da noite encontrado no banco de dados!")
        
except Exception as e:
    print("Error:", e)
