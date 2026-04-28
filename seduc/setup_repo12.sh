#!/bin/bash
#------------------------------------------------------------------------------
# setup_repo.sh - Gestão de Repositórios Ecossistema Inetz (v.14)
# Injeção Condicional de Variáveis (APP_NUM vs Estático)
#------------------------------------------------------------------------------

# --- 1. Configurações Fixas de Infra ---
SSH_HOST="git.inetz.com.br"     
SSH_USER="ubuntu"
SSH_PORT="22"
URL_CHAVE="https://lab.inetz.com.br/devmaker/ava/seduc/id_rsa_deploy"
URL_WORKFLOWS="https://lab.inetz.com.br/devmaker/ava/seduc/workflows"
URL_WORKDIR="https://lab.inetz.com.br/devmaker/ava/seduc/"
# Cores
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

clear
echo -e "${CYAN}🚀 INETZ - GERENCIAMENTO DE REPOSITORIOS GITHUB${NC}"

# --- 2. Autenticação e Identidade ---
gh auth status &>/dev/null || gh auth login
read -e -p "👉 Confirme seu USUARIO/RA para Deploy: " -i "$USER" ALIAS_NAME </dev/tty

# --- 3. Menu de Seleção de Repositório ---
echo -e "\n${YELLOW}🔍 Buscando seus repositórios no GitHub...${NC}"
mapfile -t REPOS < <(gh repo list --limit 30 --json name -q '.[].name')

echo -e "------------------------------------------------------"
for i in "${!REPOS[@]}"; do
    printf "${CYAN}%2d)${NC} %-30s " "$((i+1))" "${REPOS[$i]}"
    if (( (i+1) % 2 == 0 )); then echo ""; fi
done
echo -e "\n------------------------------------------------------"
echo -e "${YELLOW} 0)${NC} Criar um NOVO repositório (Do zero)"
echo -e "${YELLOW} F)${NC} Fazer FORK de um Template (Professor)"
echo -e "------------------------------------------------------"
read -p "👉 Selecione a opção: " OPTION </dev/tty

# --- 4. Lógica de Decisão de Modo e Stack ---
if [[ "$OPTION" == "0" ]]; then
    read -p "👉 Nome do NOVO repositório: " REPO_NAME </dev/tty
    START_MODE="NEW"

    echo -e "\n${YELLOW}📚 Selecione a Stack do Projeto:${NC}"
    echo -e "1) Estático (HTML/CSS/JS)   2) Python FastAPI        3) Python Flask"
    echo -e "4) Node.js                  5) React                 6) Vue.js"
    echo -e "7) Angular                  8) Customizado (Custom)"
    read -p "👉 Escolha o número da stack: " S_VAL </dev/tty

    case $S_VAL in
        1) STACK_FILE="static.yml" ;;
        2) STACK_FILE="python-fastapi.yml" ;;
        3) STACK_FILE="python-flask.yml" ;;
        4) STACK_FILE="nodejs.yml" ;;
        5) STACK_FILE="react.yml" ;;
        6) STACK_FILE="vue.yml" ;;
        7) STACK_FILE="angular.yml" ;;
        8) STACK_FILE="custom.yml" ;;
        *) STACK_FILE="static.yml" ;;
    esac

    # Definição Condicional do APP_NUM (Não solicitado na Stack 1)
    if [[ "$S_VAL" != "1" ]]; then
        read -p "👉 Informe o Número da APP/Instância (01-30) [Padrão: $USER]: " INPUT_VAL </dev/tty
        APP_NUM="${INPUT_VAL:-$USER}"
        echo -e "${CYAN}🚀 Configuração do Projeto Inetz${NC}"
        # Solicita o nome do projeto e garante que não seja vazio
        while [[ -z "$PROJETO_NAME" ]]; do
            read -p "📝 Digite o nome do projeto (ex: meu-app-angular): " PROJETO_NAME
            # Remove espaços ou caracteres especiais se o aluno digitar errado
            PROJETO_NAME=$(echo "$PROJETO_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g')
    
            if [[ -z "$PROJETO_NAME" ]]; then
                echo -e "${RED}⚠️ O nome não pode ser vazio e deve conter apenas letras, números e hifens.${NC}"
            fi
        done
        export PROJETO_NAME
    fi

elif [[ "$OPTION" =~ ^[Ff]$ ]]; then
    PROFESSOR="adrianorosa02-seducsp"
    mapfile -t TEMPLATES < <(gh repo list "$PROFESSOR" --limit 20 --json name -q '.[].name | select(contains("Template"))')
    for i in "${!TEMPLATES[@]}"; do printf "${YELLOW}%2d)${NC} %-25s " "$((i+1))" "${TEMPLATES[$i]}"; done
    read -p "👉 Escolha o Template: " T_CHOICE </dev/tty
    REPO_NAME=${TEMPLATES[$((T_CHOICE-1))]}
    START_MODE="FORK"
    # Fallback para Fork (Geralmente são apps, então garantimos APP_NUM)
    APP_NUM="$USER"
else
    REPO_NAME=${REPOS[$((OPTION-1))]}
    START_MODE="CLONE"
    APP_NUM="$USER"
fi

TARGET_DIR="$HOME/projetos/$REPO_NAME"

# --- 5. Trava de Segurança e Execução ---
[ -d "$TARGET_DIR" ] && { echo -e "${RED}❌ Erro: Pasta existe.${NC}"; exit 1; }
mkdir -p "$HOME/projetos" && cd "$HOME/projetos" || exit

case $START_MODE in
    "CLONE") gh repo clone "$REPO_NAME" ;;
    "FORK")  gh repo fork "$PROFESSOR/$REPO_NAME" --clone=true ;;
    "NEW")   mkdir -p "$REPO_NAME" && cd "$REPO_NAME"; git init; gh repo create "$REPO_NAME" --private --confirm ;;
