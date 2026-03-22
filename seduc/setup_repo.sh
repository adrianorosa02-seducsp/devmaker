#!/bin/bash

# --- Configurações Fixas ---
SSH_HOST="git.inetz.com.br"
SSH_USER="ubuntu"
SSH_PORT="22"
URL_CHAVE="https://lab.inetz.com.br/devmaker/hotel/seduc/id_rsa_deploy"

echo "1. Criar NOVO Projeto"
echo "2. Troquei de Máquina / Clonar Projeto Existente"
read -p "Selecione uma opção: " OPT

if [ "$OPT" == "1" ]; then
    read -p "Digite seu RA: " ALUNO_RA
    read -p "Nome do Projeto: " REPO_NAME
    
    # Criação e Configuração (seu código anterior aqui)
    gh repo create "$REPO_NAME" --private --add-readme
    gh variable set ALUNO_RA --body "$ALUNO_RA" --repo "$REPO_NAME"
    # ... Injeta as demais variáveis ...

elif [ "$OPT" == "2" ]; then
    echo "Buscando seus projetos no GitHub..."
    gh repo list --limit 10
    read -p "Qual projeto deseja clonar? " REPO_NAME
    gh repo clone "$REPO_NAME"
    cd "$REPO_NAME"
    echo "Ambiente sincronizado!"
fi


