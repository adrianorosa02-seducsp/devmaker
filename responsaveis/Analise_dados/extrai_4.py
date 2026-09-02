all_processed_schedules_by_turma = {}

for report in relatorios:
    page_num = report['pagina']
    table_num = report['tabela_num']
    df_to_process = report['dataframe']

    # Processar apenas as tabelas das páginas 1 e 2, conforme solicitado pelo usuário.
    # O campo 'turmas' no report é para a página inteira, então precisamos inspecionar o próprio dataframe.
    if page_num in [1, 2]:

        # Debugging: Print the first row of the DataFrame to see what identifiers are present
        print(f"\nDEBUG: Pagina {page_num}, Tabela {table_num} - Primeira linha do DF: {df_to_process.iloc[0].tolist()}")

        # Verificar se o dataframe está vazio ou é muito pequeno para conter qualquer bloco de horário.
        # Um bloco de horário é esperado ter pelo menos 7 colunas (identificador + horário + 5 dias) e 2 linhas (cabeçalho + dados).
        if df_to_process.empty or df_to_process.shape[0] < 2 or df_to_process.shape[1] < 7:
            print(f"\nPulando processamento para Página {page_num}, Tabela {table_num} - DataFrame vazio ou pequeno demais.")
            continue

        # Obter todos os horários limpos deste dataframe
        list_of_turma_dfs = split_and_clean_schedule_df(df_to_process)

        if not list_of_turma_dfs:
            print(f"\nPulando processamento para Página {page_num}, Tabela {table_num} - Nenhuma turma identificada neste DataFrame.")
            continue

        for turma_id, cleaned_df in list_of_turma_dfs:
            if not cleaned_df.empty:
                # Adicionar coluna 'Origem' para rastrear de onde este horário veio
                cleaned_df['Origem'] = f"Pagina_{page_num}_Tabela_{table_num}_Turma_{turma_id}"

                # Armazenar o DataFrame limpo no dicionário, usando o turma_id como chave
                if turma_id not in all_processed_schedules_by_turma:
                    all_processed_schedules_by_turma[turma_id] = []
                all_processed_schedules_by_turma[turma_id].append(cleaned_df)

                print(f"\n--- Horário {turma_id} - Pagina_{page_num}_Tabela_{table_num} ---")
                display(cleaned_df)
            else:
                print(f"\n--- Horário {turma_id} - Pagina_{page_num}_Tabela_{table_num} (Vazio após limpeza) ---")
    else:
        print(f"\nPulando processamento para Página {page_num}, Tabela {table_num} - Não está entre as páginas 1 ou 2.")


print("\n--- Sumário de DataFrames Processados por Turma ---")
for turma_id, list_of_dfs in all_processed_schedules_by_turma.items():
    print(f"Turma {turma_id}: {len(list_of_dfs)} DataFrames")

# Consolidação final
print("\n### DataFrames Consolidados por Turma ###")
consolidated_dfs = {}
for turma_id, list_of_dfs in all_processed_schedules_by_turma.items():
    if list_of_dfs:
        consolidated_df = pd.concat(list_of_dfs, ignore_index=True)
        consolidated_dfs[turma_id] = consolidated_df
        print(f"\n--- DataFrame Consolidado: Turma {turma_id} ---")
        display(consolidated_df)
        print(f"Total de linhas na Turma {turma_id}: {consolidated_df.shape[0]}")
    else:
        print(f"\n--- Nenhum dado para consolidar para a Turma {turma_id} ---")