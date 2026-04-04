#!/bin/bash

# --- Configurações Fixas de Infra Inetz 2026 ---
SSH_HOST="git.inetz.com.br"
URL_CHAVE="https://lab.inetz.com.br/devmaker/hotel/seduc/id_rsa_deploy"

# Cores para interface
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${CYAN}🚀 INETZ - SISTEMA DE GESTÃO DE LABS 2026 (v9.0)${NC}"

# --- Módulo de Verificação de Autenticação ---
if ! gh auth status &>/dev/null; then
    echo -e "${YELLOW}🔑 Autenticação necessária no GitHub...${NC}"
    gh auth login
fi

# --- MENU PRINCIPAL ---
echo -e "${YELLOW}🛠️  O QUE DESEJA FAZER?${NC}"
echo "1) Novo Projeto (Criar do Zero + Configurar Deploy)"
echo "2) Clonar Projeto (Troca de Máquina / Continuar Trabalho)"
echo "3) Manutenção (Configurar apenas ambiente base)"
read -p "Escolha [1-3]: " MODO_PRINCIPAL </dev/tty

case $MODO_PRINCIPAL in
    1) # MODO: NOVO PROJETO
        # Rótulos originais do setup_repo8.sh
        read -p "👉 Número na chamada (01-30): " ALUNO_NUM </dev/tty
        read -p "👉 Digite seu RA: " ALUNO_RA </dev/tty
        
        REPO_NAME="lab$ALUNO_NUM-ra$ALUNO_RA"

        # Escolha da Tecnologia
        echo -e "${YELLOW}📚 Escolha a Tecnologia:${NC}"
        echo "1) HTML/CSS/JS (Estático)"
        echo "2) Python Flask"
        echo "3) Python FastAPI (Estrutura Flat 2026)"
        read -p "Opção: " STACK_OPT </dev/tty

        # Criar Repo no GitHub
        gh repo create "$REPO_NAME" --public --confirm
        mkdir -p "$HOME/projetos" && cd "$HOME/projetos" || exit
        gh repo clone "$REPO_NAME"
        cd "$REPO_NAME" || exit

        # --- AJUSTE DE SEGURANÇA POETRY (Evita erro de DBus/Keyring) ---
        export PYTHON_KEYRING_BACKEND=keyring.backends.null.Keyring
        poetry config keyring.enabled false

        if [[ "$STACK_OPT" == "2" ]]; then
            # FLASK (Mantendo sua lógica anterior)
            poetry init --name "app-flask" --dependency flask --dependency gunicorn -n
            sed -i 's/\[tool.poetry\]/\[tool.poetry\]\npackage-mode = false/' pyproject.toml
            echo -e "from flask import Flask\napp = Flask(__name__)\n@app.route('/')\ndef home():\n    return {'status': 'online', 'lab': '$ALUNO_NUM', 'ra': '$ALUNO_RA'}" > main.py
            poetry install
        
        elif [[ "$STACK_OPT" == "3" ]]; then
            # FASTAPI (ESTRUTURA FLAT + PYTHON 3.13 + TASKIPY)
            echo -e "${CYAN}⚡ Configurando FastAPI Flat...${NC}"
            
            # Estrutura Flat: Pacotes no mesmo nível
            mkdir -p fast_zero/tests
            touch fast_zero/__init__.py
            touch tests/__init__.py

            # Inicialização com Python 3.13 e Dependências Corretas
            poetry init --name "fast-zero" \
                --dependency "fastapi[standard]" \
                --dependency "pydantic[email]" \
                --dev-dependency "taskipy" \
                --dev-dependency "pytest" \
                --python ">=3.13,<4.0" -n

            # Configuração Pedagógica (Venv Local)
            poetry config virtualenvs.in-project true

            # Injeção das Tasks no pyproject.toml para facilitar ao aluno
            cat <<EOF >> pyproject.toml

[tool.taskipy.tasks]
run = "fastapi dev fast_zero/app.py"
test = "pytest -v"
EOF

            # Injetando o Olá Mundo Correto
            cat <<EOF > fast_zero/app.py
from fastapi import FastAPI

app = FastAPI()

@app.get('/')
def read_root():
    return {'message': 'Olá Mundo - Inetz Lab $ALUNO_NUM', 'ra': '$ALUNO_RA'}
EOF
            echo -e "${YELLOW}📦 Instalando dependências (Aguarde...)${NC}"
            poetry install
        fi

        # Finalização Git e Push Inicial (Como no setup_repo8.sh)
        git add . && git commit -m "chore: initial setup lab$ALUNO_NUM-ra$ALUNO_RA"
        git branch -M main
        git push -u origin main
        echo -e "${GREEN}✅ Projeto criado e ambiente configurado!${NC}"
        ;;

    2) # MODO: CLONAR PROJETO (Troca de Máquina)
        export PYTHON_KEYRING_BACKEND=keyring.backends.null.Keyring
        
        echo -e "${CYAN}🔍 Buscando seus repositórios no GitHub...${NC}"
        gh repo list --limit 15
        
        read -p "👉 Digite o NOME do repositório para clonar: " REPO_TO_CLONE </dev/tty
        mkdir -p "$HOME/projetos" && cd "$HOME/projetos" || exit
        gh repo clone "$REPO_TO_CLONE"
        cd "$REPO_TO_CLONE" || exit

        # Auto-Setup do ambiente clonado
        if [ -f "pyproject.toml" ]; then
            echo -e "${YELLOW}📦 Detectado projeto Python. Sincronizando ambiente virtual...${NC}"
            poetry config keyring.enabled false
            poetry install
        fi
        echo -e "${GREEN}✅ Pronto para continuar o trabalho!${NC}"