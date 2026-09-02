# Identificar as colunas para cada horário
# Horário 1A: Colunas 0 a 6 (inclusive)
# Horário 1B: Colunas 8 a 14 (inclusive)

df_horario_1A = df_exemplo.iloc[:, 0:7].copy()
df_horario_1B = df_exemplo.iloc[:, 8:15].copy()

# Remover a primeira linha, que contém '1A' e '1B', pois já usamos para identificar os blocos.
df_horario_1A = df_horario_1A.iloc[1:].reset_index(drop=True)
df_horario_1B = df_horario_1B.iloc[1:].reset_index(drop=True)

# Remover a coluna 0 do df_horario_1A e coluna 8 do df_horario_1B, pois parecem ser apenas identificadores de bloco ('1A', '1B')
df_horario_1A = df_horario_1A.drop(columns=[0])
df_horario_1B = df_horario_1B.drop(columns=[8])

# A primeira linha restante agora contém os dias da semana e horários, que serão os novos cabeçalhos.
# Para df_horario_1A, o cabeçalho está na primeira linha (índice 0)
# Para df_horario_1B, o cabeçalho está na primeira linha (índice 0)

cabecalho_1A = df_horario_1A.iloc[0]
df_horario_1A = df_horario_1A[1:].reset_index(drop=True)
df_horario_1A.columns = cabecalho_1A

cabecalho_1B = df_horario_1B.iloc[0]
df_horario_1B = df_horario_1B[1:].reset_index(drop=True)
df_horario_1B.columns = cabecalho_1B

# Limpar colunas e linhas totalmente vazias que podem ter surgido da extração
df_horario_1A.dropna(how='all', axis=1, inplace=True)
df_horario_1A.dropna(how='all', axis=0, inplace=True)
df_horario_1B.dropna(how='all', axis=1, inplace=True)
df_horario_1B.dropna(how='all', axis=0, inplace=True)


print('DataFrame do Horário 1A:')
display(df_horario_1A)

print('\nDataFrame do Horário 1B:')
display(df_horario_1B)