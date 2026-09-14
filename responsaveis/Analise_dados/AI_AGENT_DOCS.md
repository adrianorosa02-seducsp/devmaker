# Documentação do Backend (Diretório `Analise_dados`)

> [!IMPORTANT]
> **Para Agentes de IA:** Leia este documento para entender a estrutura, funcionamento e fluxo de dados do backend deste projeto. **Você deve atualizar este documento sempre que fizer alterações arquiteturais, adicionar novos endpoints ou modificar lógicas importantes.**

## 1. Visão Geral
A pasta `Analise_dados` contém o backend do projeto **Dashboard Inteligente de Aulas**.
O sistema tem duas responsabilidades principais:
1. **Pipeline de ETL (Extração de Dados):** Lida com o download e interpretação de um PDF contendo grades horárias, usando `pdfplumber` e `pandas`, para gerar um banco de dados SQLite (`aulas.sqlite`).
2. **Servidor API e Web (Flask):** Expõe os dados extraídos através de uma API RESTful para um painel web frontend, além de gerenciar operações CRUD sobre os horários.

## 2. Componentes Principais

### `gerar_banco_aulas.py` (Core / ETL)
Este é o script principal para gerar e manter a base de dados a partir do documento PDF.
- **`carregar_pdf(fonte)`**: Baixa (se URL) ou lê localmente o PDF da grade.
- **`normalizar_df_horarios(df)`** / **`split_and_clean_schedule_df(df_original)`**: Funções de tratamento com pandas que corrigem células agrupadas com `\n` e fatiam as tabelas do PDF identificando blocos por turmas (Ex: `1A`, `2B - DS`).
- **`obter_dfs_consolidados(pdf_url)`**: Orquestra a extração e consolida num único DataFrame formatado, agrupando os dados por turma.
- **`criar_banco_de_dados(db_filepath, consolidated_dfs)`**: Inicializa o banco `aulas.sqlite` e insere os registros limpos com colunas: `dia_semana`, `horario`, `turma`, `disciplina` e `professor`.
- **`get_dados_painel(db_filepath, data_str)`**: Função consumida pela API que lê o SQLite e monta um JSON estruturado formatado com a grade de um determinado dia da semana.

### `consultar_painel.py` (API Flask / Backend Web)
Arquivo que inicia o servidor HTTP e fornece a comunicação entre o front-end web e o SQLite.
**Endpoints da API:**
- `GET /` : Servidor de Arquivo Estático. Entrega a página `painel_aulas.html` (localizada no diretório raiz do projeto).
- `GET /api/status` : Health-check do servidor e do banco de dados.
- `GET /api/painel?data=<data>` : Retorna a grade do dia atual (ou o dia da data especificada, formatada para o Painel de Aulas). Ele se apoia na função `get_dados_painel` do ETL.
- `GET /api/aulas` : Retorna registros filtrados da tabela `aulas` (`dia_semana`, `turma`, `horario`, `busca`).
- `POST /api/aulas` : Criação de novo registro de horário.
- `PUT /api/aulas/<id>` : Atualização de um horário existente.
- `DELETE /api/aulas/<id>` : Remoção de um registro.

### Arquivos de Experimentação (`extrai_1.py`, `extrai_2.py`, `extrai_3.py`, `extrai_4.py`)
Estes são **scripts rascunho / experimentais** criados possivelmente em Jupyter Notebooks e exportados. Eles contêm versões fragmentadas do fluxo ETL atual. 
- *Ação recomendada:* A lógica central já está consolidada no arquivo `gerar_banco_aulas.py`. Não é necessário modificar esses arquivos para atualizar regras de negócios.

### `aulas.sqlite`
Banco de dados gerado pela aplicação, contendo apenas a tabela `aulas`. É sobrescrito/repopulado quando o script `gerar_banco_aulas.py` é rodado como entrypoint.

## 3. Fluxo de Dados e Dependências
1. `gerar_banco_aulas.py` lê um link do Google Drive (PDF) -> Converte p/ DataFrames (Pandas) -> Salva em `aulas.sqlite`.
2. `consultar_painel.py` escuta requisições na porta 5000.
3. Quando a rota `/api/painel` é chamada, ela usa a função de extração rápida `get_dados_painel` para montar um JSON limpo, enviando para o front-end.

## 4. Orientações para Desenvolvimento
- **Manutenção de Rotas:** Sempre adicione novas regras ao `consultar_painel.py` caso novas funcionalidades CRUD sejam necessárias.
- **Mudanças no Formato do PDF:** Caso a origem mude seu layout, modifique as regras regex e os limites das fatias (Ex: largura do DataFrame no `split_and_clean_schedule_df`) dentro de `gerar_banco_aulas.py`.
- **CORS:** O Flask está configurado usando `Flask-CORS` permitindo acesso de outras origens.
- Ao atualizar bibliotecas, as dependências principais envolvem `flask`, `flask-cors`, `pandas`, `pdfplumber`, `requests`.

---
*Ultima atualização do documento: 14/09/2026.*
