# MANUAL DE ENDPOINTS DA API (DEVPROVAS)
> Este documento foi estruturado especificamente para ser interpretado por Agentes de Inteligência Artificial (LLMs). Ele descreve a arquitetura da API, os tipos primitivos, os relacionamentos entre entidades e a especificação detalhada de todos os endpoints disponíveis.

---

## 1. INSTRUÇÕES DO SISTEMA PARA O AGENTE
1. **Base URL:** A API está hospedada localmente no endereço padrão `http://localhost:8000`. Todas as requisições devem usar esse prefixo, a menos que uma variável de ambiente `DEVPROVAS_BASE_URL` esteja definida.
2. **Headers Globais:**
   - Requisições que enviam dados no corpo (`POST`, `PUT`) devem incluir o header:
     `Content-Type: application/json`
   - Rotas protegidas (embora a segurança seja implementada conceitualmente, consulte os endpoints) requerem autenticação por Token JWT Bearer enviado no header:
     `Authorization: Bearer <seu_access_token>`
3. **Formato de Identificadores:** Todos os identificadores de entidades primárias (`id`) são UUIDs padrão versão 4 (ex: `123e4567-e89b-12d3-a456-426614174000`), com exceção de `AulaConteudo` que usa uma string personalizada `id_aula` limitada a 50 caracteres.
4. **Tipagem Decimal:** Campos monetários ou de notas/pesos (`peso`, `pontos`, `nota`) são representados como números decimais com no máximo 5 dígitos e 2 casas decimais (ex: `10.00`, `1.50`).
5. **Tipagem Temporal:** 
   - Datas usam o formato `YYYY-MM-DD` (ex: `2026-07-02`).
   - Carimbos de data/hora (timestamps) usam o padrão ISO 8601 UTC (ex: `2026-07-02T11:32:00Z`).

---

## 2. RELACIONAMENTOS E REGRAS DE NEGÓCIO CRÍTICAS
- **Escola (Escola):** Entidade base global. Muitos recursos pertencem a uma escola (usuários, disciplinas, turmas, professores).
- **Usuário (Usuario) & Professor (Professor):**
  - O usuário possui três perfis possíveis (`tipo`): `"admin"`, `"professor"`, `"aluno"`.
  - Para criar um `Professor`, você deve **primeiro** criar um `Usuario` com `tipo: "professor"`. Em seguida, chame `POST /professores/` passando o `usuario_id` gerado. Não é permitido criar perfil de professor para usuários do tipo `"aluno"` ou `"admin"`.
  - Cada usuário pode ter no máximo **um** perfil de professor (relação 1:1).
- **Turma (Turma):** Vincula-se a uma `Escola` e a um `Professor` (opcionalmente).
- **Prova (Prova):** Vincula-se a um `Professor` e a uma `Disciplina`.
- **Questão (Questao):** Sempre pertence a uma `Prova`. Possui um `tipo` que deve ser `"multipla_escolha"`, `"dissertativa"` ou `"verdadeiro_falso"`.
- **Resposta (Resposta):**
  - **Apenas usuários do tipo `"aluno"` podem registrar respostas.** O backend valida se o `aluno_id` pertence a um usuário do tipo `"aluno"`.
  - Se a questão for de múltipla escolha ou verdadeiro/falso, o campo `alternativa_id` deve apontar para uma alternativa válida da questão. Se for dissertativa, o aluno deve responder no campo `texto_dissertativo`.

---

## 3. ESPECIFICAÇÕES DOS ENDPOINTS

### 3.1. Autenticação (`/auth`)

#### `POST /auth/login`
- **Descrição:** Autentica um usuário ativo e retorna tokens de acesso e refresh.
- **Corpo da Requisição (`LoginRequest`):**
  ```json
  {
    "email": "string (email válido)",
    "senha": "string (mínimo de 8 caracteres)"
  }
  ```
- **Resposta de Sucesso (200 OK - `TokenResponse`):**
  ```json
  {
    "access_token": "string (JWT)",
    "refresh_token": "string (JWT)",
    "token_type": "bearer",
    "expires_in": 3600
  }
  ```
- **Respostas de Erro:**
  - `401 Unauthorized`: `"Email ou senha inválidos."`
  - `403 Forbidden`: `"Usuário inativo."`

#### `POST /auth/refresh`
- **Descrição:** Renova o token de acesso expirado usando um refresh token válido.
- **Corpo da Requisição (`RefreshTokenRequest`):**
  ```json
  {
    "refresh_token": "string (mínimo de 1 caractere)"
  }
  ```
