import requests
import json

# ============================================================
# SCRIPT DE ATUALIZAÇÃO DA GRADE DE AULAS
# ============================================================
# Este script foi simplificado pois o backend (FastAPI) assumiu a responsabilidade 
# de ler o PDF e fazer a extração dos dados (ETL).
# A função deste script agora é apenas "Dar o Comando" para o servidor.

ESCOLA_ID = "c83b5925-3c67-43d7-8ccf-7b72ff4dd479"
URL_BASE = "https://geduc.inetz.com.br"
# Caminho público do PDF no Google Drive
CAMINHO_PDF = "https://drive.google.com/uc?export=download&id=1VXWQf8E4WMFwFNgPxbEs1R-YmGNgg4OP"

def atualizar_banco_de_dados():
    print(f"Passo 1: Atualizando a URL do PDF no banco de dados do servidor...")
    url_config = f"{URL_BASE}/escolas/{ESCOLA_ID}/configuracao-importacao"
    payload_config = {"fonte_dados": CAMINHO_PDF}
    
    try:
        # 1. Atualizamos o link
        res_config = requests.put(url_config, json=payload_config)
        res_config.raise_for_status()
        print("Link atualizado com sucesso!")
        
        print(f"\nPasso 2: Acionando o servidor para baixar o PDF e processar as tabelas...")
        url_importar = f"{URL_BASE}/escolas/{ESCOLA_ID}/importar-horarios"
        
        # 2. Acionamos a importação
        res_import = requests.post(url_importar)
        res_import.raise_for_status()
        
        print("Grade importada e atualizada no painel de alunos!")
        print("Resposta do Servidor:", res_import.json())
        
    except requests.exceptions.RequestException as e:
        print("Ocorreu um erro na comunicacao com o servidor.")
        print(e)
        if hasattr(e, 'response') and e.response is not None:
            print("Detalhe do erro:", e.response.text)

if __name__ == "__main__":
    atualizar_banco_de_dados()
