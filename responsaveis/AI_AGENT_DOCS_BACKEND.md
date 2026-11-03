# DevProvas Backend: Manual para Agentes de IA

Este documento serve como um guia estruturado para que Agentes de IA possam compreender o domínio do projeto DevProvas, suas tabelas no banco de dados e endpoints existentes, facilitando a integração de novas tabelas e funcionalidades ao backend.

> [!NOTE]
> O projeto utiliza **FastAPI** como framework web e **SQLAlchemy 2.0** como ORM para comunicação com o **PostgreSQL**. As migrações são gerenciadas pelo **Alembic**.

## 1. Arquitetura e Padrões de Integração

Ao adicionar novas funcionalidades ou tabelas, o Agente de IA deve seguir o padrão estrutural existente:
- **Modelos (SQLAlchemy):** Devem herdar de `Base` (de `app.core.database`) e ser definidos no arquivo `app/models/models.py`.
- **Chaves Primárias:** O padrão do projeto é utilizar `UUID` (gerado automaticamente via `uuid.uuid4`).
- **Campos de Auditoria:** Novas tabelas normalmente devem incluir `created_at` e `updated_at` (quando aplicável), usando `DateTime(timezone=True)`.
- **Relacionamentos:** Use `relationship()` do SQLAlchemy e configure as `ForeignKeys` corretamente, prestando atenção em exclusões em cascata (`ondelete="CASCADE"` ou `"SET NULL"`).
- **Endpoints:** Novos endpoints devem ser adicionados (ou roteados) via `app/main.py` usando decorators do FastAPI (`@app.get`, `@app.post`, etc.).
- **Migrações:** Após alterar `models.py`, é necessário gerar e aplicar a migração via Alembic:
  - `alembic revision --autogenerate -m "descricao_da_mudanca"`
  - `alembic upgrade head`

---

## 2. Dicionário de Dados (Tabelas Atuais)

Abaixo estão descritas todas as tabelas atualmente mapeadas no SQLAlchemy (`app/models/models.py`).

### 2.1 `escolas`
Armazena os dados das instituições de ensino.
- **Campos Principais:** `id` (UUID), `nome` (String), `endereco` (Text), `telefone` (String), `email` (String).
- **Relacionamentos:** `usuarios`, `turmas`, `disciplinas`.

### 2.2 `usuarios`
Armazena os usuários do sistema (alunos, professores, administradores).
- **Campos Principais:** `id` (UUID), `nome` (String), `email` (String único), `senha_hash` (String), `tipo` (String: aluno/professor/admin), `escola_id` (FK), `ativo` (Boolean).
- **Relacionamentos:** `escola`, `turmas` (como professor), `provas` (criadas), `respostas`, `matriculas`.

### 2.3 `turmas`
Representa as turmas de uma escola.
- **Campos Principais:** `id` (UUID), `nome` (String), `serie` (String), `turno` (String), `escola_id` (FK), `professor_id` (FK).
- **Relacionamentos:** `escola`, `professor`, `matriculas`, `provas_turmas`.

### 2.4 `disciplinas`
Armazena as matérias/disciplinas oferecidas nas escolas.
- **Campos Principais:** `id` (UUID), `nome` (String), `codigo` (String único), `escola_id` (FK).
- **Relacionamentos:** `escola`, `provas`.

### 2.5 `matriculas`
Tabela associativa que vincula um aluno (`usuarios`) a uma `turma`.
- **Campos Principais:** `id` (UUID), `aluno_id` (FK), `turma_id` (FK), `data_matricula` (Date).
- **Unique Constraint:** Um aluno só pode estar matriculado uma vez na mesma turma.

### 2.6 `provas`
Representa uma avaliação/prova criada por um professor.
- **Campos Principais:** `id` (UUID), `titulo` (String), `descricao` (Text), `disciplina_id` (FK), `professor_id` (FK), `data_aplicacao` (Date), `duracao_minutos` (Integer), `peso` (Decimal).
- **Relacionamentos:** `disciplina`, `professor`, `questoes`, `provas_turmas`.

### 2.7 `provas_turmas`
Tabela associativa que agenda uma `prova` para uma `turma` específica.
- **Campos Principais:** `id` (UUID), `prova_id` (FK), `turma_id` (FK), `data_agendada` (DateTime).
- **Unique Constraint:** Uma mesma prova não pode ser agendada duplicadamente para a mesma turma.

### 2.8 `questoes`
Armazena as questões de uma determinada prova.
- **Campos Principais:** `id` (UUID), `prova_id` (FK), `enunciado` (Text), `tipo` (String: ex: multipla_escolha, dissertativa), `pontos` (Decimal), `ordem` (Integer).
- **Relacionamentos:** `prova`, `alternativas`, `respostas`.

### 2.9 `alternativas`
Armazena as opções de resposta para questões de múltipla escolha.
- **Campos Principais:** `id` (UUID), `questao_id` (FK), `texto` (Text), `correta` (Boolean), `letra` (Char: A, B, C...).
- **Relacionamentos:** `questao`, `respostas`.

### 2.10 `respostas`
Armazena as respostas submetidas pelos alunos para as questões das provas.
- **Campos Principais:** `id` (UUID), `questao_id` (FK), `aluno_id` (FK), `alternativa_id` (FK, nulo se dissertativa), `texto_dissertativo` (Text), `nota` (Decimal), `corrigida` (Boolean).
- **Relacionamentos:** `questao`, `aluno`, `alternativa`.

---

## 3. Endpoints da API (Atuais)

Os endpoints estão definidos no arquivo principal `app/main.py`. A API foi configurada com o título "DevProvas API".

- **`GET /`**
  - **Descrição:** Rota raiz para verificação rápida.
  - **Retorno:** `{"status": "ok"}`

- **`GET /health`**
  - **Descrição:** Endpoint de Health Check (verificação de saúde) da aplicação.
  - **Comportamento:** Tenta estabelecer uma conexão rápida com o banco de dados usando o SQLAlchemy.
  - **Retorno (Sucesso):** `{"status": "healthy", "database": "connected"}`
  - **Retorno (Falha):** `{"status": "unhealthy", "database": "disconnected"}` (quando ocorre `OperationalError`).

---

## 4. Passos para Integrar Nova Funcionalidade

1. **Adicionar/Modificar Modelos:** Insira a classe em `app/models/models.py`.
2. **Gerar Migration:** Execute `alembic revision --autogenerate -m "sua_descricao"`.
3. **Aplicar Migration:** Execute `alembic upgrade head`.
4. **Adicionar Schemas (Pydantic):** Crie os modelos de validação de dados em `app/schemas` (se existirem) para Request/Response.
5. **Adicionar Controllers/Services (Opcional):** Se o projeto usar uma camada de regras de negócio, adicione a lógica lá.
6. **Criar Rotas/Endpoints:** Adicione o novo endpoint em `app/main.py` (ou em roteadores específicos do FastAPI (`APIRouter`) se a estrutura for expandida).
7. **Testar Localmente:** Inicie o servidor via `uvicorn app.main:app --reload` e verifique pelo Swagger UI em `http://localhost:8000/docs`.