- **Resposta de Sucesso (200 OK - `TokenResponse`):**
  *(Mesma estrutura do `/auth/login`)*
- **Respostas de Erro:**
  - `401 Unauthorized`: Token inválido, expirado ou formato incorreto.
  - `403 Forbidden`: Usuário vinculado ao token está inativo.

---

### 3.2. Usuários (`/usuarios`)

#### `POST /usuarios/`
- **Descrição:** Cria um novo usuário. A senha fornecida é criptografada automaticamente (bcrypt).
- **Corpo da Requisição (`UsuarioCreate`):**
  ```json
  {
    "nome": "string (máximo 255)",
    "email": "string (email válido, único)",
    "tipo": "admin | professor | aluno",
    "escola_id": "string (UUID, opcional)",
    "ativo": true,
    "senha": "string (mínimo de 8 caracteres)"
  }
  ```
- **Resposta de Sucesso (201 Created - `UsuarioRead`):**
  ```json
  {
    "id": "string (UUID)",
    "nome": "string",
    "email": "string",
    "tipo": "admin | professor | aluno",
    "escola_id": "string (UUID) | null",
    "ativo": true,
    "created_at": "string (ISO 8601)",
    "updated_at": "string (ISO 8601)"
  }
  ```

#### `GET /usuarios/`
- **Descrição:** Retorna a lista de todos os usuários.
- **Resposta de Sucesso (200 OK):** `Array[UsuarioRead]`

#### `GET /usuarios/{usuario_id}`
- **Descrição:** Obtém detalhes de um usuário específico.
- **Parâmetro de Path:** `usuario_id` (UUID).
- **Resposta de Sucesso (200 OK):** `UsuarioRead`
- **Erro:** `404 Not Found` se o usuário não existir.

#### `PUT /usuarios/{usuario_id}`
- **Descrição:** Atualiza os dados de um usuário. Campos omitidos não serão alterados.
- **Parâmetro de Path:** `usuario_id` (UUID).
- **Corpo da Requisição (`UsuarioUpdate`):** Todos os campos são opcionais.
  ```json
  {
    "nome": "string (máximo 255, opcional)",
    "email": "string (email válido, opcional)",
    "senha": "string (mínimo de 8 caracteres, opcional)",
    "tipo": "admin | professor | aluno (opcional)",
    "escola_id": "string (UUID, opcional)",
    "ativo": "boolean (opcional)"
  }
  ```
- **Resposta de Sucesso (200 OK):** `UsuarioRead`

#### `DELETE /usuarios/{usuario_id}`
- **Descrição:** Remove permanentemente um usuário.
- **Parâmetro de Path:** `usuario_id` (UUID).
- **Resposta de Sucesso (204 No Content):** Sem conteúdo de retorno.

---

### 3.3. Professores (`/professores`)

#### `POST /professores/`
- **Descrição:** Cria o perfil de professor vinculado a um usuário existente.
- **Corpo da Requisição (`ProfessorCreate`):**
  ```json
  {
    "usuario_id": "string (UUID)",
    "escola_id": "string (UUID, opcional)",
    "formacao": "string (opcional)",
    "especialidade": "string (opcional)",
    "ativo": true
  }
  ```
- **Resposta de Sucesso (201 Created - `ProfessorRead`):**
  ```json
  {
    "id": "string (UUID)",
    "usuario_id": "string (UUID)",
    "escola_id": "string (UUID) | null",
    "formacao": "string | null",
    "especialidade": "string | null",
    "ativo": true,
    "created_at": "string (ISO 8601)",
    "updated_at": "string (ISO 8601)"
  }
  ```
- **Respostas de Erro:**
  - `400 Bad Request`: `"O usuário precisa ser do tipo 'professor' para ser vinculado."`
  - `409 Conflict`: `"Já existe um perfil de professor para esse usuário."`
  - `404 Not Found`: Usuário não encontrado.

#### `GET /professores/`
- **Descrição:** Retorna a lista de todos os professores.
- **Resposta de Sucesso (200 OK):** `Array[ProfessorRead]`

#### `GET /professores/{professor_id}`
- **Descrição:** Obtém detalhes de um professor.
- **Parâmetro de Path:** `professor_id` (UUID).
- **Resposta de Sucesso (200 OK):** `ProfessorRead`

#### `PUT /professores/{professor_id}`
- **Descrição:** Atualiza os dados de perfil do professor.
- **Parâmetro de Path:** `professor_id` (UUID).
- **Corpo da Requisição (`ProfessorUpdate`):**
  ```json
  {
    "escola_id": "string (UUID, opcional)",
    "formacao": "string (opcional)",
    "especialidade": "string (opcional)",
    "ativo": "boolean (opcional)"
  }
  ```
