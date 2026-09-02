from io import BytesIO
import re
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
# PROCESSAR E CORRIGIR CELULAS COM \n
# ============================================================
def normalizar_df_horarios(df):
    """Separa textos agrupados por quebra de linha (\n) em linhas individuais no DataFrame."""
    # Substitui None por string vazia
    df = df.fillna("")

    # Transforma cada linha do DF: onde houver \n, divide em lista e expande
    novas_linhas = []
    for idx, row in df.iterrows():
        # Divide o texto de cada célula pelas quebras de linha
        celulas_divididas = [str(val).split("\n") for val in row]

        # Descobre qual célula gerou o maior número de sub-linhas
        max_linhas = max(len(c) for c in celulas_divididas)

        # Preenche com string vazia as colunas menores para alinhar todas
        for i in range(max_linhas):
            linha_normalizada = (
                c[i].strip() if i < len(c) else "" for c in celulas_divididas
            )
            novas_linhas.append(list(linha_normalizada))

    df_corrigido = pd.DataFrame(novas_linhas)

    # Remove linhas totalmente vazias resultantes do processo
    df_corrigido = df_corrigido.replace(r"^\s*$", None, regex=True).dropna(
        how="all"
    )
    return df_corrigido.reset_index(drop=True)


# ============================================================
# EXTRAÇÃO DE HORÁRIOS E TURMAS
# ============================================================
def extrair_horarios_pdf(pdf):
    dados_processados = []

    # Configurações estratégicas para o pdfplumber ler tabelas por alinhamento de texto
    table_settings = {
        "vertical_strategy": "lines",
        "horizontal_strategy": "text",  # Força reconhecer cada linha de texto (horário) como uma linha da tabela
        "snap_tolerance": 3,
        "join_tolerance": 3,
    }

    for idx, page in enumerate(pdf.pages, start=1):
        # Tenta extrair com a estratégia avançada
        tabelas = page.extract_tables(table_settings)

        # Se não encontrar por texto, tenta a padrão
        if not tabelas:
            tabelas = page.extract_tables()

        texto_pagina = page.extract_text() or ""
        # Regex atualizada para capturar padrões como '3B - ADM' ou '3B -ADM'
        turmas_encontradas = re.findall(
            r"\b(\d[A-D](?: ?- ?[A-Z]+)?)\b", texto_pagina
        )

        # Debugging: Print full text and detected turmas for page 2
        if idx == 2:
            print(f"\nDEBUG (extrair_horarios_pdf) - Página {idx} Texto Completo:\n{texto_pagina}")
            print(f"DEBUG (extrair_horarios_pdf) - Página {idx} Turmas encontradas pelo re.findall: {turmas_encontradas}")

        for t_idx, tabela in enumerate(tabelas, start=1):
            df = pd.DataFrame(tabela)

            # Aplica a normalização para desmembrar os horários em linhas 2, 3, 4, 5, 6, 7...
            df_estruturado = normalizar_df_horarios(df)

            dados_processados.append(
                {
                    "pagina": idx,
                    "tabela_num": t_idx,
                    "dataframe": df_estruturado,
                    "turmas": list(set(turmas_encontradas)),
                }
            )

    return dados_processados


# ============================================================
# EXECUÇÃO
# ============================================================
caminho_pdf = "https://drive.google.com/uc?export=download&id=1tQVv5nWGp37Vb5V0LfJ-R2zK_tZ1bVfF"

pdf = carregar_pdf(caminho_pdf)

try:
    relatorios = extrair_horarios_pdf(pdf)

    if relatorios:
        print("--- Tabela Corrigida com Horários Separados por Linhas ---")
        df_exemplo = relatorios[0]["dataframe"]
        display(df_exemplo)

finally:
    pdf.close()