import requests
import json

url = "https://geduc.inetz.com.br/painel/dashboard/legacy?escola_id=c83b5925-3c67-43d7-8ccf-7b72ff4dd479"
try:
    response = requests.get(url, timeout=10)
    data = response.json()
    horarios = data.get('horarios', [])
    print("Total de horários:", len(horarios))
    for h in horarios:
        if h['horario'] not in ['07:00', '07:50', '08:40', '09:50', '10:40', '11:30']:
            print("------------------------")
            print("Horário Tarde/Noite:", h['horario'])
            print("Turmas:", list(h['turmas'].keys())[:5], "...") # Mostra as 5 primeiras turmas
            
            # Mostra o conteúdo de uma das turmas
            if h['turmas']:
                first_turma = list(h['turmas'].keys())[0]
                print(f"Conteúdo de {first_turma}:", h['turmas'][first_turma])
            break
except Exception as e:
    print("Error:", e)