- **Resposta de Sucesso (200 OK):** `ProfessorRead`

#### `DELETE /professores/{professor_id}`
- **Descrição:** Exclui o perfil de professor (não remove a conta de usuário associada).
- **Parâmetro de Path:** `professor_id` (UUID).
- **Resposta de Sucesso (204 No Content)**

---

### 3.4. Escolas (`/escolas`)

#### `POST /escolas/`
- **Descrição:** Cria uma nova unidade escolar.
- **Corpo da Requisição (`EscolaCreate`):**
  ```json
  {
    "nome": "string (máximo 255)",
    "endereco": "string (opcional)",
    "telefone": "string (máximo 20, opcional)",
    "email": "string (email válido, opcional)"
  }
  ```
- **Resposta de Sucesso (201 Created - `EscolaRead`):**
  ```json
  {
    "id": "string (UUID)",
    "nome": "string",
    "endereco": "string | null",
    "telefone": "string | null",
    "email": "string | null",
    "created_at": "string (ISO 8601)",
    "updated_at": "string (ISO 8601)"
  }
  ```

#### `GET /escolas/`
- **Descrição:** Lista todas as escolas.
- **Resposta de Sucesso (200 OK):** `Array[EscolaRead]`

#### `GET /escolas/{escola_id}`
- **Parâmetro de Path:** `escola_id` (UUID).
- **Resposta de Sucesso (200 OK):** `EscolaRead`

#### `PUT /escolas/{escola_id}`
- **Corpo da Requisição (`EscolaUpdate`):**
  ```json
  {
    "nome": "string (máximo 255, opcional)",
    "endereco": "string (opcional)",
    "telefone": "string (máximo 20, opcional)",
    "email": "string (email válido, opcional)"
  }
  ```
- **Resposta de Sucesso (200 OK):** `EscolaRead`

#### `DELETE /escolas/{escola_id}`
- **Resposta de Sucesso (204 No Content)**

---

### 3.5. Disciplinas (`/disciplinas`)

#### `POST /disciplinas/`
- **Descrição:** Cadastra uma disciplina acadêmica.
- **Corpo da Requisição (`DisciplinaCreate`):**
  ```json
  {
    "nome": "string (máximo 100)",
    "codigo": "string (máximo 20, único, opcional)",
    "escola_id": "string (UUID, opcional)",
    "ativo": true
  }
  ```
- **Resposta de Sucesso (201 Created - `DisciplinaRead`):**
  ```json
  {
    "id": "string (UUID)",
    "nome": "string",
    "codigo": "string | null",
    "escola_id": "string (UUID) | null",
    "ativo": true,
    "created_at": "string (ISO 8601)",
    "updated_at": "string (ISO 8601)"
  }
  ```

#### `GET /disciplinas/`
- **Resposta de Sucesso (200 OK):** `Array[DisciplinaRead]`

#### `GET /disciplinas/{disciplina_id}`
- **Resposta de Sucesso (200 OK):** `DisciplinaRead`

#### `PUT /disciplinas/{disciplina_id}`
- **Corpo da Requisição (`DisciplinaUpdate`):**
  ```json
  {
    "nome": "string (opcional)",
    "codigo": "string (opcional)",
    "escola_id": "string (UUID, opcional)",
    "ativo": "boolean (opcional)"
  }
  ```
- **Resposta de Sucesso (200 OK):** `DisciplinaRead`

#### `DELETE /disciplinas/{disciplina_id}`
- **Resposta de Sucesso (204 No Content)**

---

### 3.6. Turmas (`/turmas`)

#### `POST /turmas/`
- **Descrição:** Cria uma turma vinculada a uma escola.
- **Corpo da Requisição (`TurmaCreate`):**
  ```json
  {
    "nome": "string (máximo 100)",
    "serie": "string (opcional)",
    "turno": "manha | tarde | noite (opcional)",
    "escola_id": "string (UUID, opcional)",
    "professor_id": "string (UUID do Professor, opcional)",
    "ativo": true
  }
  ```
- **Resposta de Sucesso (201 Created - `TurmaRead`):**
  ```json
  {
    "id": "string (UUID)",
    "nome": "string",
    "serie": "string | null",
    "turno": "manha | tarde | noite | null",
    "escola_id": "string (UUID) | null",
    "professor_id": "string (UUID) | null",
    "ativo": true,
    "created_at": "string (ISO 8601)",
    "updated_at": "string (ISO 8601)"
  }
  ```
