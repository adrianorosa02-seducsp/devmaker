"""
Módulo de Exemplo Backend: Gerador e Validador de Tokens de Prova
Baseado no documento instrucoes.md

Requisitos:
    pip install flask
"""

import secrets
import datetime
from flask import Flask, request, jsonify

app = Flask(__name__)

# Simulação de Banco de Dados de Tokens em memória
# Estrutura: { token_code: { user_id, exam_id, token, status, expires_at } }
TOKENS_DB = {}

def criar_token_prova(usuario_id: str, prova_id: str, minutos_validade: int = 15) -> dict:
    """
    Gera um token seguro com validade temporária (Padrão 15 minutos).
    Garante alta entropia e imprevisibilidade conforme instrucoes.md
    """
    # Gera uma string criptograficamente segura de 16 bytes (32 caracteres hex)
    # Ou reduzida para facilidade de digitação (ex: 8 chars)
    token_seguro = secrets.token_hex(4).upper()

    # Define expiração para N minutos a partir de agora
    expiracao = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=minutos_validade)

    token_data = {
        "id": len(TOKENS_DB) + 1,
        "token": token_seguro,
        "user_id": usuario_id,
        "exam_id": prova_id,
        "status": "pode_usar",  # Estados: pode_usar | em_uso | utilizado | expirado
        "expires_at": expiracao.isoformat(),
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

    # Salva no Banco de Dados
    TOKENS_DB[token_seguro] = token_data
    return token_data


@app.route('/api/exams/generate-token', methods=['POST'])
def api_generate_token():
    data = request.json or {}
    usuario_id = data.get('user_id', 'ALUNO-DESCONHECIDO')
    prova_id = data.get('exam_id', 'PROVA-GERAL')
    minutos = int(data.get('minutes', 15))

    novo_token = criar_token_prova(usuario_id, prova_id, minutos)
    return jsonify({
        "sucesso": True,
        "mensagem": "Token gerado com sucesso",
        "dados": novo_token
    }), 201


@app.route('/api/exams/validate-token', methods=['POST'])
def api_validate_token():
    data = request.json or {}
    codigo_token = data.get('token', '').strip().upper()

    if not codigo_token or codigo_token not in TOKENS_DB:
        return jsonify({"sucesso": False, "mensagem": "Token inválido ou inexistente."}), 404

    registro = TOKENS_DB[codigo_token]
    agora = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Checa se o token expirou
    if agora > registro['expires_at'] and registro['status'] == 'pode_usar':
        registro['status'] = 'expirado'

    if registro['status'] == 'expirado':
        return jsonify({"sucesso": False, "mensagem": "Token expirado. Solicite novo acesso."}), 400

    if registro['status'] == 'utilizado':
        return jsonify({"sucesso": False, "mensagem": "Este token já foi utilizado anteriormente."}), 400

    # Atualiza status para 'em_uso'
    registro['status'] = 'em_uso'

    return jsonify({
        "sucesso": True,
        "mensagem": "Token validado com sucesso! Prova liberada.",
        "exam_id": registro['exam_id'],
        "user_id": registro['user_id']
    }), 200


if __name__ == '__main__':
    print("🚀 Servidor da API de Tokens iniciado na porta 5000...")
    app.run(port=5000, debug=True)
