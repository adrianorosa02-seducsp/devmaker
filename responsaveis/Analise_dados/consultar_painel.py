# ============================================================
# consultar_painel.py
# Projeto: Dashboard inteligente de aulas
# Autor: Adriano Justino Rosa
# Descrição: Back-end Flask que serve o JSON da grade de aulas
#            do dia a partir do banco aulas.sqlite.
#            A hora atual NÃO faz parte da resposta — ela é
#            obtida pela WorldTimeAPI diretamente no front-end.
# ============================================================

import os
import sys
import sqlite3
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# Garante que o módulo do ETL possa ser importado do mesmo diretório
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gerar_banco_aulas import get_dados_painel

# ============================================================
# CONFIGURAÇÃO
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

app = Flask(__name__, static_folder=PROJECT_ROOT, static_url_path='')
CORS(app)  # Permite que o painel_aulas.html chame esta API

DB_FILE  = os.path.join(BASE_DIR, 'aulas.sqlite')


def get_db_connection():
    """Conecta ao banco SQLite e define row_factory para dict."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


# ============================================================
# ROTAS FRONT-END
# ============================================================

@app.route('/', methods=['GET'])
def index():
    """Serve a página principal do painel de aulas."""
    return send_from_directory(PROJECT_ROOT, 'painel_aulas.html')


# ============================================================
# ROTAS API PAINEL
# ============================================================

@app.route('/api/painel', methods=['GET'])
def painel():
    """Retorna a grade de aulas do dia (ou de uma data específica)."""
    data_str = request.args.get('data', None)

    if not os.path.exists(DB_FILE):
        return jsonify({
            'erro': 'Banco de dados não encontrado. '
                    'Execute gerar_banco_aulas.py primeiro.'
        }), 503

    dados = get_dados_painel(DB_FILE, data_str)
    return jsonify(dados)


@app.route('/api/status', methods=['GET'])
def status():
    """Health-check simples para verificar se o servidor está no ar."""
    return jsonify({'status': 'online', 'db': os.path.exists(DB_FILE)})


# ============================================================
# ROTAS API CRUD DE HORÁRIOS / AULAS
# ============================================================

@app.route('/api/aulas', methods=['GET'])
def listar_aulas():
    """
    Lista registros da tabela 'aulas'.
    Filtros opcionais: ?dia_semana=Seg&turma=1A&horario=07:00&busca=MAT
    """
    if not os.path.exists(DB_FILE):
        return jsonify({'erro': 'Banco de dados não encontrado'}), 503

    dia = request.args.get('dia_semana')
    turma = request.args.get('turma')
    horario = request.args.get('horario')
    busca = request.args.get('busca')

    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT id, dia_semana, horario, turma, disciplina, professor FROM aulas WHERE 1=1"
    params = []

    if dia:
        query += " AND dia_semana = ?"
        params.append(dia)
    if turma:
        query += " AND turma = ?"
        params.append(turma)
    if horario:
        query += " AND horario = ?"
        params.append(horario)
    if busca:
        query += " AND (disciplina LIKE ? OR professor LIKE ? OR turma LIKE ?)"
        term = f"%{busca}%"
        params.extend([term, term, term])

    query += " ORDER BY CASE dia_semana WHEN 'Seg' THEN 1 WHEN 'Ter' THEN 2 WHEN 'Qua' THEN 3 WHEN 'Qui' THEN 4 WHEN 'Sex' THEN 5 ELSE 6 END, horario, turma"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    aulas = [dict(r) for r in rows]
    return jsonify(aulas)


@app.route('/api/aulas', methods=['POST'])
def criar_aula():
    """Cadastra um novo registro de aula/horário."""
    if not os.path.exists(DB_FILE):
        return jsonify({'erro': 'Banco de dados não encontrado'}), 503

    data = request.get_json() or {}
    dia_semana = str(data.get('dia_semana', '')).strip()
    horario    = str(data.get('horario', '')).strip()
    turma      = str(data.get('turma', '')).strip()
    disciplina = str(data.get('disciplina', '')).strip()
    professor  = str(data.get('professor', '')).strip()

    if not dia_semana or not horario or not turma or not disciplina:
        return jsonify({'erro': 'Dia da semana, horário, turma e disciplina são obrigatórios'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO aulas (dia_semana, horario, turma, disciplina, professor)
        VALUES (?, ?, ?, ?, ?)
    ''', (dia_semana, horario, turma, disciplina, professor))
    
    conn.commit()
    novo_id = cursor.lastrowid
    conn.close()

    return jsonify({
        'mensagem': 'Aula criada com sucesso!',
        'aula': {
            'id': novo_id,
            'dia_semana': dia_semana,
            'horario': horario,
            'turma': turma,
            'disciplina': disciplina,
            'professor': professor
        }
    }), 201


@app.route('/api/aulas/<int:aula_id>', methods=['PUT'])
def atualizar_aula(aula_id):
    """Atualiza uma aula existente."""
    if not os.path.exists(DB_FILE):
        return jsonify({'erro': 'Banco de dados não encontrado'}), 503

    data = request.get_json() or {}
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM aulas WHERE id = ?", (aula_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'erro': f'Aula ID {aula_id} não encontrada'}), 404

    dia_semana = str(data.get('dia_semana', '')).strip()
    horario    = str(data.get('horario', '')).strip()
    turma      = str(data.get('turma', '')).strip()
    disciplina = str(data.get('disciplina', '')).strip()
    professor  = str(data.get('professor', '')).strip()

    if not dia_semana or not horario or not turma or not disciplina:
        conn.close()
        return jsonify({'erro': 'Dia da semana, horário, turma e disciplina são obrigatórios'}), 400

    cursor.execute('''
        UPDATE aulas
        SET dia_semana = ?, horario = ?, turma = ?, disciplina = ?, professor = ?
        WHERE id = ?
    ''', (dia_semana, horario, turma, disciplina, professor, aula_id))

    conn.commit()
    conn.close()

    return jsonify({'mensagem': f'Aula ID {aula_id} atualizada com sucesso!'})


@app.route('/api/aulas/<int:aula_id>', methods=['DELETE'])
def deletar_aula(aula_id):
    """Exclui um registro de aula pelo ID."""
    if not os.path.exists(DB_FILE):
        return jsonify({'erro': 'Banco de dados não encontrado'}), 503

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM aulas WHERE id = ?", (aula_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({'erro': f'Aula ID {aula_id} não encontrada'}), 404

    cursor.execute("DELETE FROM aulas WHERE id = ?", (aula_id,))
    conn.commit()
    conn.close()

    return jsonify({'mensagem': f'Aula ID {aula_id} removida com sucesso!'})


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == '__main__':
    print("=" * 60)
    print("  Painel de Aulas — Servidor Flask + Interface Web + CRUD")
    print(f"  Banco de dados: {DB_FILE}")
    print("  Painel Web: http://localhost:5000/")
    print("  Endpoint API: http://localhost:5000/api/painel")
    print("  CRUD Aulas:   http://localhost:5000/api/aulas")
    print("  Health:       http://localhost:5000/api/status")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=False)
