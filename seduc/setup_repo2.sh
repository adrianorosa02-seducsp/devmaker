#!/bin/bash

# --- Configurações Fixas ---
SSH_HOST="git.inetz.com.br"
SSH_USER="ubuntu"
SSH_PORT="22"
URL_CHAVE="https://lab.inetz.com.br/devmaker/hotel/seduc/id_rsa_deploy"

# Cores para orientação
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${CYAN}------------------------------------------------${NC}"
echo -e "${CYAN}🚀 GESTÃO DE PROJETOS - INETZ (SEDUC)${NC}"
echo -e "${CYAN}------------------------------------------------${NC}"

# 1. Validação de Login no GitHub CLI
if ! gh auth status &>/dev/null; then
    echo -e "${RED}❌ Erro: Você não está logado no GitHub CLI.${NC}"
    echo "👉 Por favor, execute: gh auth login"
    exit 1
fi

ALUNO_GH=$(gh api user -q .login)
echo -e "Olá ${GREEN}$ALUNO_GH${NC}, vamos configurar seu projeto.\n"

# 2. Menu de Decisão
echo "1) [Novo Projeto] - Criar e configurar infraestrutura"
echo "2) [Troquei de Máquina] - Clonar projeto existente"
read -p "Selecione uma opção [1 ou 2]: " OPT </dev/tty

if [ "$OPT" == "1" ]; then
    # --- FLUXO 1: NOVO PROJETO ---
    read -p "👉 Digite seu RA (ex: 12345): " ALUNO_RA </dev/tty
    read -p "👉 Nome do Projeto (será o nome do repo): " REPO_NAME </dev/tty

    echo -e "\n[1/5] 📂 Criando repositório privado..."
    gh repo create "$REPO_NAME" --private --add-readme

    echo -e "[2/5] 📦 Configurando Metadados (Variables)..."
    gh variable set ALUNO_RA --body "$ALUNO_RA" --repo "$REPO_NAME"
    gh variable set SSH_HOST --body "$SSH_HOST" --repo "$REPO_NAME"
    gh variable set SSH_USER --body "$SSH_USER" --repo "$REPO_NAME"
    gh variable set SSH_PORT --body "$SSH_PORT" --repo "$REPO_NAME"

    echo -e "[3/5] 🔐 Injetando Chave SSH (Secrets)..."
    curl -s "$URL_CHAVE" -o temp_key
    if [ -f "temp_key" ]; then
        gh secret set SSH_KEY --repo "$REPO_NAME" < temp_key
        rm -f temp_key
        echo "✅ Secret SSH_KEY configurada com sucesso."
    fi

    echo -e "[4/5] 👥 Adicionando Professores (Admins)..."
    # Tenta baixar a lista de admins, se falhar usa o seu como fallback
    curl -s "$URL_ADMINS" | while read -r ADMIN || [ -n "$ADMIN" ]; do
        if [ ! -z "$ADMIN" ]; then
            gh api -X PUT "/repos/$ALUNO_GH/$REPO_NAME/collaborators/$ADMIN" -f permission=admin > /dev/null
            echo "➕ Professor $ADMIN adicionado."
        fi
    done

    echo -e "\n[5/5] 📥 Clonando repositório local..."
    gh repo clone "$REPO_NAME"
    echo -e "\n${GREEN}✅ TUDO PRONTO!${NC} Entre na pasta com: ${YELLOW}cd $REPO_NAME${NC}"

elif [ "$OPT" == "2" ]; then
    # --- FLUXO 2: TROCA DE MÁQUINA (MODO SELEÇÃO) ---
    echo -e "\n🔍 Buscando seus últimos repositórios no GitHub..."
    
    # Captura os nomes dos repositórios
    REPOS=($(gh repo list --limit 10 --json name --jq '.[].name'))

    if [ ${#REPOS[@]} -eq 0 ]; then
        echo -e "${RED}❌ Nenhum repositório encontrado.${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Selecione o projeto para clonar:${NC}"
    PS3="👉 Digite o número correspondente: "
    
    select REPO_NAME in "${REPOS[@]}"; do
        if [ -n "$REPO_NAME" ]; then
            # Feedback Visual do comando sendo executado
            echo -e "\n------------------------------------------------"
            echo -e "✅ ${GREEN}PROJETO SELECIONADO:${NC} $REPO_NAME"
            echo -e "🚀 ${CYAN}EXECUTANDO:${NC} gh repo clone $ALUNO_GH/$REPO_NAME"
            echo -e "------------------------------------------------\n"
            
            gh repo clone "$REPO_NAME"
            
            echo -e "\n${GREEN}✅ Ambiente sincronizado!${NC}"
            echo -e "Para acessar, digite: ${YELLOW}cd $REPO_NAME${NC}"
            break
        else
            echo -e "${RED}Opção inválida.${NC}"
        fi
    done </dev/tty

else
    echo "Saindo..."
    exit 1
fi


