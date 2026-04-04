#!/bin/bash

# --- Configurações Fixas de Infra Inetz 2026 ---
SSH_HOST="git.inetz.com.br"
SSH_USER="ubuntu"
SSH_PORT="22"
URL_CHAVE="https://lab.inetz.com.br/devmaker/ava/seduc/id_rsa_deploy"

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
        read -p "👉 Digite seu RA ou Alias (ex: sofridabr): " ALUNO_RA </dev/tty
        
        # Geração de Chaves SSH (Identidade do Aluno)
        echo -e "${YELLOW}🔐 Gerando chaves de acesso para $ALUNO_RA...${NC}"
        ssh-keygen -t ed25519 -C "$ALUNO_RA@inetz-lab" -f "$HOME/.ssh/id_rsa_$ALUNO_RA" -N ""
        gh ssh-key add "$HOME/.ssh/id_rsa_$ALUNO_RA.pub" --title "Inetz Lab - $ALUNO_RA"

        read -p "👉 Número do Notebook/Estação (01-30): " ALUNO_NUM </dev/tty
        read -p "👉 Nome do Repositório (ex: back-end-reginato): " REPO_NAME </dev/tty

        # Criar Repo no GitHub
        gh repo create "$REPO_NAME" --public --confirm
        mkdir -p "$HOME/projetos" && cd "$HOME/projetos" || exit
        gh repo clone "$REPO_NAME"
        cd "$REPO_NAME" || exit

        # --- 3. Identidade de Infra para o Deploy (Mestre) ---
        echo -e "${YELLOW}📥 Baixando chave mestra de Deploy...${NC}"
        curl -s -L "$URL_CHAVE" -o "/tmp/id_rsa_deploy"
        chmod 600 "/tmp/id_rsa_deploy"

        # --- CONFIGURAÇÃO DE SEGREDOS E VARIÁVEIS (CI/CD) ---
        echo -e "${YELLOW}⚙️  Configurando Segredos de Deploy...${NC}"
        gh variable set ALUNO_NUM --body "$ALUNO_NUM"
        gh variable set ALUNO_RA --body "$ALUNO_RA"
        gh variable set SSH_HOST --body "$SSH_HOST"
        gh variable set SSH_USER --body "$SSH_USER"
        gh variable set SSH_PORT --body "$SSH_PORT"

        # AQUI ESTÁ A CORREÇÃO: Injetamos a chave mestra no segredo de Actions
        gh secret set SSH_KEY < "/tmp/id_rsa_deploy"
        rm "/tmp/id_rsa_deploy"
        

        # --- ESCOLHA DA STACK ---
        echo -e "${YELLOW}Qual a Stack do Projeto?${NC}"
        echo "1) HTML/CSS (Estático)"
        echo "2) Python Flask (API)"
        echo "3) Python FastAPI (Estrutura Inetz/Dunossauro)"
        read -p "Escolha [1-3]: " STACK_OPT </dev/tty

        # Blindagem contra erro de DBus/Keyring
        export PYTHON_KEYRING_BACKEND=keyring.backends.null.Keyring
        poetry config keyring.enabled false

        
        if [[ "$STACK_OPT" == "3" ]]; then
            # 1. Criação da estrutura de pastas
            mkdir -p fast_zero/tests
            touch fast_zero/__init__.py
            
            # 2. Inicialização limpa do Poetry
            # Removi o --dev-dependency taskipy daqui para adicioná-lo via comando depois,
            # evitando conflitos no arquivo gerado pelo init.
            poetry init --name "fast-zero" \
                --dependency "fastapi[standard]" \
                --dependency "pydantic[email]" \
                --python ">=3.12,<4.0" -n
            
            poetry config virtualenvs.in-project true

            # 3. Adição das dependências de desenvolvimento de forma limpa
            poetry add taskipy pytest --group dev

            # 4. Injeção das Tasks (Usando um método que evita duplicidade)
            # Primeiro, garantimos que não existam blocos de taskipy antigos
            sed -i '/\[tool.taskipy.tasks\]/,$d' pyproject.toml

            cat <<EOF >> pyproject.toml

