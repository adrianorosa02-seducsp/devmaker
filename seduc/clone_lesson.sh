#!/bin/bash

# --- Configurações Inetz ---
TEMPLATE_REPO="git@github.com:adrianorosa02-seducsp/back-template-fastapi.git"
LOG_FILE="$HOME/projetos/devmaker/logs/audit_lessons.log"

# --- Argumentos de Linha de Comando ---
# Ex: ./clone_lesson.sh v0.0 sofridabr
TAG_AULA=${1:-""}
ALUNO_ALIAS=${2:-""}

echo "📘 INETZ - Distribuidor de Conteúdo Estruturado"
echo "------------------------------------------------"

# 1. Validação de Entrada
if [ -z "$TAG_AULA" ] || [ -z "$ALUNO_ALIAS" ]; then
    echo "❌ Erro: Use ./clone_lesson.sh [TAG_AULA] [ALUNO_ALIAS]"
    echo "👉 Exemplo: ./clone_lesson.sh v0.0 sofridabr"
    exit 1
fi

# 2. A Camada de Auditoria (O seu "Justifique o ocorrido")
echo "⚠️  ACESSO AO TEMPLATE MESTRE DETECTADO"
read -p "📝 Justificativa para este clone: " JUSTIFICATIVA

if [ -z "$JUSTIFICATIVA" ]; then
    echo "🚫 Acesso Negado: Justificativa obrigatória."
    exit 1
fi

# 3. Registro no Log do 'devmaker'
mkdir -p "$(dirname "$LOG_FILE")"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] TAG: $TAG_AULA | ALUNO: $ALUNO_ALIAS | MOTIVO: $JUSTIFICATIVA" >> "$LOG_FILE"

# 4. Operação de Clone Cirúrgico
# Padronização fixa: a pasta local é sempre o nome do laboratório
TARGET_DIR="$HOME/projetos/back-end-reginato"

echo "📂 Clonando a $TAG_AULA para $TARGET_DIR..."
git clone --branch "$TAG_AULA" --depth 1 "$TEMPLATE_REPO" "$TARGET_DIR"

# 5. Desacoplamento (O Aluno não deve alterar o Mestre!)
cd "$TARGET_DIR"
git remote remove origin
echo "✅ Conteúdo da $TAG_AULA entregue e desacoplado do Mestre."
echo "🚀 Próximo passo: Configurar o remote do aluno e fazer o push."