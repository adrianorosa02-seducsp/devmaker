import re

def split_and_clean_schedule_df(df_original):
    """Divide um DataFrame de horário em seções individuais (e.g., 1A, 1B, 1C) e as limpa,
    localizando dinamicamente as colunas que contêm esses identificadores de turma.
    Retorna uma lista de tuplas (identificador_turma, DataFrame_limpo)."""
    df = df_original.copy()
    all_cleaned_schedules = []

    if df.empty or df.iloc[0].empty:
        return all_cleaned_schedules # Retorna vazio se não houver dados

    # Regex para identificar turmas na primeira linha (e.g., '1A', '1B', '1C', '2A', '2B', '2C', '3A', '3B', '3C', '3D')
    # Atualizado para incluir padrões como '2B - DS' e '3A - ADM', e agora '3B -ADM' ou '3B-ADM'
    turma_pattern = re.compile(r'^\d[A-D](?: ?- ?[A-Z]+)?$')

    # Encontrar as colunas de início para cada turma na primeira linha
    turma_sections_info = [] # Armazena (identificador_turma, start_col_idx)

    for col_idx, value in enumerate(df.iloc[0]):
        if isinstance(value, str) and turma_pattern.match(value.strip()):
            turma_sections_info.append((value.strip(), col_idx))

    # Definir uma largura padrão para o bloco de horário de uma turma
    # (1 para identificador, 1 para horário, 5 para dias da semana = 7 colunas)
    SCHEDULE_BLOCK_WIDTH = 7

    # Processar cada seção de turma encontrada
    for turma_identifier, start_col_idx in turma_sections_info:
        end_col_idx = min(start_col_idx + SCHEDULE_BLOCK_WIDTH, df.shape[1])
        raw_df_turma = df.iloc[:, start_col_idx : end_col_idx].copy()

        # Certificar-se de que o DataFrame tem colunas suficientes para ser um horário válido
        # Deve ter pelo menos 7 colunas para o bloco completo (identificador + 6 colunas de dados)
        if raw_df_turma.shape[1] < SCHEDULE_BLOCK_WIDTH:
            # O bloco extraído está incompleto, pula este.
            continue

        # Remover a primeira linha (que contém o identificador da turma, e.g., '1A')
        df_section_temp = raw_df_turma.iloc[1:].reset_index(drop=True)

        # Remover a coluna que continha o identificador da turma (a primeira coluna do df_section_temp)
        if not df_section_temp.empty and df_section_temp.shape[1] > 0:
            column_to_drop = df_section_temp.columns[0]
            df_section_temp = df_section_temp.drop(columns=[column_to_drop])
        else:
            # Se após remover a primeira linha, o df está vazio ou não tem colunas, pula
            continue

        # Usar a primeira linha restante como cabeçalho
        if not df_section_temp.empty and df_section_temp.shape[0] > 0:
            header = df_section_temp.iloc[0]
            df_section_data = df_section_temp[1:].reset_index(drop=True)
            df_section_data.columns = header

            # Renomear a coluna com nome 'None' (ou string 'None') para 'Horário'
            # Isso é necessário porque a coluna de horário não tem um cabeçalho explícito no PDF
            if None in df_section_data.columns:
                df_section_data = df_section_data.rename(columns={None: 'Horário'})
            elif 'None' in df_section_data.columns: # Às vezes 'None' vem como uma string
                df_section_data = df_section_data.rename(columns={'None': 'Horário'})
        else:
            df_section_data = pd.DataFrame() # Nenhuma linha de dados após definir o cabeçalho

        # Limpar colunas e linhas totalmente vazias
        df_section_data.dropna(how='all', axis=1, inplace=True)
        df_section_data.dropna(how='all', axis=0, inplace=True)

        if not df_section_data.empty:
            all_cleaned_schedules.append((turma_identifier, df_section_data))

    return all_cleaned_schedules