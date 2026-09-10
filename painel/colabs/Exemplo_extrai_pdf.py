from re import split
import requests
from io import BytesIO
import pdfplumber
import pandas as pd
import matplotlib.pyplot as plt
import re

%matplotlib inline

# ============================================================
# ABRIR PDF
# ============================================================

url = "https://drive.google.com/uc?export=download&id=1AfZ2UMTkuvpbG6ie3T_cIiu9iOknpnVx"

dados = BytesIO(requests.get(url).content)

rel = pdfplumber.open(dados)

# ============================================================
# LOCALIZAR AS PÁGINAS QUE DEVEM SER PROCESSADAS
# ============================================================

def localizar_paginas(pdf, texto_procurado):

    paginas = []

    for numero_pagina, page in enumerate(pdf.pages, start=1):

        texto = page.extract_text()

        if texto and texto_procurado.lower() in texto.lower():
            paginas.append(numero_pagina)

    return paginas

# ============================================================
# EXTRAÇÕES
# ============================================================

def extrair_AE(page, numero_pagina):

    print(f"\n========== AE - Página {numero_pagina} ==========")
    print(f"Tamanho da página: {page.width} x {page.height}")

    print(f"\n========== Página {numero_pagina} ==========")

    # --------------------------------------------------------
    # AE
    # --------------------------------------------------------

    area_AE = page.crop((
        106.30,
        63.78,
        651.97,
        120.47
    ))

    texto_AE = area_AE.extract_text()

    # --------------------------------------------------------
    # HP
    # --------------------------------------------------------

    area_HP = page.crop((
        651.97,
        70.87,
        765.35,
        120.47
    ))

    texto_HP = area_HP.extract_text()

    match = re.search(r'EF\d{2}[A-Z]{2}', texto_HP)

    prefixo_AE = match.group()

    id_AE = prefixo_AE + texto_AE[:4]

    AE_descritor = texto_AE.split("-", 1)[1].strip()

    print("\n--- AE -------------------------")
    print("ID AE........:", id_AE)
    print("Prefixo......:", prefixo_AE)
    print("Código AE....:", texto_AE[:4])
    print("Descrição....:", AE_descritor)

    print("\n--- HP -------------------------")
    print(texto_HP)

    # --------------------------------------------------------
    # HABILIDADES RELACIONADAS
    # --------------------------------------------------------

    area_HR = page.crop((
        63.78,
        134.65,
        226.77,
        255.12
    ))

    texto_HR = area_HR.extract_text()

    print("\n--- HR -------------------------")
    print(texto_HR)

    # --------------------------------------------------------
    # DE OLHO
    # --------------------------------------------------------

    area_DEOLHO = page.crop((
        226.78,
        134.65,
        765.35,
        269.29
    ))

    texto_DEOLHO = area_DEOLHO.extract_text()

    print("\n--- DE OLHO -------------------------")
    print(texto_DEOLHO)

    # --------------------------------------------------------
    # TABELA
    # --------------------------------------------------------

    tabelas = page.extract_tables()

    if tabelas:

        for i, tabela in enumerate(tabelas, start=1):
            print(f"\nTabela {i}")

        df = pd.DataFrame(tabelas[0])

        display(df)

    # --------------------------------------------------------
    # RETORNO
    # --------------------------------------------------------

    return {
        "id_AE": id_AE,
        "prefixo_AE": prefixo_AE,
        "texto_AE": texto_AE,
        "AE_descritor": AE_descritor,
        "texto_HP": texto_HP,
        "texto_HR": texto_HR,
        "texto_DEOLHO": texto_DEOLHO
    }


def extrair_Escopo(page, numero_pagina):

    print(f"\n========== Escopo - Página {numero_pagina} ==========")
    print(f"Tamanho da página: {page.width} x {page.height}")

    print(f"\n========== Página {numero_pagina} ==========")

    # --------------------------------------------------------
    # AE
    # --------------------------------------------------------

    bimestre = page.crop((
        7.09,
        63.78,
        297.64,
        92.13
    ))

    texto_bimestre = bimestre.extract_text()



    # --------------------------------------------------------
    # TABELA
    # --------------------------------------------------------

    tabela_ES = page.extract_tables()

    if tabela_ES:

        for i, tabela in enumerate(tabela_ES, start=1):
            print(f"\nTabela {i}")

        df = pd.DataFrame(tabela_ES[0])

        display(df)

    # --------------------------------------------------------
    # RETORNO
    # --------------------------------------------------------

    return {
        "bimestre": bimestre,
        "tabela": tabela_ES

    }



# ============================================================
# PROCESSAR UMA PÁGINA
# ============================================================

def processar_pagina(page, numero_pagina):

    print("=" * 60)
    print(f"Página {numero_pagina}")

    dados = extrair_AE(page, numero_pagina)
    dados = extrair_Escopo(page, numero_pagina)
# ============================================================
# PROCESSAR TODO O DOCUMENTO
# ============================================================

def executar_processamento(pdf):

    paginas = localizar_paginas(pdf, "Habilidade priorizada:")

    print(f"Foram encontradas {len(paginas)} páginas.\n")

    for numero_pagina in paginas:

        page = pdf.pages[numero_pagina - 1]

        processar_pagina(page, numero_pagina)

    # Última página das Aprendizagens Essenciais
    ultima_pagina_ae = paginas[-1]

    # Primeira página válida do Escopo-Sequência
    inicio_escopo = ultima_pagina_ae + 2

    # Localiza todas as ocorrências de "Escopo-Sequência"
    paginas = localizar_paginas(pdf, "Escopo-Sequência")

    # Remove as ocorrências do índice (sumário)
    paginas = [p for p in paginas if p >= inicio_escopo]



    print(f"Foram encontradas {len(paginas)} páginas do Escopo-Sequência.")

    print(paginas)

# ============================================================
# EXECUÇÃO
# ============================================================

executar_processamento(rel).