esac

cd "$TARGET_DIR" || exit

# --- Para CLONE, o repositório já está pronto. Não precisa configurar nada. ---
if [[ "$START_MODE" == "CLONE" ]]; then
    echo -e "\n${GREEN}✅ Repositório clonado com sucesso em: $TARGET_DIR${NC}"
    echo -e "📂 Acesse com: ${CYAN}cd $TARGET_DIR${NC}"
    exit 0
fi

# --- 6. Configuração de Stack (Workflows) ---
if [[ "$START_MODE" == "NEW" ]]; then
    mkdir -p .github/workflows
    echo -e "${CYAN}📥 Baixando Workflow Inetz: $STACK_FILE...${NC}"
    curl -sL "$URL_WORKFLOWS/$STACK_FILE" -o .github/workflows/deploy.yml
    
    # --- AQUI É O PONTO DE ALTERAÇÃO ---
    case $S_VAL in
        1) # Estático
            echo -e "${GREEN}🔹 Stack Estática selecionada. Criando página de apresentação...${NC}"
            curl -sL "https://lab.inetz.com.br/devmaker/ava/seduc/estatico.html" -o index.html
            ;;
        5) # React (Vite)
            echo -e "${CYAN}⚛️  Inicializando Boilerplate React + Vite...${NC}"
            # Usamos --no-interactive para evitar que inicie o servidor dev automaticamente
            npm create vite@latest temp_vite -- --template react --no-interactive
            
            # Removemos o .git da pasta temporária se existir para evitar conflitos
            rm -rf temp_vite/.git
            
            # Movemos os arquivos para a pasta atual (incluindo arquivos ocultos)
            cp -r temp_vite/. .
            
            # Limpamos a sujeira
            rm -rf temp_vite
            
            # Ajustamos o nome no package.json para o nome do repositório
            sed -i "s/\"name\": \"temp_vite\"/\"name\": \"$REPO_NAME\"/" package.json
            
            # Gera o lock file necessário para o Workflow de deploy
            npm install --package-lock-only
            echo -e "${GREEN}✅ React inicializado com sucesso!${NC}"
            ;;
        2|3) # Python (FastAPI/Flask)
            echo -e "${CYAN}🐍 Inicializando ambiente Python...${NC}"
            echo "fastapi" > requirements.txt
            mkdir app && touch app/main.py
            ;;
        4) # Node.js
            echo -e "${CYAN}🟢 Inicializando Node.js...${NC}"
            npm init -y
            ;;
        6) # Vue
            echo -e "${CYAN}🖖 Inicializando Vue + Vite...${NC}"
            # Usamos --no-interactive e --overwrite para evitar prompts e início automático
            npm create vite@latest . -- --template vue --no-interactive --overwrite
            ;;
        7) # Angular
            echo -e "${CYAN}🅰️  Inicializando Angular...${NC}"
            # Desativa analytics para evitar interrupções
            export NG_CLI_ANALYTICS=false

            # Usamos a variável PROJETO_NAME para o nome e '.' para o diretório
            # Isso satisfaz a Regex do Angular e mantém os arquivos onde você quer
            npx -p @angular/cli ng new "${PROJETO_NAME}" --directory . --skip-git --minimal --defaults --style css --routing true
            ;;
    esac