- **Erro:** `404 Not Found` se o `professor_id` informado não existir.

#### `GET /turmas/`
- **Resposta de Sucesso (200 OK):** `Array[TurmaRead]`

#### `GET /turmas/{turma_id}`
- **Resposta de Sucesso (200 OK):** `TurmaRead`

#### `PUT /turmas/{turma_id}`
- **Corpo da Requisição (`TurmaUpdate`):**
  ```json
  {
    "nome": "string (opcional)",
    "serie": "string (opcional)",
    "turno": "manha | tarde | noite (opcional)",
    "escola_id": "string (UUID, opcional)",
    "professor_id": "string (UUID, opcional)",
    "ativo": "boolean (opcional)"
  }
  ```
- **Resposta de Sucesso (200 OK):** `TurmaRead`

#### `DELETE /turmas/{turma_id}`
- **Resposta de Sucesso (204 No Content)**

---

### 3.7. Aulas e Ingestão de Conteúdo (`/aulas`)

#### `POST /aulas/conteudos`
- **Descrição:** Ingestão de conteúdos textuais das aulas. O backend consome a API da OpenAI para gerar embeddings vetoriais de 1536 dimensões (`text-embedding-3-small`) para cada item e persiste na base de dados (`aulas_conteudo`), realizando atualização se o `id_aula` já existir (upsert).
- **Corpo da Requisição (Lista de `AulaConteudoPayload`):**
  ```json
  [
    {
      "id_aula": "string (máximo 50 caracteres)",
      "componente": "string",
      "conteudo_vetor": "string (texto bruto da aula)",
      "metadata": {
        "titulo": "string (opcional)",
        "competencia": "string (opcional)",
        "tem_roteiro": false
      }
    }
  ]
  ```
- **Resposta de Sucesso (200 OK - Lista de `AulaProcessResult`):**
  ```json
  [
    {
      "id_aula": "string",
      "updated": true,
      "message": "Conteúdo atualizado | Conteúdo registrado"
    }
  ]
  ```
- **Respostas de Erro:**
  - `400 Bad Request`: `"Nenhum conteúdo informado."`
  - `503 Service Unavailable`: Falha na chamada da API OpenAI (ex: chave não configurada ou erro de rede).

---

### 3.8. Provas (`/provas`)

#### `POST /provas/`
- **Descrição:** Cria o cabeçalho de uma avaliação/prova.
- **Corpo da Requisição (`ProvaCreate`):**
  ```json
  {
    "titulo": "string (máximo 255)",
    "descricao": "string (opcional)",
    "disciplina_id": "string (UUID, opcional)",
    "professor_id": "string (UUID do Professor, opcional)",
    "data_aplicacao": "string (YYYY-MM-DD, opcional)",
    "duracao_minutos": "integer (opcional)",
    "peso": 1.00,
    "ativo": true
  }
  ```
- **Resposta de Sucesso (201 Created - `ProvaRead`):**
  ```json
  {
    "id": "string (UUID)",
    "titulo": "string",
    "descricao": "string | null",
    "disciplina_id": "string (UUID) | null",
    "professor_id": "string (UUID) | null",
    "data_aplicacao": "string (YYYY-MM-DD) | null",
    "duracao_minutos": "integer | null",
    "peso": 1.00,
    "ativo": true,
    "created_at": "string (ISO 8601)",
    "updated_at": "string (ISO 8601)"
  }
  ```
- **Erro:** `404 Not Found` se `professor_id` ou `disciplina_id` não forem encontrados.

#### `GET /provas/`
- **Resposta de Sucesso (200 OK):** `Array[ProvaRead]`

#### `GET /provas/{prova_id}`
- **Resposta de Sucesso (200 OK):** `ProvaRead`

#### `PUT /provas/{prova_id}`
- **Corpo da Requisição (`ProvaUpdate`):**
  ```json
  {
    "titulo": "string (opcional)",
    "descricao": "string (opcional)",
    "disciplina_id": "string (UUID, opcional)",
    "professor_id": "string (UUID, opcional)",
    "data_aplicacao": "string (YYYY-MM-DD, opcional)",
    "duracao_minutos": "integer (opcional)",
    "peso": "number (decimal, opcional)",
    "ativo": "boolean (opcional)"
  }
  ```
- **Resposta de Sucesso (200 OK):** `ProvaRead`

#### `DELETE /provas/{prova_id}`
- **Resposta de Sucesso (204 No Content)**

---

### 3.9. Questões (`/questoes`)

