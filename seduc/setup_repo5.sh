#!/bin/bash

# --- Configurações Fixas ---
SSH_HOST="git.inetz.com.br"
SSH_USER="ubuntu"
SSH_PORT="22"
URL_CHAVE="https://lab.inetz.com.br/devmaker/hotel/seduc/id_rsa_deploy"
URL_ADMINS="https://lab.inetz.com.br/devmaker/hotel/seduc/admins.txt"
URL_WORKFLOWS="https://lab.inetz.com.br/devmaker/hotel/seduc/workflows"

# Cores
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${CYAN}🚀 INETZ - CONFIGURADOR DE AMBIENTE${NC}"

# 1. Identidade e Slot do Lab
read -p "👉 Digite seu RA: " RAW_RA </dev/tty
ALUNO_RA=$(echo "$RAW_RA" | tr -d ' ')

read -p "👉 Seu número na chamada (01-30): " RAW_NUM </dev/tty
ALUNO_NUM=$(printf "%02d" $((10#$RAW_NUM)))

# 2. Garantia de Diretório Local
BASE_DIR="/c/Users/$USERNAME/projetos"
[[ "$OSTYPE" != "msys" && "$OSTYPE" != "cygwin" ]] && BASE_DIR="$HOME/projetos"
mkdir -p "$BASE_DIR" && cd "$BASE_DIR" || exit

# 3. Configuração SSH (RA)
KEY_NAME="id_ed25519_inetz_$ALUNO_RA"
KEY_PATH="$HOME/.ssh/$KEY_NAME"
mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"
if [ ! -f "$KEY_PATH" ]; then
    ssh-keygen -t ed25519 -C "inetz-$ALUNO_RA" -f "$KEY_PATH" -N ""
    gh ssh-key add "${KEY_PATH}.pub" --title "Inetz-RA-$ALUNO_RA"
fi
sed -i '/Host github.com/,/IdentitiesOnly yes/d' "$HOME/.ssh/config" 2>/dev/null
echo -e "Host github.com\n    HostName github.com\n    User git\n    IdentityFile $KEY_PATH\n    IdentitiesOnly yes" >> "$HOME/.ssh/config"

# 4. Seleção de Stack (Tomada de Decisão)
echo -e "\n${YELLOW}Qual o tipo de projeto?${NC}"
echo "1) HTML/CSS/JS (Estático - Nginx)"
echo "2) Front-End Moderno (React/Vue - Pasta dist)"
echo "3) Python Web (Flask)"
echo "4) Python API (FastAPI)"
echo "5) Back-End Node.js"
read -p "Escolha [1-5]: " STACK_OPT </dev/tty

case $STACK_OPT in
    1) STACK_FILE="static.yml" ;;
    2) STACK_FILE="spa.yml" ;;
    3) STACK_FILE="python-flask.yml" ;;
    4) STACK_FILE="python-fastapi.yml" ;;
    5) STACK_FILE="nodejs.yml" ;;
    *) STACK_FILE="static.yml" ;;
esac

# 5. Criação e Configuração do Repo
read -p "👉 Nome do Repositório: " REPO_NAME </dev/tty
gh repo create "$REPO_NAME" --private --add-readme
gh repo clone "$REPO_NAME"
cd "$REPO_NAME" || exit

# ... (Seu código original até o 'cd "$REPO_NAME"') ...

echo -e "${YELLOW}🛠️  Gerando arquivos base para a stack escolhida...${NC}"

# ... (Seu código original até o 'cd "$REPO_NAME"') ...

echo -e "${YELLOW}🛠️  Gerando arquivos base para a stack escolhida...${NC}"

case $STACK_OPT in
    1) # Estático
        echo "<h1>Lab $ALUNO_NUM - Inetz</h1>" > index.html
        ;;
    2) # SPA (React/Vue)
        echo "/* Projeto Front-end */" > README.md
        # Aqui poderia ser um 'npm init' se necessário
        ;;
    3|4) # Python Flask ou FastAPI
        # 1. Inicializa o Poetry (O coração do ambiente Python)
        poetry init --name "$REPO_NAME" --dependency flask --dependency gunicorn -n
        # 2. Cria o arquivo main.py base
        cat <<EOF > main.py
from flask import Flask
app = Flask(__name__)

@app.route("/")
def home():
    return {"status": "online", "lab": "$ALUNO_NUM", "ra": "$ALUNO_RA"}

if __name__ == "__main__":
    app.run(port=8000)
EOF
        poetry install
        ;;
    5) # Node.js
        npm init -y
        echo "const express = require('express');" > index.js
        ;;
esac

# ... (Seu código original continua com o curl do Workflow e o Push) ...

# ... (Seu código original continua com o curl do Workflow e o Push) ...


echo -e "\n[Config] Injetando variáveis no GitHub..."
gh variable set ALUNO_RA --body "$ALUNO_RA"
gh variable set ALUNO_NUM --body "$ALUNO_NUM"
gh variable set SSH_HOST --body "$SSH_HOST"
gh variable set SSH_USER --body "$SSH_USER"
gh variable set SSH_PORT --body "$SSH_PORT"

curl -s "$URL_CHAVE_SERVER" -o temp_key
gh secret set SSH_KEY < temp_key && rm -f temp_key

# 6. Injeção do Workflow Correto (O Coração do CI/CD)
mkdir -p .github/workflows
curl -s "$URL_WORKFLOWS/$STACK_FILE" -o .github/workflows/deploy.yml

git add . && git commit -m "chore: setup inetz $STACK_FILE"
git push origin main

echo -e "\n${GREEN}✅ TUDO PRONTO!${NC}"
echo -e "URL de Homologação: ${CYAN}http://lab$ALUNO_NUM.inetz.com.br${NC}"