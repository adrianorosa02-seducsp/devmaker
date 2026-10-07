# ============================================================
# Projeto Dashbord inteligente de aulas
# Autor: Adriano Justino Rosa
# Data: 02/09/2026
# 1. Padrão de Turma: Agora detecta turmas como '2B - DS' ou '3A - ADM', mesmo com espaços
# 2. Consolidação Automática: Une dados de todas as páginas e tabelas em um único arquivo banco_aulas.sqlite
# 3. API Python: Disponibiliza as funções necessárias para integração com outros sistemas
# 4. Testes Integrados: Inclui scripts de teste para verificar o funcionamento do sistema.
# 5. Teste de Deploy:  Inclui scripts de teste para verificar o funcionamento do sistema.
# ============================================================


import re
import os
import json
from datetime import datetime
from io import BytesIO
import pandas as pd
import pdfplumber
import requests
from datetime import date


# ============================================================
# EXTRAÇÃO DE DADOS DO PDF
# ============================================================

def carregar_pdf(fonte):
    if fonte.startswith("http"):
        resposta = requests.get(fonte)
        return pdfplumber.open(BytesIO(resposta.content))
    return pdfplumber.open(fonte)

def normalizar_df_horarios(df):
    """Separa textos agrupados por quebra de linha (\\n) em linhas individuais no DataFrame."""
    df = df.fillna("")
    novas_linhas = []
    for idx, row in df.iterrows():
        celulas_divididas = [str(val).split("\n") for val in row]
        max_linhas = max(len(c) for c in celulas_divididas)
        for i in range(max_linhas):
            linha_normalizada = (
                c[i].strip() if i < len(c) else "" for c in celulas_divididas
            )
            novas_linhas.append(list(linha_normalizada))

    df_corrigido = pd.DataFrame(novas_linhas)
    df_corrigido = df_corrigido.replace(r"^\s*$", None, regex=True).dropna(how="all")
    return df_corrigido.reset_index(drop=True)

def split_and_clean_schedule_df(df_original):
    """Divide um DataFrame de horário em seções individuais e as limpa."""
    df = df_original.copy()
    all_cleaned_schedules = []

    if df.empty or df.iloc[0].empty:
        return all_cleaned_schedules

    turma_pattern = re.compile(r'^\d[A-D](?: ?- ?[A-Z]+)?$')
    turma_sections_info = []

    for col_idx, value in enumerate(df.iloc[0]):
        if isinstance(value, str) and turma_pattern.match(value.strip()):
            turma_sections_info.append((value.strip(), col_idx))

    SCHEDULE_BLOCK_WIDTH = 7

    for turma_identifier, start_col_idx in turma_sections_info:
        end_col_idx = min(start_col_idx + SCHEDULE_BLOCK_WIDTH, df.shape[1])
        raw_df_turma = df.iloc[:, start_col_idx : end_col_idx].copy()

        if raw_df_turma.shape[1] < SCHEDULE_BLOCK_WIDTH:
            continue

        df_section_temp = raw_df_turma.iloc[1:].reset_index(drop=True)

        if not df_section_temp.empty and df_section_temp.shape[1] > 0:
            column_to_drop = df_section_temp.columns[0]
            df_section_temp = df_section_temp.drop(columns=[column_to_drop])
        else:
            continue

        if not df_section_temp.empty and df_section_temp.shape[0] > 0:
            header = df_section_temp.iloc[0]
            df_section_data = df_section_temp[1:].reset_index(drop=True)
            df_section_data.columns = header

            if None in df_section_data.columns:
                df_section_data = df_section_data.rename(columns={None: 'Horário'})
            elif 'None' in df_section_data.columns:
                df_section_data = df_section_data.rename(columns={'None': 'Horário'})
        else:
            df_section_data = pd.DataFrame()

        df_section_data.dropna(how='all', axis=1, inplace=True)
        df_section_data.dropna(how='all', axis=0, inplace=True)

        if not df_section_data.empty:
            all_cleaned_schedules.append((turma_identifier, df_section_data))

    return all_cleaned_schedules

def extrair_horarios_pdf(pdf):
    dados_processados = []
    table_settings = {
        "vertical_strategy": "lines",
        "horizontal_strategy": "text",
        "snap_tolerance": 3,
        "join_tolerance": 3,
    }

    for idx, page in enumerate(pdf.pages, start=1):
        tabelas = page.extract_tables(table_settings)
        if not tabelas:
            tabelas = page.extract_tables()

        texto_pagina = page.extract_text() or ""
        turmas_encontradas = re.findall(r"\b(\d[A-D](?: ?- ?[A-Z]+)?)\b", texto_pagina)

        for t_idx, tabela in enumerate(tabelas, start=1):
            df = pd.DataFrame(tabela)
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

