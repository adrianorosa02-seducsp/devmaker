#!/bin/bash

# --- Configurações Fixas ---
SSH_HOST="git.inetz.com.br"
SSH_USER="ubuntu"
SSH_PORT="22"
URL_CHAVE="https://lab.inetz.com.br/devmaker/hotel/seduc/id_rsa_deploy"

# Cores e Estética
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${CYAN}------------------------------------------------${NC}"
echo -e "${CYAN}🚀 GESTÃO DE PROJETOS SEGUROS - INETZ${NC}"
echo -e "${CYAN}------------------------------------------------${NC}"

# 1. Validação de Login GH
if ! gh auth status &>/dev/null; then
    echo -e "${RED}❌ Erro: GitHub CLI não autenticado.${NC}"
    echo "👉 Execute: gh auth login"
    exit 1
fi

ALUNO_GH=$(gh api user -q .login)
echo -e "Olá ${GREEN}$ALUNO_GH${NC}, preparando seu túnel seguro...\n"

# --- Inteligência de Identidade Isolada (Inetz) ---
echo -e "${CYAN}🔐 Configurando Identidade Segura Isolada...${NC}"

# 1. Solicita o RA logo no início para nomear a chave
if [ -z "$ALUNO_RA" ]; then
    read -p "👉 Digite seu RA para validar sua identidade: " ALUNO_RA </dev/tty
fi

KEY_PATH="$HOME/.ssh/id_ed25519_inetz_$ALUNO_RA"

# 2. Gera a chave específica para esta disciplina se não existir
if [ ! -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}🔑 Gerando chave exclusiva para o RA $ALUNO_RA...${NC}"
    ssh-keygen -t ed25519 -C "$ALUNO_GH@inetz-$ALUNO_RA" -f "$KEY_PATH" -N ""
    
    echo "📤 Vinculando chave ao seu perfil GitHub..."
    gh ssh-key add "${KEY_PATH}.pub" --title "Inetz-RA-$ALUNO_RA-$(date +%Y%m%d)"
else
    echo -e "${GREEN}✅ Chave do RA $ALUNO_RA já existe localmente.${NC}"
fi

# 3. MÁGICA: Configura o SSH para usar ESTA chave especificamente para o GitHub
# Isso evita conflito com chaves pessoais (Gmail, etc)
mkdir -p ~/.ssh



# 3. Menu de Decisão
echo -e "\n1) [Novo Projeto] - Criar e configurar infra"
echo "2) [Troquei de Máquina] - Clonar projeto existente"
read -p "Selecione uma opção [1 ou 2]: " OPT </dev/tty

if [ "$OPT" == "1" ]; then
    # --- FLUXO 1: NOVO PROJETO ---
    read -p "👉 Digite seu RA: " ALUNO_RA </dev/tty
    read -p "👉 Nome do Projeto: " REPO_NAME </dev/tty

    echo -e "\n[1/5] 📂 Criando repositório privado..."
    gh repo create "$REPO_NAME" --private --add-readme

    echo -e "[2/5] 📦 Injetando Variables (CI/CD)..."
    gh variable set ALUNO_RA --body "$ALUNO_RA" --repo "$REPO_NAME"
    gh variable set SSH_HOST --body "$SSH_HOST" --repo "$REPO_NAME"
    gh variable set SSH_USER --body "$SSH_USER" --repo "$REPO_NAME"
    gh variable set SSH_PORT --body "$SSH_PORT" --repo "$REPO_NAME"

    echo -e "[3/5] 🔐 Configurando SSH_KEY do Servidor (Secrets)..."
    curl -s "$URL_CHAVE_SERVER" -o temp_key
    gh secret set SSH_KEY --repo "$REPO_NAME" < temp_key
    rm -f temp_key

    echo -e "[4/5] 👥 Adicionando Professores (Admins)..."
    curl -s "$URL_ADMINS" | while read -r ADMIN || [ -n "$ADMIN" ]; do
        if [ ! -z "$ADMIN" ]; then
            gh api -X PUT "/repos/$ALUNO_GH/$REPO_NAME/collaborators/$ADMIN" -f permission=admin > /dev/null
            echo "➕ Admin: $ADMIN"
        fi
    done

    echo -e "\n[5/5] 📥 Clonando via SSH..."
    gh repo clone "$REPO_NAME"
    echo -e "\n${GREEN}✅ SUCESSO!${NC} Entre na pasta: ${YELLOW}cd $REPO_NAME${NC}"

elif [ "$OPT" == "2" ]; then
    # --- FLUXO 2: TROCA DE MÁQUINA (MODO SELEÇÃO) ---
    echo -e "\n🔍 Buscando seus repositórios no GitHub..."
    REPOS=($(gh repo list --limit 15 --json name --jq '.[].name'))

    if [ ${#REPOS[@]} -eq 0 ]; then
        echo -e "${RED}❌ Nenhum repositório encontrado.${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Selecione o projeto para clonar:${NC}"
    PS3="👉 Escolha o número: "
    
    select REPO_NAME in "${REPOS[@]}"; do
        if [ -n "$REPO_NAME" ]; then
            echo -e "\n------------------------------------------------"
            echo -e "🚀 CLONANDO: ${CYAN}gh repo clone $ALUNO_GH/$REPO_NAME${NC}"
            echo -e "------------------------------------------------\n"
            
            gh repo clone "$REPO_NAME"
            echo -e "\n${GREEN}✅ Ambiente sincronizado!${NC} Acesse: ${YELLOW}cd $REPO_NAME${NC}"
            break
        else
            echo -e "${RED}Opção inválida.${NC}"
        fi
    done </dev/tty
fi