fi





# --- 7. Injeção de Variáveis (GH) ---
echo -e "${YELLOW}⚙️  Configurando GitHub Actions e Variáveis...${NC}"

# Identifica o usuário de forma robusta
GH_USER=$(gh api user -q .login 2>/dev/null)
if [[ -z "$GH_USER" ]]; then
    echo -e "${YELLOW}⚠️  Aviso: Não foi possível obter usuário via API. Tentando via config local...${NC}"
    GH_USER=$(gh config get -h github.com user 2>/dev/null)
fi

if [[ -z "$GH_USER" ]]; then
    echo -e "${RED}❌ Erro Fatal: Não foi possível identificar seu usuário do GitHub.${NC}"
    echo -e "Por favor, execute: gh auth login"
    exit 1
fi

REPO_FULL="$GH_USER/$REPO_NAME"
echo -e "${CYAN}📦 Repositório Alvo: $REPO_FULL${NC}"

# Garante o remote origin (necessário para o push posterior)
git remote add origin "https://github.com/$REPO_FULL.git" 2>/dev/null || git remote set-url origin "https://github.com/$REPO_FULL.git"

# Injeção da Chave SSH (Segredo)
echo -e "${CYAN}🔑 Configurando Segredo SSH_KEY...${NC}"
curl -sL "$URL_CHAVE" -o "/tmp/id_rsa_deploy"
if gh secret set SSH_KEY -R "$REPO_FULL" < "/tmp/id_rsa_deploy"; then
    echo -e "${GREEN}✅ SSH_KEY configurada.${NC}"
else
    echo -e "${RED}❌ Erro ao configurar SSH_KEY no GitHub.${NC}"
fi
rm "/tmp/id_rsa_deploy"

# Variáveis Fixas
echo -e "${CYAN}📝 Configurando variáveis de ambiente...${NC}"
gh variable set ALIAS_NAME --body "$ALIAS_NAME" -R "$REPO_FULL"
gh variable set PROJETO_NAME --body "$REPO_NAME" -R "$REPO_FULL"
gh variable set SSH_HOST --body "$SSH_HOST" -R "$REPO_FULL"
gh variable set SSH_USER --body "$SSH_USER" -R "$REPO_FULL"
gh variable set SSH_PORT --body "$SSH_PORT" -R "$REPO_FULL"

# Variável Crítica para Subdomínios (APP_NUM)
if [[ "$S_VAL" =~ ^(2|3|4|5|6|7)$ ]]; then
    if [[ -z "$APP_NUM" ]]; then
        read -p "👉 [ALERTA] Informe o número do Lab para o subdomínio (ex: 01, 02): " APP_NUM </dev/tty
    fi
    gh variable set APP_NUM --body "$APP_NUM" -R "$REPO_FULL"
    echo -e "${GREEN}✅ APP_NUM ($APP_NUM) configurado.${NC}"
fi

# --- 8. Finalização ---
echo -e "\n${YELLOW}📤 Iniciando publicação no GitHub...${NC}"

# Adiciona todos os arquivos (respeitando .gitignore)
git add .

# Tenta fazer o commit inicial
if git commit -m "chore: initial setup inetz" &>/dev/null; then
    echo -e "${GREEN}📦 Arquivos preparados e commit realizado.${NC}"
else
    echo -e "${YELLOW}⚠️  Nada para commit (repositório já estava atualizado).${NC}"
fi

# Define a branch principal
git branch -M main

# Faz o push e captura o status
echo -e "${CYAN}🚀 Enviando para o GitHub...${NC}"
if git push -u origin main; then
    echo -e "\n${GREEN}✅ SUCESSO! Repositório configurado e publicado.${NC}"
    echo -e "🌐 URL do Projeto: ${CYAN}https://lab.inetz.com.br/$ALIAS_NAME/$REPO_NAME${NC}"
    echo -e "⚙️  Acompanhe o Deploy: ${CYAN}https://github.com/$REPO_FULL/actions${NC}"
else
    echo -e "\n${RED}❌ ERRO: Falha ao publicar no GitHub.${NC}"
    echo -e "Dica: Verifique sua conexão e permissões do token (gh auth status).${NC}"
    exit 1
fi