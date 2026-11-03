# Hand-off do Agente: Status do Projeto Escola do Futuro

## 1. O que foi feito até agora (Front-end - `devmaker`)
- **Migração para SPA (Single Page Application)**: O painel principal (`cadastros/index.html`) foi consolidado. O roteamento agora extrai magicamente o "miolo" das outras páginas e as exibe sem piscar a tela, via `app.js`.
- **Scripts em SPA**: Ajustado o comportamento do `DOMContentLoaded` no JS para funções auto-executáveis (IIFE), garantindo que botões (como em `form_importacao_pdf.js`) funcionem ao serem carregados dinamicamente.
- **Painel de Aulas em TV (Digital Signage)**: A lógica do `painel_aulas.js` foi reescrita. O sistema agora lê a `horaAtual`, determina o turno ativo (Manhã, Tarde ou Noite) e **mostra apenas os turnos presentes e futuros**. Ele oculta automaticamente o turno que já passou, posicionando sempre o turno vigente no topo da tela para facilitar a visualização na TV (sem precisar rolar).
- **Cabeçalhos Fixos (Sticky)**: O título do turno e as colunas das turmas ficam travados no topo via CSS (`style.css`), garantindo que não se perca o nome da turma ao rolar a grade de horários.

## 2. O que foi feito até agora (Back-end - `devprovas`)
- **Remoção de Limite de Páginas**: Em `app/services/extrator_horarios.py`, removemos uma trava que impedia a leitura de PDFs a partir da página 3, o que estava escondendo as aulas da tarde.
- **Correção da Expressão Regular (Turmas)**: Alterado o Regex de `\d[A-D]` para `\d[A-Z]` no `extrator_horarios.py`. Antes, a regra bloqueava turmas como `2E` e `3F`, fazendo com que quase todo o período noturno não fosse lido.
- **Novo Endpoint para Frontend**: Implementado o endpoint `PUT /escolas/{escola_id}/configuracao-importacao` no `app.main` (via monkey-patch) para possibilitar a gravação da URL do Google Drive sem mexer diretamente no banco.

## 3. Próximos Passos Imediatos (Para o Usuário e para o Próximo Agente)
1. **Fazer o Deploy do Backend**: O repositório `devprovas` (com os ajustes no `extrator_horarios.py`) precisa ser publicado no servidor `geduc.inetz.com.br`.
2. **Sincronizar a Grade Novamente**: No Frontend (`cadastros/index.html`), acessar a aba "Importação de Grade" e clicar no botão **Sincronizar**. O novo backend extrairá o PDF por completo e populará o banco com as turmas da Tarde e da Noite.
3. **Validar Painel**: Acessar o Painel de Aulas e verificar se os dados de todos os períodos estão sendo listados corretamente com a nova rolagem automática.

## Dicas para o próximo Agente
- O usuário está desenvolvendo o Front-end e testa na porta `3000` via Python Simple HTTP Server.
- Se ocorrer erro de CORS, certifique-se de instruir o usuário a bater no endpoint via `localhost:3000`, não acessando via "file:///".
- Se houver ajustes em `painel_aulas.js`, a lógica de agrupamento de turnos e `Sticky Headers` está bem consolidada e depende um do outro; proceda com cautela.
