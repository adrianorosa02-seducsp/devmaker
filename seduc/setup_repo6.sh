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
echo -e "${CYAN}🚀 INETZ - CONFIGURADOR DE AMBIENTE 2026${NC}"

# 1. Identidade e Slot do Lab
read -p "👉 Digite seu RA: " RAW_RA </dev/tty
ALUNO_RA=$(echo "$RAW_RA" | tr -d ' ')

read -p "👉 Seu número na chamada (01-30): " RAW_NUM </dev/tty
ALUNO_NUM=$(printf "%02d" $((10#$RAW_NUM)))

# 2. Garantia de Diretório Local
BASE_DIR="$HOME/projetos"
mkdir -p "$BASE_DIR" && cd "$BASE_DIR" || exit

# 3. Configuração SSH Personalizada por RA
KEY_NAME="id_ed25519_inetz_$ALUNO_RA"
KEY_PATH="$HOME/.ssh/$KEY_NAME"
mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"

if [ ! -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}Gerando chave SSH para o RA $ALUNO_RA...${NC}"
    ssh-keygen -t ed25519 -C "inetz-$ALUNO_RA" -f "$KEY_PATH" -N ""
    gh ssh-key add "${KEY_PATH}.pub" --title "Inetz-RA-$ALUNO_RA"
fi

# Configura o SSH para usar a chave correta
sed -i "/Host github.com/,/IdentitiesOnly yes/d" "$HOME/.ssh/config" 2>/dev/null
echo -e "Host github.com\n    HostName github.com\n    User git\n    IdentityFile $KEY_PATH\n    IdentitiesOnly yes" >> "$HOME/.ssh/config"

# 4. Seleção de Stack
echo -e "\n${YELLOW}Qual o tipo de projeto?${NC}"
echo "1) HTML/CSS/JS (Estático)"
echo "2) Front-End Moderno (SPA)"
echo "3) Python Flask (API)"
echo "4) Python FastAPI (API)"
echo "5) Node.js Backend"
read -p "Escolha [1-5]: " STACK_OPT </dev/tty

case $STACK_OPT in
    1) STACK_FILE="static.yml" ;;
    2) STACK_FILE="spa.yml" ;;
    3) STACK_FILE="python-flask.yml" ;;
    4) STACK_FILE="python-fastapi.yml" ;;
    5) STACK_FILE="nodejs.yml" ;;
    *) STACK_FILE="static.yml" ;;
esac

# 5. Criação do Repo
read -p "👉 Nome do Repositório: " REPO_NAME </dev/tty
gh repo create "$REPO_NAME" --private
mkdir -p "$REPO_NAME" && cd "$REPO_NAME" || exit
git init

# ... (após o git init) ...

# 1. ADICIONAR O REMOTE IMEDIATAMENTE
# O 'gh variable set' precisa que o git remote já exista localmente
git remote add origin "git@github.com:$(gh api user -q .login)/$REPO_NAME.git" 2>/dev/null

# 2. GERAÇÃO DE CÓDIGO E POETRY
echo -e "\n${YELLOW}🛠️  Gerando arquivos base...${NC}"

case $STACK_OPT in
    3|4) # Python Flask / FastAPI
        # Inicializa o pyproject.toml
        poetry init --name "app" --dependency flask --dependency gunicorn -n
        
        # AJUSTE 1: Injeta o package-mode=false ANTES do install
        sed -i 's/\[tool.poetry\]/\[tool.poetry\]\npackage-mode = false/' pyproject.toml
        
        cat <<EOF > main.py
from flask import Flask
app = Flask(__name__)
@app.route("/")
def home():
    return {"status": "online", "lab": "$ALUNO_NUM", "ra": "$ALUNO_RA"}
if __name__ == "__main__":
    app.run(port=8000)
EOF
        
        # AJUSTE 2: Usa o --no-root para ignorar a falta da pasta 'app'
        poetry install --no-root
        ;;
esac

# ... (segue para o gh variable set e o push final) ...

# 7. Injeção de Variáveis e Segredos no GitHub
echo -e "\n[Config] Injetando variáveis no GitHub..."
gh variable set ALUNO_RA --body "$ALUNO_RA"
gh variable set ALUNO_NUM --body "$ALUNO_NUM"
gh variable set SSH_HOST --body "$SSH_HOST"
gh variable set SSH_USER --body "$SSH_USER"
gh variable set SSH_PORT --body "$SSH_PORT"

# Baixa a chave privada de deploy do seu servidor para o GitHub Secrets
curl -sL "$URL_CHAVE" -o temp_key && gh secret set SSH_KEY < temp_key && rm -f temp_key

# 8. Injeção do Workflow Remoto (O Coração do CI/CD)
mkdir -p .github/workflows
curl -sL "$URL_WORKFLOWS/$STACK_FILE" -o .github/workflows/deploy.yml

# 9. Primeiro Push (Dispara o Deploy)
git remote add origin "git@github.com:$(gh api user -q .login)/$REPO_NAME.git"
git add . && git commit -m "chore: initial setup inetz $STACK_FILE"
git branch -M main
git push -u origin main

echo -e "\n${GREEN}✅ BINGO! TUDO PRONTO!${NC}"
echo -e "URL de Homologação: ${CYAN}https://lab$ALUNO_NUM.inetz.com.br${NC}"