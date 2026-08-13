---
name: "git-commit-helper"
description: "Auxilia na geração de mensagens de commit padronizadas segundo o Conventional Commits e valida o formato"
---

# Git Commit Helper Skill

Esta Habilidade de Agente (Skill) auxilia o desenvolvedor a estruturar commits limpos e padronizados.

## Quando ativar
Ative esta skill quando o usuário solicitar ajuda para:
- "criar um commit"
- "formatar commit"
- "escrever mensagem de commit"
- "salvar alterações no git"

## Fluxo de trabalho do Agente
1. Leia o contexto ou pergunte ao usuário sobre quais alterações foram feitas no código.
2. Formate uma mensagem baseada nas especificações do **Conventional Commits**:
   - `feat(escopo): descrição` para novas funcionalidades.
   - `fix(escopo): descrição` para correções de bugs.
   - `docs(escopo): descrição` para alterações em documentação.
   - `chore(escopo): descrição` para tarefas repetitivas ou configurações.
3. Execute o script `scripts/validate_commit.js` passando a mensagem como argumento para garantir a validação.
4. Apresente a mensagem formatada final ao usuário.
