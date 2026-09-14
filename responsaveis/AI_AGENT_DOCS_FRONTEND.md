# Documentação do Frontend (Diretório Raiz)

> [!IMPORTANT]
> **Para Agentes de IA:** Leia este documento para entender a estrutura, funcionamento e fluxo de dados do frontend deste projeto. **Você deve atualizar este documento sempre que adicionar novas páginas, scripts ou modificar as integrações de APIs e Webhooks.**

## 1. Visão Geral
A raiz do projeto contém o frontend do **Sistema Escola do Futuro** (EE Antonio Reginato). 
Atualmente o sistema é composto por múltiplas páginas HTML e scripts em Vanilla JavaScript, sem a utilização de frameworks pesados (como React ou Vue), focado em performance e manutenibilidade direta. A estilização visual comum é controlada pelo `style.css`.

O frontend possui dois módulos funcionais ativos no momento:
1. **Cadastro e Vinculação de Responsáveis:** Um formulário que vincula dados de contato ao cadastro do aluno.
2. **Painel de Aulas (Turmas e Horários):** Um dashboard interativo e dinâmico que consome os dados gerados pelo backend local (Flask).

## 2. Componentes e Módulos Principais

### Módulo: Cadastro de Responsáveis
- **`index.html`**: A interface principal contendo a barra lateral de navegação e o formulário de cadastro.
- **`script.js`**: Lógica da interface do formulário. Inclui máscaras de telefone, exibição dinâmica do aluno selecionado e envio do payload final.
- **`modelo.js` e `alunos.txt`**: O arquivo `modelo.js` (carregado globalmente) processa os dados do arquivo de texto `alunos.txt` para popular as caixas de seleção (Turmas e Alunos).
- **Integração:** Ao enviar o formulário, o `script.js` dispara uma requisição `POST` com os dados do responsável para um Webhook externo no **n8n** (com URLs variadas para ambiente de teste/produção baseados no parâmetro `?prod=true`).

### Módulo: Painel de Aulas / Horários
- **`painel_aulas.html`**: Interface do dashboard de horários, exibindo uma tabela da grade, status de andamento das aulas e modais para edição.
- **`painel_aulas.js`**: Lógica pesada do dashboard. Responsabilidades:
  - Consome o endpoint `http://localhost:5000/api/painel` para carregar a grade do dia atual.
  - Consulta a `WorldTimeAPI` a cada 60 segundos para manter os relógios e o status de cada aula ("passada", "em andamento", "próxima" ou "futura") sincronizados.
  - Modais de CRUD: Realiza chamadas de API (`POST`, `PUT`, `DELETE` em `/api/aulas`) para gerenciar as aulas diretamente no banco de dados SQLite do backend.

### Estilização Global
- **`style.css`**: Concentra o Design System "Escola do Futuro". Possui variáveis CSS (`--sf-brand-blue`, etc) no topo, formatação de layout e estilos dos modais.
- **Dependências Externas:** FontAwesome para ícones, e as fontes `Inter` e `Outfit` importadas do Google Fonts.

## 3. Orientações para Desenvolvimento
- **Adição de Novas Páginas:** Se criar um novo módulo, copie a estrutura do `sidebar` (barra lateral) e `top-header` presentes em `index.html` para manter a consistência visual. 
- **Integrações de API:** 
  - Comunicações com o backend local (`Analise_dados`) devem sempre ser feitas apontando para `http://localhost:5000`.
  - Formulários de fluxo devem ser direcionados para o n8n usando a estrutura observada em `script.js`.
- **Vanilla JS:** O projeto não usa bundlers no momento. Ao adicionar novos scripts, lembre-se de referenciá-los com a tag `<script src="...">` no final do `<body>` do HTML correspondente.
- **Responsividade:** Utilize e adicione classes no `style.css` respeitando o fluxo existente de flexbox/grid, garantindo funcionamento em dispositivos móveis.

---
*Ultima atualização do documento: 14/09/2026.*
