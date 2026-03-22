#!/bin/bash

# --- Configurações Fixas ---
SSH_HOST="git.inetz.com.br"
SSH_USER="ubuntu"
SSH_PORT="22"
URL_CHAVE="https://lab.inetz.com.br/devmaker/hotel/seduc/id_rsa_deploy"

# Cores para orientação visual
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${CYAN}------------------------------------------------${NC}"
echo -e "${CYAN}🚀 GESTÃO DE PROJETOS SEGUROS - INETZ${NC}"
echo -e "${CYAN}------------------------------------------------${NC}"

# 1. Validação de Login no GitHub CLI
if ! gh auth status &>/dev/null; then
    echo -e "${RED}❌ Erro: GitHub CLI não autenticado.${NC}"
    echo "👉 Por favor, execute primeiro: gh auth login"
    exit 1
fi

ALUNO_GH=$(gh api user -q .login)

# 2. Coleta e Limpeza do RA
read -p "👉 Digite seu RA para configurar o ambiente: " RAW_RA </dev/tty
ALUNO_RA=$(echo "$RAW_RA" | tr -d ' ') # Remove espaços acidentais

# 3. Garantia de Diretório de Trabalho (Windows vs Linux)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    BASE_DIR="/c/Users/$USERNAME/projetos"
else
    BASE_DIR="$HOME/projetos"
fi

mkdir -p "$BASE_DIR"
cd "$BASE_DIR" || { echo "Erro ao acessar pasta de projetos"; exit 1; }

# 4. INTELIGÊNCIA DE CHAVE SSH ISOLADA (O BLOCO ROBUSTO)
KEY_NAME="id_ed25519_inetz_$ALUNO_RA"
KEY_PATH="$HOME/.ssh/$KEY_NAME"

# Garante que a pasta .ssh existe com as permissões corretas
mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"

if [ ! -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}🔑 Gerando identidade exclusiva para o RA $ALUNO_RA...${NC}"
    ssh-keygen -t ed25519 -C "$ALUNO_GH@inetz-$ALUNO_RA" -f "$KEY_PATH" -N ""
    
    echo "📤 Vinculando nova chave ao seu perfil GitHub..."
    gh ssh-key add "${KEY_PATH}.pub" --title "Inetz-RA-$ALUNO_RA-$(date +%Y%m%d)"
else
    echo -e "${GREEN}✅ Chave do RA $ALUNO_RA já existe localmente.${NC}"
fi

# LIMPEZA E CONFIGURAÇÃO DO SSH CONFIG
# Remove configurações antigas de github.com para evitar conflitos de chaves
sed -i '/Host github.com/,/IdentitiesOnly yes/d' "$HOME/.ssh/config" 2>/dev/null

# Adiciona o bloco de configuração apontando para a chave do RA
cat <<EOF >> "$HOME/.ssh/config"
Host github.com
    HostName github.com
    User git
    IdentityFile $KEY_PATH
    IdentitiesOnly yes
EOF

# Permissões críticas para o SSH funcionar no Linux
chmod 600 "$KEY_PATH"
chmod 644 "${KEY_PATH}.pub"
chmod 600 "$HOME/.ssh/config"

# Força o GH CLI a usar o protocolo SSH por padrão
gh config set git_protocol ssh -h github.com

# 5. Menu de Operações
echo -e "\n1) [Novo Projeto] - Criar e configurar infraestrutura"
echo "2) [Troquei de Máquina] - Clonar projeto existente"
read -p "Selecione uma opção [1 ou 2]: " OPT </dev/tty

if [ "$OPT" == "1" ]; then
    # --- FLUXO 1: NOVO PROJETO ---
    read -p "👉 Nome do Projeto: " REPO_NAME </dev/tty

    echo -e "\n[1/5] 📂 Criando repositório privado..."
    gh repo create "$REPO_NAME" --private --add-readme

    echo -e "[2/5] 📦 Configurando Variables (RA, SSH, Port)..."
    gh variable set ALUNO_RA --body "$ALUNO_RA" --repo "$REPO_NAME"
    gh variable set SSH_HOST --body "$SSH_HOST" --repo "$REPO_NAME"
    gh variable set SSH_USER --body "$SSH_USER" --repo "$REPO_NAME"
    gh variable set SSH_PORT --body "$SSH_PORT" --repo "$REPO_NAME"

    echo -e "[3/5] 🔐 Injetando Chave do Servidor (Secrets)..."
    curl -s "$URL_CHAVE_SERVER" -o temp_key
    gh secret set SSH_KEY --repo "$REPO_NAME" < temp_key
    rm -f temp_key

    echo -e "[4/5] 👥 Adicionando Professores como Admins..."
    curl -s "$URL_ADMINS" | while read -r ADMIN || [ -n "$ADMIN" ]; do
        if [ ! -z "$ADMIN" ]; then
            gh api -X PUT "/repos/$ALUNO_GH/$REPO_NAME/collaborators/$ADMIN" -f permission=admin > /dev/null
            echo "✅ Professor $ADMIN adicionado."
        fi
    done

    echo -e "\n[5/5] 📥 Clonando repositório..."
    gh repo clone "$REPO_NAME"
    echo -e "\n${GREEN}✅ SUCESSO!${NC} Projeto em: ${YELLOW}$BASE_DIR/$REPO_NAME${NC}"

elif [ "$OPT" == "2" ]; then
    # --- FLUXO 2: CLONAR EXISTENTE ---
    echo -e "\n🔍 Buscando seus últimos repositórios..."
    REPOS=($(gh repo list --limit 15 --json name --jq '.[].name'))

    if [ ${#REPOS[@]} -eq 0 ]; then
        echo -e "${RED}❌ Nenhum repositório encontrado.${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Selecione o projeto para clonar:${NC}"
    PS3="👉 Digite o número: "
    
    select REPO_NAME in "${REPOS[@]}"; do
        if [ -n "$REPO_NAME" ]; then
            echo -e "\n🚀 Executando: ${CYAN}gh repo clone $ALUNO_GH/$REPO_NAME${NC}"
            gh repo clone "$REPO_NAME"
            echo -e "\n${GREEN}✅ Sincronizado em: ${YELLOW}$BASE_DIR/$REPO_NAME${NC}"
            break
        else
            echo -e "${RED}Opção inválida.${NC}"
        fi
    done </dev/tty
fi