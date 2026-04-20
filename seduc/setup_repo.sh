#!/bin/bash
# setup_repo_v11.sh - Reestruturado por Adriano Justino Rosa
# Data: 20/04/2026

# --- Configurações Fixas ---
SSH_HOST="git.inetz.com.br"     
SSH_USER="ubuntu"
SSH_PORT="22"
URL_CHAVE="https://lab.inetz.com.br/devmaker/ava/seduc/id_rsa_deploy"

# Cores
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

clear
echo -e "${CYAN}🚀 INETZ - GERENCIAMENTO DE REPOSITORIOS GITHUB${NC}"

# 1. Autenticação e Chaves (Mantido conforme seu original)
gh auth status &>/dev/null || gh auth login
read -e -p "👉 Confirme seu USUARIO LOCAL: " -i "$USER" ALIAS_NAME </dev/tty

# 2. Seleção do Projeto
echo -e "\n${YELLOW}🔍 Buscando seus repositórios no GitHub...${NC}"
mapfile -t REPOS < <(gh repo list --limit 30 --json name -q '.[].name')

echo -e "------------------------------------------------------"
for i in "${!REPOS[@]}"; do
    printf "${CYAN}%2d)${NC} %-30s " "$((i+1))" "${REPOS[$i]}"
    if (( (i+1) % 2 == 0 )); then echo ""; fi
done
echo -e "\n------------------------------------------------------"
echo -e "${YELLOW} 0)${NC} Criar um NOVO repositório (Do zero)"
echo -e "${YELLOW} F)${NC} Fazer FORK de um Template (Inetz)"
echo -e "------------------------------------------------------"
read -p "👉 Selecione a opção: " OPTION </dev/tty

# --- Lógica de Decisão de Nome e Origem ---
if [[ "$OPTION" == "0" ]]; then
    read -p "👉 Nome do NOVO repositório: " REPO_NAME </dev/tty
    START_MODE="NEW"
elif [[ "$OPTION" =~ ^[Ff]$ ]]; then
    PROFESSOR="adrianorosa02-seducsp"
    mapfile -t TEMPLATES < <(gh repo list "$PROFESSOR" --limit 20 --json name -q '.[].name | select(contains("Template"))')
    for i in "${!TEMPLATES[@]}"; do printf "${YELLOW}%2d)${NC} %-25s " "$((i+1))" "${TEMPLATES[$i]}"; done
    read -p "👉 Escolha o Template: " T_CHOICE </dev/tty
    REPO_NAME=${TEMPLATES[$((T_CHOICE-1))]}
    START_MODE="FORK"
else
    REPO_NAME=${REPOS[$((OPTION-1))]}
    START_MODE="CLONE"
fi

TARGET_DIR="$HOME/projetos/$REPO_NAME"

# --- Validação de Diretório (A "Cilada") ---
if [ -d "$TARGET_DIR" ]; then
    echo -e "${RED}❌ Erro: A pasta '$REPO_NAME' já existe localmente.${NC}"
    exit 1
fi

# --- Execução da Ação de Origem ---
mkdir -p "$HOME/projetos" && cd "$HOME/projetos" || exit

case $START_MODE in
    "CLONE")
        echo -e "${CYAN}📥 Clonando repositório existente...${NC}"
        gh repo clone "$REPO_NAME"
        ;;
    "FORK")
        echo -e "${CYAN}🍴 Fazendo Fork do professor...${NC}"
        gh repo fork "$PROFESSOR/$REPO_NAME" --clone=true
        ;;
    "NEW")
        echo -e "${CYAN}🚀 Inicializando novo projeto...${NC}"
        mkdir -p "$REPO_NAME" && cd "$REPO_NAME" || exit
        git init
        gh repo create "$REPO_NAME" --private --confirm
        ;;
esac

cd "$TARGET_DIR" || exit

# --- Configuração de Variáveis (Sempre Garantidas com $USER) ---
read -p "👉 Informe o Sub-Domínio (01-30) [Padrão: $USER]: " INPUT_VAL </dev/tty
APP_NUM="${INPUT_VAL:-$USER}"

echo -e "${YELLOW}⚙️  Configurando Segredos no GitHub...${NC}"
curl -s -L "$URL_CHAVE" -o "/tmp/id_rsa_deploy"
gh secret set SSH_KEY < "/tmp/id_rsa_deploy"
rm "/tmp/id_rsa_deploy"

gh variable set APP_NUM --body "$APP_NUM"
gh variable set ALIAS_NAME --body "$ALIAS_NAME"
gh variable set SSH_HOST --body "$SSH_HOST"
gh variable set SSH_USER --body "$SSH_USER"
gh variable set SSH_PORT --body "$SSH_PORT"

# --- Lógica de Dependências (Só se necessário) ---
if [ "$START_MODE" == "NEW" ]; then
    echo -e "${YELLOW}🛠️  Configurando Stack FastAPI (Novo Projeto)...${NC}"
    # ... [Aqui entra sua lógica de poetry init e app.py que estava no script] ...
    # (Removido aqui por brevidade, mas deve ser mantido se for NEW)
elif [ -f "pyproject.toml" ]; then
    echo -e "${CYAN}📦 Detectado Poetry. Instalando dependências...${NC}"
    poetry install
elif [ -f "requirements.txt" ]; then
    echo -e "${CYAN}📦 Detectado Pip. Instalando dependências...${NC}"
    pip install -r requirements.txt
fi

# --- Finalização e Push ---
git add .
git commit -m "chore: setup inetz environment" 2>/dev/null
git branch -M main
git push -u origin main 2>/dev/null

echo -e "${GREEN}✅ Sucesso! Projeto configurado em $TARGET_DIR${NC}"
echo -e "🌐 URL: https://lab${APP_NUM}.inetz.com.br"