[tool.taskipy.tasks]
run = "fastapi dev fast_zero/app.py"
test = "pytest -v"
EOF

            # 5. Código Inicial
            cat <<EOF > fast_zero/app.py
from fastapi import FastAPI

app = FastAPI()

@app.get('/')
def read_root():
    return {
        'message': 'Olá Mundo - Inetz Lab $ALUNO_NUM',
        'aluno': '$ALUNO_RA',
        'status': 'online'
    }
EOF
            # Instalação final
            poetry install
        fi

        # --- CONFIGURAÇÃO DO WORKFLOW DE DEPLOY ---
        mkdir -p .github/workflows
        cat <<EOF > .github/workflows/deploy.yml
name: Deploy Inetz Lab
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Código
        uses: actions/checkout@v4

      - name: Preparar Diretorio no Servidor
        uses: appleboy/ssh-action@master
        with:
          host: \${{ vars.SSH_HOST }}
          username: \${{ vars.SSH_USER }}
          key: \${{ secrets.SSH_KEY }}
          port: \${{ vars.SSH_PORT }}
          script: |
            sudo mkdir -p /var/inetpub/wwwroot/lab\${{ vars.ALUNO_NUM }}
            sudo chown -R \${{ vars.SSH_USER }}:\${{ vars.SSH_USER }} /var/inetpub/wwwroot/lab\${{ vars.ALUNO_NUM }}

      - name: Copiar arquivos para o Lab
        uses: appleboy/scp-action@master
        with:
          host: \${{ vars.SSH_HOST }}
          username: \${{ vars.SSH_USER }}
          key: \${{ secrets.SSH_KEY }}
          port: \${{ vars.SSH_PORT }}
          source: "."
          target: "/var/inetpub/wwwroot/lab\${{ vars.ALUNO_NUM }}"

      - name: Atualizar Servico Docker
        uses: appleboy/ssh-action@master
        with:
          host: \${{ vars.SSH_HOST }}
          username: \${{ vars.SSH_USER }}
          key: \${{ secrets.SSH_KEY }}
          port: \${{ vars.SSH_PORT }}
          script: |
            docker service update --force labs_python_lab\${{ vars.ALUNO_NUM }}
EOF

        git add . && git commit -m "chore: initial setup lab$ALUNO_NUM"
        git branch -M main
        git push -u origin main

        echo -e "${GREEN}✅ Projeto criado e Deploy iniciado!${NC}"
        echo -e "${CYAN}------------------------------------------${NC}"
        echo -e "💻 LOCAL:  ${YELLOW}http://localhost:8000${NC}"
        echo -e "🌐 REMOTO: ${YELLOW}https://lab${ALUNO_NUM}.inetz.com.br${NC}"
        echo -e "🚀 Dica: Use 'poetry run task run' para iniciar local."
        echo -e "${CYAN}------------------------------------------${NC}"
        ;;

    2) # MODO: CLONAR PROJETO
        gh repo list --limit 15
        read -p "👉 Nome do repositório para clonar: " REPO_TO_CLONE </dev/tty
        mkdir -p "$HOME/projetos" && cd "$HOME/projetos" || exit
        gh repo clone "$REPO_TO_CLONE"
        cd "$REPO_TO_CLONE" || exit
        
        export PYTHON_KEYRING_BACKEND=keyring.backends.null.Keyring
        poetry config keyring.enabled false
        poetry install
        echo -e "${GREEN}✅ Ambiente sincronizado!${NC}"
        ;;

    3) # MODO: MANUTENÇÃO
        poetry config keyring.enabled false
        echo -e "${GREEN}✅ Configurações de Keyring otimizadas.${NC}"
        ;;
esac