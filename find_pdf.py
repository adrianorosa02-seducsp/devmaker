import re
from io import BytesIO
import requests
import pdfplumber

url = "https://geduc.inetz.com.br/escolas/c83b5925-3c67-43d7-8ccf-7b72ff4dd479/importar-horarios"
# Wait, I don't know the Google Drive URL directly. But I can query the DB to get it.
# Actually, the python backend extrator logic uses the URL from the DB.
# Let's query the API to get the PDF URL.
# Wait, the frontend doesn't have an endpoint to GET the PDF URL, it only PUTs it.

# Let's look inside `gerar_banco_aulas.py` for the PDF URL!
with open(r'c:\Users\AdrianoJustinoRosa\projetos\devmaker\responsaveis\Analise_dados\gerar_banco_aulas.py', 'r', encoding='utf-8') as f:
    for line in f:
        if 'fonte_dados' in line and 'http' in line:
            print("Found URL line:", line.strip())

