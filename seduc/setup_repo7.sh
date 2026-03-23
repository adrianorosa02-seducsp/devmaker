#!/bin/bash

# --- Configurações Fixas de Infra Inetz 2026 ---
SSH_HOST="git.inetz.com.br"
SSH_USER="ubuntu"
SSH_PORT="22"
URL_CHAVE="https://lab.inetz.com.br/devmaker/hotel/seduc/id_rsa_deploy"
URL_WORKFLOWS="https://lab.inetz.com.br/devmaker/hotel/seduc/workflows"

# Cores para interface
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${CYAN}🚀 INETZ - SISTEMA DE GESTÃO DE LABS 2026${NC}"

# --- Módulo de Verificação Base ---
if ! gh auth status &>/dev/null; then
    echo -e "${RED}❌ Erve: Você precisa estar logado no GitHub (gh auth login)${NC}"
    exit 1
fi

# --- MENU PRINCIPAL ---
echo -e "${YELLOW}🛠️  O QUE DESEJA FAZER?${NC}"
echo "1) Novo Projeto (Criar do Zero + Configurar Deploy)"
echo "2) Clonar Projeto (Troca de Máquina / Continuar Trabalho)"
echo "3) Manutenção (Configurar apenas ambiente base)"
read -p "Escolha [1-3]: " MODO_PRINCIPAL </dev/tty

# --- MÓDULO DE IDENTIDADE (Comum aos fluxos) ---
read -p "👉 Digite seu RA: " RAW_RA </dev/tty
ALUNO_RA=$(echo "$RAW_RA" | tr -d ' ')

# Configuração de Chave SSH por RA
KEY_NAME="id_ed25519_inetz_$ALUNO_RA"
KEY_PATH="$HOME/.ssh/$KEY_NAME"
mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"

if [ ! -f "$KEY_PATH" ]; then
    echo -e "${YELLOW}🔑 Gerando chave SSH para o RA $ALUNO_RA...${NC}"
    ssh-keygen -t ed25519 -C "inetz-$ALUNO_RA" -f "$KEY_PATH" -N ""
    gh ssh-key add "${KEY_PATH}.pub" --title "Inetz-RA-$ALUNO_RA"
    sleep 15
fi

# Ajusta o SSH Config para usar a chave correta
sed -i "/Host github.com/,/IdentitiesOnly yes/d" "$HOME/.ssh/config" 2>/dev/null
echo -e "Host github.com\n    HostName github.com\n    User git\n    IdentityFile $KEY_PATH\n    IdentitiesOnly yes" >> "$HOME/.ssh/config"

# --- EXECUÇÃO DOS MODOS ---

case $MODO_PRINCIPAL in
    1) # MODO: NOVO PROJETO
        read -p "👉 Número na chamada (01-30): " RAW_NUM </dev/tty
        ALUNO_NUM=$(printf "%02d" $((10#$RAW_NUM)))
        # --- NOVO: Preparação Remota do Servidor ---
        echo -e "${YELLOW}🌐 Preparando diretório no servidor remoto...${NC}"
        
        echo -e "\n${YELLOW}Qual a Stack do Projeto?${NC}"
        echo "1) HTML/CSS (Estático)"
        echo "2) Python Flask (API)"
        echo "3) Python FastAPI (API)"
        read -p "Escolha [1-3]: " STACK_OPT </dev/tty
        
        case $STACK_OPT in
            1) STACK_FILE="static.yml" ;;
            2) STACK_FILE="python-flask.yml" ;;
            3) STACK_FILE="python-fastapi.yml" ;;
            *) STACK_FILE="static.yml" ;;
        esac

        read -p "👉 Nome do Repositório: " REPO_NAME </dev/tty
        ssh -p $SSH_PORT $SSH_USER@$SSH_HOST "sudo mkdir -p /var/inetpub/wwwroot/lab$ALUNO_NUM && sudo chown -R $SSH_USER:$SSH_USER /var/inetpub/wwwroot/lab$ALUNO_NUM"
        gh repo create "$REPO_NAME" --private --clone
        cd "$REPO_NAME" || exit
        
        # Injeção de Variáveis de Deploy no GitHub
        echo -e "${YELLOW}⚙️  Configurando Segredos de Deploy...${NC}"
        gh variable set ALUNO_NUM --body "$ALUNO_NUM"
        gh variable set ALUNO_RA --body "$ALUNO_RA"
        gh variable set SSH_HOST --body "$SSH_HOST"
        gh variable set SSH_PORT --body "$SSH_PORT"
        gh variable set SSH_USER --body "$SSH_USER"
        curl -sL "$URL_CHAVE" -o temp_key && gh secret set SSH_KEY < temp_key && rm -f temp_key

        # Geração de Boilerplate (Arquivos Iniciais)
        mkdir -p .github/workflows
        curl -sL "$URL_WORKFLOWS/$STACK_FILE" -o .github/workflows/deploy.yml

        if [[ "$STACK_OPT" == "2" || "$STACK_OPT" == "3" ]]; then
            poetry init --name "app" --dependency flask --dependency gunicorn -n
            sed -i 's/\[tool.poetry\]/\[tool.poetry\]\npackage-mode = false/' pyproject.toml
            cat <<EOF > main.py
from flask import Flask
app = Flask(__name__)
@app.route("/")
def home():
    return {"status": "online", "lab": "$ALUNO_NUM", "ra": "$ALUNO_RA"}
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
EOF
            poetry install --no-root
        fi

        git add . && git commit -m "chore: initial setup lab$ALUNO_NUM"
        git branch -M main
        git push -u origin main
        echo -e "${GREEN}✅ Projeto criado e Deploy iniciado!${NC}"
        ;;

    2) # MODO: CLONAR PROJETO (Troca de Máquina)
        echo -e "${CYAN}🔍 Buscando seus repositórios no GitHub...${NC}"
        # Lista repositórios e permite que o usuário veja os nomes
        gh repo list --limit 15
        
        read -p "👉 Digite o NOME do repositório para clonar: " REPO_TO_CLONE </dev/tty
        mkdir -p "$HOME/projetos" && cd "$HOME/projetos" || exit
        gh repo clone "$REPO_TO_CLONE"
        
        echo -e "${GREEN}✅ Repositório clonado com sucesso em ~/projetos/$REPO_TO_CLONE${NC}"
        ;;

    3) # MODO: MANUTENÇÃO BASE
        sudo mkdir -p /var/inetpub/wwwroot/projetos
        sudo chown -R $USER:$USER /var/inetpub/wwwroot/projetos
        echo -e "${GREEN}✅ Ambiente base /var/inetpub/wwwroot validado!${NC}"
        ;;
esac

echo -e "\n${CYAN}BINGO! Operação finalizada.${NC}"