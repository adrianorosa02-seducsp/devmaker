#!/bin/bash
#------------------------------------------------------------------------------
# setup_repo10.sh - Script de Configuração do Repositórios para o Inetz odoo dev
# Objetivo.: cria e configura o  ambiente  para  desenvolvimento  de  aplicações
#            Python, react, vue, Angular, criando o repositório remoto github  e 
#            e suas respectivas configurações de ambiente conforme  descrito  na 
#            documentação (link).
# Author...: driano Justino Rosa
# Data.....: 18/04/2026
#------------------------------------------------------------------------------- 
# Instruções: SSH_HOST="git.inetz.com.br" é o servidor onde o gitactions fara o 
#             deploy da aplicação,  SSH_USER="ubuntu" o usuário, SSH_PORT="22" e
#             URL_CHAVE="https://lab.inetz.com.br/devmaker/ava/seduc/id_rsa_deploy"
#             a chave de autenticação para deploy.
#--------------------------------------------------------------------------------
# Testes:
# 18/04/2026 Adriano Justino Rosa - 
#--------------------------------------------------------------------------------            
# --- Configurações Fixas de Infra Inetz 2026 ---
SSH_HOST="git.inetz.com.br"     
SSH_USER="ubuntu"
SSH_PORT="22"
URL_CHAVE="https://lab.inetz.com.br/devmaker/ava/seduc/id_rsa_deploy"
APP_NUM="$USER"
# Cores para interface
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${CYAN}🚀 INETZ - GERENCIAMENTO DE REPOSITORIOS GITHUB (v.0.1)${NC}"

# --- 1. Autenticação GitHub CLI ---
if ! gh auth status &>/dev/null; then
    echo -e "${YELLOW}🔑 Autenticação necessária no GitHub...${NC}"
    gh auth login
fi

# --- 2. Identidade do Aluno para o GitHub (Git Push/Pull) ---
read -e -p "👉 Confirme seu USUARIO LOCAL: " -i "$USER" ALIAS_NAME </dev/tty

if [ "$ALIAS_NAME" != "$USER" ]; then
    echo "⚠️ Atenção: Você está usando um alias ($ALIAS_NAME) diferente do usuário logado ($USER)."
    read -p "Deseja continuar mesmo assim? (s/n): " CONFIRM
    [[ "$CONFIRM" != "s" ]] && exit 1
fi

if [ ! -f "$HOME/.ssh/id_rsa_$ALIAS_NAME" ]; then
    echo -e "${YELLOW}🔐 Gerando chave de acesso Git para $ALIAS_NAME...${NC}"
    ssh-keygen -t ed25519 -C "$ALIAS_NAME@github" -f "$HOME/.ssh/id_rsa_$ALIAS_NAME" -N ""
    gh ssh-key add "$HOME/.ssh/id_rsa_$ALIAS_NAME.pub" --title "Chaves para github - $ALIAS_NAME"
fi

# --- 3. Identidade de Infra para o Deploy (Mestre) ---
echo -e "${YELLOW}📥 Baixando chave mestra de Deploy...${NC}"
curl -s -L "$URL_CHAVE" -o "/tmp/id_rsa_deploy"
chmod 600 "/tmp/id_rsa_deploy"

# --- 4. Configuração do Repositório ---
#read -p "👉 Informe o Sub-Dominio da APP (01-30): " APP_NUM </dev/tty
#read -p "👉 Nome do Repositório: " REPO_NAME </dev/tty
#read -p "👉 O repositório será Publico? (y/n): " PUBLIC </dev/tty




# --- 1. Identificação do Projeto ---
echo -e "\n${YELLOW}[ 1 / 2 ] IDENTIFICAÇÃO DO PROJETO${NC}"
echo -e "${CYAN}🔍 Buscando repositórios no seu GitHub...${NC}"

# Captura os repositórios do usuário logado
mapfile -t REPOS < <(gh repo list --limit 30 --json name -q '.[].name')

echo -e "------------------------------------------------------"
for i in "${!REPOS[@]}"; do
    printf "${CYAN}%2d)${NC} %-30s " "$((i+1))" "${REPOS[$i]}"
    if (( (i+1) % 2 == 0 )); then echo ""; fi
done
echo -e "\n------------------------------------------------------"
echo -e "${YELLOW} 0)${NC} Criar um NOVO repositório (Do zero)"
echo -e "${YELLOW} F)${NC} Fazer FORK de um repositório (Minha conta: adrianorosa02-seducsp)"
echo -e "------------------------------------------------------"

read -p "👉 Selecione a opção ou número: " OPTION </dev/tty

if [[ "$OPTION" == "0" ]]; then
    read -p "👉 Nome do NOVO repositório: " REPO_NAME </dev/tty
    # Segue para criação...