def obter_dfs_consolidados(pdf_url):
    """Orquestra a extração do PDF e retorna dicionário com DFs consolidados por turma."""
    pdf = carregar_pdf(pdf_url)
    relatorios = extrair_horarios_pdf(pdf)
    pdf.close()
    
    all_processed_schedules_by_turma = {}
    
    for report in relatorios:
        page_num = report['pagina']
        table_num = report['tabela_num']
        df_to_process = report['dataframe']

        if page_num in [1, 2]:
            if df_to_process.empty or df_to_process.shape[0] < 2 or df_to_process.shape[1] < 7:
                continue

            list_of_turma_dfs = split_and_clean_schedule_df(df_to_process)

            if not list_of_turma_dfs:
                continue

            for turma_id, cleaned_df in list_of_turma_dfs:
                if not cleaned_df.empty:
                    cleaned_df['Origem'] = f"Pagina_{page_num}_Tabela_{table_num}_Turma_{turma_id}"
                    
                    if turma_id not in all_processed_schedules_by_turma:
                        all_processed_schedules_by_turma[turma_id] = []
                    all_processed_schedules_by_turma[turma_id].append(cleaned_df)

    consolidated_dfs = {}
    for turma_id, list_of_dfs in all_processed_schedules_by_turma.items():
        if list_of_dfs:
            consolidated_df = pd.concat(list_of_dfs, ignore_index=True)
            consolidated_dfs[turma_id] = consolidated_df
            
    return consolidated_dfs

# ============================================================
# PREPARAÇÃO E ENVIO PARA API (POSTGRESQL)
# ============================================================

def formatar_payload_api(consolidated_dfs):
    # Extraímos todos os dias (Seg a Sex) e iteramos
    dias_banco = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
    aulas_extraidas = []
    
    for turma, df in consolidated_dfs.items():
        colunas_dias = [col for col in df.columns if col in dias_banco]
        if not colunas_dias:
            continue
            
        horario_col = 'Horário' if 'Horário' in df.columns else df.columns[0]
            
        subject_row = None
        for index, row in df.iterrows():
            if index % 2 == 0:
                subject_row = row
            else:
                teacher_row = row
                horario = str(subject_row[horario_col]).strip()
                if horario == 'None' or not horario:
                    continue
                    
                for dia in dias_banco:
                    if dia in subject_row and dia in teacher_row:
                        disciplina = str(subject_row[dia]).strip()
                        professor = str(teacher_row[dia]).strip()
                        
                        if disciplina and disciplina != 'None' and professor and professor != 'None':
                            aulas_extraidas.append({
                                "dia_semana": dia,
                                "horario": horario,
                                "turma": turma,
                                "disciplina": disciplina,
                                "professor": professor
                            })
                            
    return {"aulas": aulas_extraidas}

def enviar_para_api(payload, escola_id):
    """Envia os dados extraídos para o novo backend FastAPI"""
    url = f"https://geduc.inetz.com.br/escolas/{escola_id}/importar-horarios"
    
    print(f"\nEnviando {len(payload.get('aulas', []))} aulas para a API: {url}...")
    try:
        resposta = requests.post(url, json=payload)
        resposta.raise_for_status()
        print("✅ Importação concluída com sucesso no PostgreSQL!")
        print("Resposta do Servidor:", resposta.json())
        
    except requests.exceptions.RequestException as e:
        print("❌ Erro ao enviar para a API:", e)
        if hasattr(e, 'response') and e.response is not None:
            print("Detalhe do erro:", e.response.text)

if __name__ == "__main__":
    caminho_pdf = "https://drive.google.com/uc?export=download&id=1VXWQf8E4WMFwFNgPxbEs1R-YmGNgg4OP"
    ESCOLA_ID = "c83b5925-3c67-43d7-8ccf-7b72ff4dd479"
    
    print("Extraindo e processando PDF (isso pode levar alguns instantes)...")
    consolidated_dfs = obter_dfs_consolidados(caminho_pdf)
    print(f"Dados extraídos com sucesso. Turmas encontradas: {list(consolidated_dfs.keys())}")
    
    print("\nFormatando dados para envio...")
    payload = formatar_payload_api(consolidated_dfs)
    
    print("=== EXEMPLO DO PAYLOAD (Primeiras 2 aulas) ===")
    print(json.dumps({"aulas": payload["aulas"][:2]}, indent=4, ensure_ascii=False))
    
    # Envia os dados para a API (FastAPI -> Postgres)
    enviar_para_api(payload, ESCOLA_ID)