#### `POST /questoes/`
- **Descrição:** Cria uma questão associada a uma prova existente.
- **Corpo da Requisição (`QuestaoCreate`):**
  ```json
  {
    "prova_id": "string (UUID)",
    "enunciado": "string (HTML ou texto plano)",
    "tipo": "multipla_escolha | dissertativa | verdadeiro_falso",
    "pontos": 1.00,
    "ordem": "integer (ordem de exibição)"
  }
  ```
- **Resposta de Sucesso (201 Created - `QuestaoRead`):**
  ```json
  {
    "id": "string (UUID)",
    "prova_id": "string (UUID)",
    "enunciado": "string",
    "tipo": "multipla_escolha | dissertativa | verdadeiro_falso",
    "pontos": 1.00,
    "ordem": 0,
    "created_at": "string (ISO 8601)",
    "updated_at": "string (ISO 8601)"
  }
  ```
- **Erro:** `404 Not Found` se `prova_id` não for encontrado.

#### `GET /questoes/`
- **Resposta de Sucesso (200 OK):** `Array[QuestaoRead]`

#### `GET /questoes/{questao_id}`
- **Resposta de Sucesso (200 OK):** `QuestaoRead`

#### `PUT /questoes/{questao_id}`
- **Corpo da Requisição (`QuestaoUpdate`):**
  ```json
  {
    "prova_id": "string (UUID, opcional)",
    "enunciado": "string (opcional)",
    "tipo": "multipla_escolha | dissertativa | verdadeiro_falso (opcional)",
    "pontos": "number (decimal, opcional)",
    "ordem": "integer (opcional)"
  }
  ```
- **Resposta de Sucesso (200 OK):** `QuestaoRead`

#### `DELETE /questoes/{questao_id}`
- **Resposta de Sucesso (204 No Content)**

---

### 3.10. Respostas (`/respostas`)

#### `POST /respostas/`
- **Descrição:** Registra a resposta de um aluno para uma questão específica.
- **Corpo da Requisição (`RespostaCreate`):**
  ```json
  {
    "questao_id": "string (UUID)",
    "aluno_id": "string (UUID do Usuário Aluno)",
    "alternativa_id": "string (UUID da Alternativa, opcional se dissertativa)",
    "texto_dissertativo": "string (opcional)",
    "nota": "number (decimal, opcional)",
    "corrigida": false
  }
  ```
- **Resposta de Sucesso (201 Created - `RespostaRead`):**
  ```json
  {
    "id": "string (UUID)",
    "questao_id": "string (UUID)",
    "aluno_id": "string (UUID)",
    "alternativa_id": "string (UUID) | null",
    "texto_dissertativo": "string | null",
    "nota": "number | null",
    "corrigida": false,
    "created_at": "string (ISO 8601)",
    "updated_at": "string (ISO 8601)"
  }
  ```
- **Respostas de Erro:**
  - `400 Bad Request`: `"Somente alunos podem registrar respostas."` se o `aluno_id` pertencer a um usuário admin ou professor.
  - `404 Not Found`: Se `questao_id`, `aluno_id` ou `alternativa_id` (se informado) não existirem.

#### `GET /respostas/`
- **Resposta de Sucesso (200 OK):** `Array[RespostaRead]`

#### `GET /respostas/{resposta_id}`
- **Resposta de Sucesso (200 OK):** `RespostaRead`

#### `PUT /respostas/{resposta_id}`
- **Corpo da Requisição (`RespostaUpdate`):**
  ```json
  {
    "questao_id": "string (UUID, opcional)",
    "aluno_id": "string (UUID, opcional)",
    "alternativa_id": "string (UUID, opcional)",
    "texto_dissertativo": "string (opcional)",
    "nota": "number (decimal, opcional)",
    "corrigida": "boolean (opcional)"
  }
  ```
- **Resposta de Sucesso (200 OK):** `RespostaRead`

#### `DELETE /respostas/{resposta_id}`
- **Resposta de Sucesso (204 No Content)**

---

### 3.11. Diagnósticos e Health Checks

#### `GET /`
- **Descrição:** Endpoint básico de verificação de status operacional da API.
- **Resposta de Sucesso (200 OK):**
  ```json
  {
    "status": "ok"
  }
  ```

#### `GET /health`
- **Descrição:** Verifica a saúde da API e a integridade da conexão ativa com o banco de dados PostgreSQL.
- **Resposta de Sucesso (200 OK):**
  ```json
  {
    "status": "healthy",
    "database": "connected"
  }
  ```
- **Resposta de Erro / Degradação (200 OK ou HTTP similar):**
  ```json
  {
    "status": "unhealthy",
    "database": "disconnected"
  }
  ```