elif [[ "$OPTION" == "f" || "$OPTION" == "F" ]]; then
    PROFESSOR="adrianorosa02-seducsp"
    echo -e "\n${CYAN}🔍 Buscando Templates oficiais em @$PROFESSOR...${NC}"
    
    # O filtro 'select(contains("Template"))' garante que apenas 
    # repositórios com essa palavra no nome apareçam na lista.
    mapfile -t TEMPLATES < <(gh repo list "$PROFESSOR" --limit 50 --json name -q '.[].name | select(contains("Template"))')
    
    if [ ${#TEMPLATES[@]} -eq 0 ]; then
        echo -e "${RED}❌ Nenhum repositório de Template encontrado em $PROFESSOR.${NC}"
    else
        echo -e "------------------------------------------------------"
        for i in "${!TEMPLATES[@]}"; do
            printf "${YELLOW}%2d)${NC} %-30s " "$((i+1))" "${TEMPLATES[$i]}"
            if (( (i+1) % 2 == 0 )); then echo ""; fi
        done
        echo -e "\n------------------------------------------------------"
        read -p "👉 Selecione o número do Template para Fork: " T_CHOICE </dev/tty
        
        REPO_NAME=${TEMPLATES[$((T_CHOICE-1))]}
        echo -e "${YELLOW}🍴 Fazendo Fork de $PROFESSOR/$REPO_NAME...${NC}"
        gh repo fork "$PROFESSOR/$REPO_NAME" --clone=false 2>/dev/null || echo "⚠️ Você já possui este fork."
    fi

else
    # Opção numérica da lista principal
    REPO_NAME=${REPOS[$((OPTION-1))]}
fi

# Agora o script segue com REPO_NAME definido para criar a pasta e clonar/vincular.

# 1. Define e entra na pasta alvo
TARGET_DIR="$HOME/projetos/$REPO_NAME"
mkdir -p "$TARGET_DIR" && cd "$TARGET_DIR" || exit

# 2. Inicializa o Git localmente (se não existir)
# Isso garante que a pasta ATUAL seja a raiz do repositório
if [ ! -d ".git" ]; then
    git init
    echo "✨ Repositório local inicializado em: $(pwd)"
else
    echo "ℹ️ Repositório local já existe em: $(pwd)"
fi

# 3. Cria o repositório no GitHub (apenas o "balde" vazio no servidor)
# O comando 'create' sem 'clone' apenas registra o nome no GitHub
if [ "$PUBLIC" = "y" ]; then
    gh repo create "$REPO_NAME" --public --confirm 2>/dev/null || echo "ℹ️ Repo já existe no GitHub"
else
    gh repo create "$REPO_NAME" --private --confirm 2>/dev/null || echo "ℹ️ Repo já existe no GitHub"
fi


# --- 5. Injeção de Segredos e Variáveis no GitHub ---
echo -e "${YELLOW}⚙️  Configurando Segredos de Deploy...${NC}"
gh variable set APP_NUM --body "$APP_NUM"
gh variable set ALIAS_NAME --body "$ALIAS_NAME"
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
name: Deploy APP Lab$APP_NUM
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
            sudo mkdir -p /var/inetpub/wwwroot/lab\${{ vars.APP_NUM }}
            sudo chown -R \${{ vars.SSH_USER }}:\${{ vars.SSH_USER }} /var/inetpub/wwwroot/lab\${{ vars.APP_NUM }}
            sudo chmod -R 775 /var/inetpub/wwwroot/lab\${{ vars.APP_NUM }}
      - name: Copiar Arquivos
        uses: appleboy/scp-action@master
        with:
          host: \${{ vars.SSH_HOST }}
          username: \${{ vars.SSH_USER }}
          key: \${{ secrets.SSH_KEY }}
          port: \${{ vars.SSH_PORT }}
          source: "."
          target: "/var/inetpub/wwwroot/lab\${{ vars.APP_NUM }}"
      - name: Reiniciar Docker
        uses: appleboy/ssh-action@master
        with:
          host: \${{ vars.SSH_HOST }}
          username: \${{ vars.SSH_USER }}
          key: \${{ secrets.SSH_KEY }}
          port: \${{ vars.SSH_PORT }}
          script: docker service update --force labs_python_lab\${{ vars.APP_NUM }}
EOF

# --- Finalização ---
# --- 4. Configuração do Repositório ---

if [ -d ".git" ]; then
    echo -e "${YELLOW}🔄 Vinculando projeto local existente ao GitHub...${NC}"
    
    # Captura o usuário dinamicamente para evitar hardcoding
    GIT_USER=$(gh api user -q .login)
    REMOTE_URL="https://github.com/$GIT_USER/$REPO_NAME.git"

    
    # Tenta adicionar; se já existir (erro), ele apenas atualiza a URL
    git remote add origin "$REMOTE_URL" 2>/dev/null || git remote set-url origin "$REMOTE_URL"
    
    git branch -M main
    
fi
git add . && git commit -m "chore: setup lab$APP_NUM com deploy master"
git branch -M main
git push -u origin main

echo -e "${GREEN}✅ Tudo pronto! O Handshake agora vai usar a chave mestra.${NC}"
echo -e "🌐 Acesse: ${CYAN}https://lab${APP_NUM}.inetz.com.br${NC}"