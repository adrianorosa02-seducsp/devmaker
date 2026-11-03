# Documentação dos Endpoints do Painel (Backend FastAPI)

Esta documentação detalha as rotas do módulo `painel` e a lógica de extração que estão rodando no repositório de backend (`devprovas`). O Frontend (Painel Inteligente) consome ativamente algumas dessas rotas para exibir e gerenciar dados.

## 1. Importação Automatizada de PDF (`/escolas/{escola_id}/importar-horarios`)
Toda a lógica de extração (ETL) que costumava rodar em scripts Python separados foi incorporada diretamente no FastAPI.
A rota `POST /escolas/{escola_id}/importar-horarios` funciona da seguinte forma:
- **Não recebe nenhum payload (JSON) no corpo da requisição.**
- Ela consulta a tabela `ConfiguracaoImportacaoHorarios` para obter a **URL do PDF** (Google Drive) vinculada àquela escola.
- O servidor faz o download silencioso do PDF, roda a varredura (usando `pdfplumber` e `pandas`), limpa a base atual de horários brutos (`HorarioAulaExtrator`) para aquela escola e salva os novos.

> **Importante:** Se o painel não estiver renderizando alguns horários (ex: aulas da tarde), é porque o link salvo no banco de dados do servidor está apontando para o PDF errado (ex: PDF que só contém turmas da manhã). **Basta atualizar a URL da Fonte no backend e acionar este endpoint novamente.**

---

## 2. Endpoints do Módulo Painel (`/painel/...`)
Estes são os endpoints de leitura e gerenciamento disponíveis no arquivo `app/routers/painel.py` do projeto backend.

### Rota Legacy (Consumida pelo Painel Frontend)
- **`GET /painel/dashboard/legacy`**
  - **Parâmetros:** `escola_id`, `data` (opcional).
  - **O que faz:** Lê os registros da tabela extratora (`HorarioAulaExtrator`) para o dia da semana vigente, os agrupa por horário e turma, e retorna a estrutura exata que o `painel_aulas.js` exige para montar a grade interativa (com o design de cartões).

### Rotas de Gerenciamento do Painel (CRUD)
O backend foi arquitetado para suportar uma área administrativa completa. As seguintes rotas estão disponíveis:

- **Configurações Gerais (`/painel/configuracoes`)**
  - `GET`, `POST`, `PUT` para gerenciar configurações master do painel.

- **Fontes de Grade (`/painel/fontes`)**
  - `GET`, `POST`: Onde se configuram as URLs originais (Google Drive, por exemplo) para a importação de horários.

- **Salas e Plataformas (`/painel/salas`, `/painel/plataformas`)**
  - `GET`, `POST`: Cadastro de salas físicas e plataformas digitais onde as aulas podem acontecer.

- **Painel de Recados/Mensagens (`/painel/mensagens`)**
  - `GET`, `POST`: Permite cadastrar alertas com datas de início e fim. O endpoint de leitura retorna de forma inteligente apenas as mensagens ativas e no prazo de exibição correto.

- **Horários Consolidados (`/painel/horarios`)**
  - `GET`, `POST`: Permite criar e ler horários fixos diretamente na estrutura relacional oficial (tabela `HorarioAula`), de forma distinta dos dados brutos do extrator.

- **Dashboard Oficial (`/painel/dashboard`)**
  - **O Futuro do Frontend:** Este endpoint unifica tudo (turmas, salas, professores, disciplinas) com base na tabela relacional oficial, calculando em tempo real se a aula está "em andamento", "próxima" ou "concluída". Foi projetado para substituir a rota `/legacy`.
