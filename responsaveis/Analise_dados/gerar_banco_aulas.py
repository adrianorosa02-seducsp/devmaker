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

import sqlite3
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
# BANCO DE DADOS E PAINEL
# ============================================================

def criar_banco_de_dados(db_filepath, consolidated_dfs):
    conn = sqlite3.connect(db_filepath)
    cursor = conn.cursor()
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS aulas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dia_semana TEXT,
        horario TEXT,
        turma TEXT,
        disciplina TEXT,
        professor TEXT
    )
    ''')
    
    cursor.execute('DELETE FROM aulas') # Clear existing data
    
    dias_banco = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']
    
    for turma, df in consolidated_dfs.items():
        # df tem colunas: Horário, Seg, Ter, Qua, Qui, Sex, Origem
        # Iteramos a cada 2 linhas (disciplina, depois professor)
        
        # Primeiro, garantimos que temos as colunas dos dias
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
                    
                for i, dia in enumerate(dias_banco):
                    if dia in subject_row and dia in teacher_row:
                        disciplina = str(subject_row[dia]).strip()
                        professor = str(teacher_row[dia]).strip()
                        
                        if disciplina and disciplina != 'None' and professor and professor != 'None':
                            cursor.execute('''
                            INSERT INTO aulas (dia_semana, horario, turma, disciplina, professor)
                            VALUES (?, ?, ?, ?, ?)
                            ''', (dia, horario, turma, disciplina, professor))
                            
    conn.commit()
    conn.close()

def obter_dia_semana(data_obj):
    dias = {0: 'Seg', 1: 'Ter', 2: 'Qua', 3: 'Qui', 4: 'Sex', 5: 'Sab', 6: 'Dom'}
    return dias.get(data_obj.weekday(), '')

def get_dados_painel(db_filepath, data_str=None):
    if not data_str:
        data_obj = datetime.now()
    else:
        try:
            if '/' in data_str:
                data_obj = datetime.strptime(data_str, '%d/%m/%Y')
            else:
                data_obj = datetime.strptime(data_str, '%Y-%m-%d')
        except ValueError:
            data_obj = datetime.now()
            
    dia_semana_str = obter_dia_semana(data_obj)
    
    if dia_semana_str not in ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']:
        return {
            "data": data_obj.strftime('%d/%m/%Y'),
            "dia_semana": dia_semana_str,
            "horarios": []
        }
        
    conn = sqlite3.connect(db_filepath)
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT horario, turma, disciplina, professor 
        FROM aulas 
        WHERE dia_semana = ?
        ORDER BY horario, turma
    ''', (dia_semana_str,))
    
    rows = cursor.fetchall()
    conn.close()
    
    horarios_dict = {}
    for row in rows:
        horario, turma, disp, prof = row
        if horario not in horarios_dict:
            horarios_dict[horario] = {}
        
        horarios_dict[horario][turma] = {
            "disciplina": disp,
            "professor": prof
        }
        
    horarios_list = []
    for horario in sorted(horarios_dict.keys()):
        horarios_list.append({
            "horario": horario,
            "turmas": horarios_dict[horario]
        })
        
    resultado = {
        "data": data_obj.strftime('%d/%m/%Y'),
        "dia_semana": dia_semana_str,
        "horarios": horarios_list
    }
    
    return resultado

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_file = os.path.join(base_dir, 'aulas.sqlite')
    caminho_pdf = "https://drive.google.com/uc?export=download&id=1tQVv5nWGp37Vb5V0LfJ-R2zK_tZ1bVfF"
    
    print("Extraindo e processando PDF (isso pode levar alguns instantes)...")
    consolidated_dfs = obter_dfs_consolidados(caminho_pdf)
    print(f"Dados extraídos com sucesso. Turmas encontradas: {list(consolidated_dfs.keys())}")
    
    print("\nGerando banco de dados SQLite...")
    criar_banco_de_dados(db_file, consolidated_dfs)
    print("Banco de dados criado e populado!")
    # Pega a data atual e formata como 'DD/MM/AAAA'
    data_atual = date.today().strftime('%d/%m/%Y')    
    #print("\nTestando painel para o dia 02/09/2026 (Quarta-feira)...")
    dados_painel = get_dados_painel(db_file, data_atual)
    
    print("=== DADOS RETORNADOS (JSON) ===")
    print(json.dumps(dados_painel, indent=4, ensure_ascii=False))
