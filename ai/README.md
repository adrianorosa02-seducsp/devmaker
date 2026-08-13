# Aula de IA: Entendendo e Criando Agent Skills

Este projeto contém os arquivos de apoio e a aplicação web interativa da aula sobre **Habilidades de Agente (Agent Skills)**.

## Estrutura do Projeto
- `index.html`: A aplicação web interativa contendo a teoria, referências visuais de vídeos, laboratório prático guiado, simulador de fluxo de execução de skills e um quiz de fixação.
- `style.css`: Estilização premium da aplicação (Dark theme, neon, responsivo).
- `app.js`: Lógica de interações da interface e do simulador.
- `skills/git-commit-helper/`: Pasta contendo a implementação real da Skill ensinada no laboratório para fins de referência.

## Como Executar a Aplicação Interativa
1. Basta abrir o arquivo `index.html` em qualquer navegador web moderno.
2. Você pode navegar entre as seções usando a barra de navegação no cabeçalho.

## Como Executar o Script de Validação do Laboratório Manuais
No terminal do seu computador (com Node.js instalado), navegue até a pasta `skills/git-commit-helper/scripts` e rode:

```bash
# Caso de sucesso:
node validate_commit.js "feat(auth): add google signin support"

# Caso de erro:
node validate_commit.js "ajustes no login"
```
