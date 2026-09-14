from io import BytesIO
import re
import matplotlib.pyplot as plt
import pandas as pd
import pdfplumber
import requests

# ============================================================
# CARREGAR O PDF (URL ou Arquivo Local)
# ============================================================
def carregar_pdf(fonte):
    if fonte.startswith("http"):
        resposta = requests.get(fonte)
        return pdfplumber.open(BytesIO(resposta.content))
    return pdfplumber.open(fonte)


# ============================================================
# EXTRAÇÃO DE HORÁRIOS E TURMAS
# ============================================================
def extrair_horarios_pdf(pdf):
    dados_processados = []

    for idx, page in enumerate(pdf.pages, start=1):
        # Extrai todas as tabelas encontradas na página
        tabelas = page.extract_tables()
        texto_pagina = page.extract_text() or ""

        # Identifica turmas presentes na página através do texto extraído
        turmas_encontradas = re.findall(
            r"\b(1[A-C]|2[A-C](?:-[A-Z]+)?|3[A-D](?:-[A-Z]+)?)\b", texto_pagina
        )

        print(
            f"Página {idx}: Encontradas {len(tabelas)} tabelas. Turmas detectadas: {set(turmas_encontradas)}"
        )

        for t_idx, tabela in enumerate(tabelas, start=1):
            # Converter a tabela extraída em DataFrame do Pandas
            df = pd.DataFrame(tabela)

            # Limpeza inicial de linhas/colunas totalmente vazias
            df.dropna(how="all", inplace=True)
            df.dropna(how="all", axis=1, inplace=True)

            dados_processados.append(
                {
                    "pagina": idx,
                    "tabela_num": t_idx,
                    "dataframe": df,
                    "turmas": list(set(turmas_encontradas)),
                }
            )

    return dados_processados


# ============================================================
# DICIONÁRIO DE DISCIPLINAS (LEGENDA EXTRAÍDA DO PDF)
# ============================================================
def extrair_legenda_disciplinas(pdf):
    """Extrai a tabela de legenda de siglas para nomes completos presente nas últimas páginas."""
    legenda = {}
    for page in pdf.pages:
        tabelas = page.extract_tables()
        for tabela in tabelas:
            for linha in tabela:
                # Procura por linhas do tipo: [ABREVIATURA, NOME]
                if (
                    len(linha) >= 2
                    and linha[0]
                    and linha[1]
                    and linha[0] != "ABREVIATURA"
                ):
                    sigla = str(linha[0]).strip()
                    nome = str(linha[1]).strip()
                    if len(sigla) <= 5:  # Padrão de siglas curtas
                        legenda[sigla] = nome
    return legenda


# ============================================================
# EXECUÇÃO E CONSOLIDAÇÃO DOS DADOS
# ============================================================

# Insira a URL do Google Drive ou o caminho local do arquivo aqui:
caminho_pdf = "https://drive.google.com/uc?export=download&id=1tQVv5nWGp37Vb5V0LfJ-R2zK_tZ1bVfF"

# Usamos carregar_pdf() em vez de pdfplumber.open() direto para baixar URLs
pdf = carregar_pdf(caminho_pdf)

try:
    # 1. Extrai a legenda de matérias
    dicionario_disciplinas = extrair_legenda_disciplinas(pdf)
    print(f"Legenda Mapeada: {len(dicionario_disciplinas)} disciplinas.\n")

    # 2. Extrai os dados das tabelas de horários
    relatorios = extrair_horarios_pdf(pdf)

    # Exemplo: Exibir o DataFrame estruturado da primeira tabela da Página 1
    if relatorios:
        print("\n--- Exemplo de Tabela Extraída (Página 1) ---")
        df_exemplo = relatorios[0]["dataframe"]
        display(df_exemplo)

finally:
    # Garante que o arquivo PDF seja fechado ao terminar
    pdf.close()