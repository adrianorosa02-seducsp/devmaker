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

# --- 6. Configuração de Stack (Workflows) ---
if [[ "$START_MODE" == "NEW" ]]; then
    mkdir -p .github/workflows
    echo -e "${CYAN}📥 Baixando Workflow Inetz: $STACK_FILE...${NC}"
    curl -sL "$URL_WORKFLOWS/$STACK_FILE" -o .github/workflows/deploy.yml
    echo -e "${YELLOW}⚙️  Criando index.html de apresentação...${NC}"
    curl -sL "https://lab.inetz.com.br/devmaker/ava/seduc/index_estatico.html" -o index.html
    
    
fi

# --- 7. Injeção de Variáveis (GH) ---
echo -e "${YELLOW}⚙️  Configurando GitHub Actions...${NC}"

# Captura o seu usuário do GitHub dinamicamente para montar o caminho completo
GH_USER=$(gh api user -q .login)
REPO_FULL="$GH_USER/$REPO_NAME"

# Garante que o remote origin está configurado (evita o erro 'no git remotes found')
git remote add origin "https://github.com/$REPO_FULL.git" 2>/dev/null || git remote set-url origin "https://github.com/$REPO_FULL.git"

# Segredo fixo (Usando -R para garantir o destino)
curl -sL "$URL_CHAVE" -o "/tmp/id_rsa_deploy"
gh secret set SSH_KEY -R "$REPO_FULL" < "/tmp/id_rsa_deploy"
rm "/tmp/id_rsa_deploy"

# Variáveis Fixas - Agora com o parâmetro -R (Repository)
gh variable set ALIAS_NAME --body "$ALIAS_NAME" -R "$REPO_FULL"
gh variable set PROJETO_NAME --body "$REPO_NAME" -R "$REPO_FULL"
gh variable set SSH_HOST --body "$SSH_HOST" -R "$REPO_FULL"
gh variable set SSH_USER --body "$SSH_USER" -R "$REPO_FULL"
gh variable set SSH_PORT --body "$SSH_PORT" -R "$REPO_FULL"

# Variável Condicional
if [[ "$S_VAL" != "1" ]]; then
    echo -e "${CYAN}🔹 Vinculando ID da Instância: $APP_NUM${NC}"
    gh variable set APP_NUM --body "$APP_NUM" -R "$REPO_FULL"
fi

# --- 8. Finalização ---
git add .
git commit -m "chore: initial setup inetz" 2>/dev/null
git branch -M main
git push -u origin main 2>/dev/null

echo -e "\n${GREEN}✅ SUCESSO!${NC}"
echo -e "🌐 URL: ${CYAN}https://lab.inetz.com.br/$ALIAS_NAME/$REPO_NAME${NC}"