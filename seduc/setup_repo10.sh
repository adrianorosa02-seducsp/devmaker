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

# --- 1. Autenticação GitHub CLI ---
if ! gh auth status &>/dev/null; then
    echo -e "${YELLOW}🔑 Autenticação necessária no GitHub...${NC}"
    gh auth login
fi

# --- 2. Identidade do Aluno para o GitHub (Git Push/Pull) ---
read -p "👉 Digite seu RA ou Alias (ex: sofridabr): " ALUNO_RA </dev/tty

if [ ! -f "$HOME/.ssh/id_rsa_$ALUNO_RA" ]; then
    echo -e "${YELLOW}🔐 Gerando chave de acesso Git para $ALUNO_RA...${NC}"
    ssh-keygen -t ed25519 -C "$ALUNO_RA@inetz-lab" -f "$HOME/.ssh/id_rsa_$ALUNO_RA" -N ""
    gh ssh-key add "$HOME/.ssh/id_rsa_$ALUNO_RA.pub" --title "Inetz Lab Git - $ALUNO_RA"
fi

# --- 3. Identidade de Infra para o Deploy (Mestre) ---
echo -e "${YELLOW}📥 Baixando chave mestra de Deploy...${NC}"
curl -s -L "$URL_CHAVE" -o "/tmp/id_rsa_deploy"
chmod 600 "/tmp/id_rsa_deploy"

# --- 4. Configuração do Repositório ---
read -p "👉 Número do Notebook/Estação (01-30): " ALUNO_NUM </dev/tty
read -p "👉 Nome do Repositório (ex: back-end-reginato): " REPO_NAME </dev/tty

gh repo create "$REPO_NAME" --public --confirm
mkdir -p "$HOME/projetos" && cd "$HOME/projetos" || exit
gh repo clone "$REPO_NAME"
cd "$REPO_NAME" || exit

# --- 5. Injeção de Segredos e Variáveis no GitHub ---
echo -e "${YELLOW}⚙️  Configurando Segredos de Deploy...${NC}"
gh variable set ALUNO_NUM --body "$ALUNO_NUM"
gh variable set ALUNO_RA --body "$ALUNO_RA"
gh variable set SSH_HOST --body "$SSH_HOST"
gh variable set SSH_USER --body "$SSH_USER"
gh variable set SSH_PORT --body "$SSH_PORT"

# AQUI ESTÁ A CORREÇÃO: Injetamos a chave mestra no segredo de Actions
gh secret set SSH_KEY < "/tmp/id_rsa_deploy"
rm "/tmp/id_rsa_deploy"

# --- 6. Setup da Stack FastAPI (Padrão Dunossauro) ---
export PYTHON_KEYRING_BACKEND=keyring.backends.null.Keyring
poetry config keyring.enabled false

mkdir -p fast_zero/tests
touch fast_zero/__init__.py

poetry init --name "fast-zero" \
    --dependency "fastapi[standard]" \
    --dependency "pydantic[email]" \
    --python ">=3.12,<4.0" -n

poetry config virtualenvs.in-project true
poetry add taskipy pytest --group dev

# Limpa e insere as tasks no TOML
sed -i '/\[tool.taskipy.tasks\]/,$d' pyproject.toml
cat <<EOF >> pyproject.toml

[tool.taskipy.tasks]
run = "fastapi dev fast_zero/app.py"
test = "pytest -v"
EOF

# Arquivo Inicial
cat <<EOF > fast_zero/app.py
from fastapi import FastAPI

app = FastAPI()

@app.get('/')
def read_root():
    return {'message': 'Olá Mundo - Inetz Lab $ALUNO_NUM', 'aluno': '$ALUNO_RA'}
EOF

poetry install

# --- 7. Workflow de Deploy ---
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
      - name: Preparar e Enviar
        uses: appleboy/ssh-action@master
        with:
          host: \${{ vars.SSH_HOST }}
          username: \${{ vars.SSH_USER }}
          key: \${{ secrets.SSH_KEY }}
          port: \${{ vars.SSH_PORT }}
          script: |
            sudo mkdir -p /var/inetpub/wwwroot/lab\${{ vars.ALUNO_NUM }}
            sudo chown -R \${{ vars.SSH_USER }}:\${{ vars.SSH_USER }} /var/inetpub/wwwroot/lab\${{ vars.ALUNO_NUM }}
            sudo chmod -R 775 /var/inetpub/wwwroot/lab\${{ vars.ALUNO_NUM }}
      - name: Copiar Arquivos
        uses: appleboy/scp-action@master
        with:
          host: \${{ vars.SSH_HOST }}
          username: \${{ vars.SSH_USER }}
          key: \${{ secrets.SSH_KEY }}
          port: \${{ vars.SSH_PORT }}
          source: "."
          target: "/var/inetpub/wwwroot/lab\${{ vars.ALUNO_NUM }}"
      - name: Reiniciar Docker
        uses: appleboy/ssh-action@master
        with:
          host: \${{ vars.SSH_HOST }}
          username: \${{ vars.SSH_USER }}
          key: \${{ secrets.SSH_KEY }}
          port: \${{ vars.SSH_PORT }}
          script: docker service update --force labs_python_lab\${{ vars.ALUNO_NUM }}
EOF

# --- Finalização ---
git add . && git commit -m "chore: setup lab$ALUNO_NUM com deploy master"
git branch -M main
git push -u origin main

echo -e "${GREEN}✅ Tudo pronto! O Handshake agora vai usar a chave mestra.${NC}"
echo -e "🌐 Acesse: ${CYAN}https://lab${ALUNO_NUM}.inetz.com.br${NC}"