#!/bin/bash

# --- Configurações Fixas de Infraestrutura ---
# Estas variáveis o aluno não precisa digitar, o script injeta no GitHub dele
SSH_HOST="200.xxx.xxx.xxx"  # Seu IP do srv-docker-master
SSH_USER="root"
SSH_PORT="22"
URL_CHAVE="https://seu-link-seguro.com/id_rsa_deploy" # Link para baixar a chave temporariamente

# --- 1. Coleta de Dados do Aluno ---
echo "------------------------------------------------"
echo "🚀 SETUP DE REPOSITÓRIO - PROJETO INETZ (SEDUC)"
echo "------------------------------------------------"

read -p "👉 Digite seu RA (ex: 12345): " ALUNO_RA
read -p "👉 Nome do Projeto (ex: api-devs): " ALUNO_PROJETO

# O nome do repositório no GitHub será o nome do projeto
REPO_NAME="$ALUNO_PROJETO"

# --- 2. Criação do Repositório ---
echo -e "\n[1/5] 📂 Criando repositório privado no GitHub..."
gh repo create "$REPO_NAME" --private --add-readme

# --- 3. Configuração de Metadados (Variables) ---
# Essas variáveis serão lidas pelo futuro arquivo de Actions (CI/CD)
echo -e "[2/5] 📦 Injetando metadados do projeto..."
gh variable set ALUNO_RA --body "$ALUNO_RA" --repo "$REPO_NAME"
gh variable set ALUNO_PROJETO --body "$ALUNO_PROJETO" --repo "$REPO_NAME"
gh variable set SSH_HOST --body "$SSH_HOST" --repo "$REPO_NAME"
gh variable set SSH_USER --body "$SSH_USER" --repo "$REPO_NAME"
gh variable set SSH_PORT --body "$SSH_PORT" --repo "$REPO_NAME"

# --- 4. Segurança (Segredo SSH) ---
echo -e "[3/5] 🔐 Configurando chave de acesso ao servidor..."
# Download da chave, injeção no Secret e remoção imediata
curl -s "$URL_CHAVE" -o temp_key
if [ -f "temp_key" ]; then
    gh secret set SSH_KEY --repo "$REPO_NAME" < temp_key
    rm -f temp_key
    echo "✅ Secret SSH_KEY configurada e chave temporária removida."
else
    echo "❌ Erro ao baixar a chave. Verifique o link."
fi

# --- 5. Governança (Admins) ---
echo -e "[4/5] 👥 Adicionando professores como administradores..."
if [ -f "admins.txt" ]; then
    while read -r ADMIN || [ -n "$ADMIN" ]; do
        if [ ! -z "$ADMIN" ]; then
            echo "➕ Adicionando $ADMIN..."
            gh api -X PUT "/repos/:owner/$REPO_NAME/collaborators/$ADMIN" -f permission=admin > /dev/null
        fi
    done < admins.txt
else
    # Caso o arquivo não exista, adiciona você manualmente como fallback
    gh api -X PUT "/repos/:owner/$REPO_NAME/collaborators/adrianorosa02-seducsp" -f permission=admin > /dev/null
fi

# --- Finalização ---
echo -e "\n[5/5] ✅ Configuração concluída com sucesso!"
echo "------------------------------------------------"
echo "🔗 Seu repositório: https://github.com/$(gh api user -q .login)/$REPO_NAME"
echo "------------------------------------------------"