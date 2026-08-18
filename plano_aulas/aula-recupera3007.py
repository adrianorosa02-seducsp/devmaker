# ==============================================================================
# 1. INSTALAÇÃO DO SERVIDOR MYSQL NO AMBIENTE COLAB
# ==============================================================================
!apt-get update -qq > /dev/null
!apt-get install -y mysql-server -qq > /dev/null
!pip install mysql-connector-python -q

# Inicia o serviço do MySQL na máquina virtual do Colab
!service mysql start

# Configuração de usuário e banco de dados
!mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH 'mysql_native_password' BY '123456'; FLUSH PRIVILEGES;"
!mysql -u root -p123456 -e "CREATE DATABASE IF NOT EXISTS aula_seguranca;"

print("\n✅ Servidor MySQL instalado e rodando no Google Colab!")


# ==============================================================================
# 2. CONFIGURAÇÃO DA TABELA E FUNÇÕES DE AUTENTICAÇÃO
# ==============================================================================
import mysql.connector

def conectar_mysql():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="123456",
        database="aula_seguranca"
    )

def preparar_banco():
    conn = conectar_mysql()
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS usuarios;")
    cursor.execute("""
        CREATE TABLE usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100),
            email VARCHAR(100),
            senha VARCHAR(100)
        );
    """)
    cursor.execute("INSERT INTO usuarios (nome, email, senha) VALUES ('Administrador', 'admin@empresa.com', 'SenhaForte123!')")
    cursor.execute("INSERT INTO usuarios (nome, email, senha) VALUES ('Aluno Teste', 'aluno@escola.com', 'user123')")
    conn.commit()
    conn.close()

# ❌ MÉTODO INSEGURO (Concatenação Direta)
def login_inseguro(email, senha):
    conn = conectar_mysql()
    cursor = conn.cursor()
    query = f"SELECT * FROM usuarios WHERE email = '{email}' AND senha = '{senha}'"
    print(f"\n[QUERY EXECUTADA]: {query}")
    cursor.execute(query)
    resultado = cursor.fetchall()
    conn.close()
    return resultado

# ✅ MÉTODO SEGURO (Prepared Statements)
def login_seguro(email, senha):
    conn = conectar_mysql()
    cursor = conn.cursor(prepared=True) # Habilita Prepared Statement no MySQL
    query = "SELECT * FROM usuarios WHERE email = %s AND senha = %s"
    print(f"\n[QUERY EXECUTADA]: {query} | Parâmetros: ({email}, {senha})")
    cursor.execute(query, (email, senha))
    resultado = cursor.fetchall()
    conn.close()
    return resultado


# ==============================================================================
# 3. TESTE PRÁTICO DO ATAQUE DE INJEÇÃO SQL
# ==============================================================================
preparar_banco()

payload_malicioso = "' OR '1'='1"
senha_qualquer = "12345"

print("=" * 65)
print("TESTE 1: TENTANDO BYPASS NO MÉTODO INSEGURO")
print("=" * 65)

resultado_inseguro = login_inseguro(payload_malicioso, senha_qualquer)

if resultado_inseguro:
    print("⚠️ ATAQUE BEM-SUCEDIDO! O invasor logou sem saber a senha!")
    print("Dados Retornados do MySQL:", resultado_inseguro)
else:
    print("Acesso Negado.")

print("\n" + "=" * 65)
print("TESTE 2: TENTANDO O MESMO ATAQUE COM PREPARED STATEMENTS")
print("=" * 65)

resultado_seguro = login_seguro(payload_malicioso, senha_qualquer)

if resultado_seguro:
    print("⚠️ ATAQUE BEM-SUCEDIDO!")
else:
    print("🛡️ ATAQUE BLOQUEADO! O MySQL tratou a entrada puramente como Texto/Literal.")


# ==============================================================================
# 4. SIMULAÇÃO DA AUDITORIA COM IA GENERATIVA
# ==============================================================================
print("\n" + "=" * 65)
print("ETAPA FINAL: AUDITORIA DE SEGURANÇA COM IA GENERATIVA")
print("=" * 65)

import json

log_sistema = {
    "protocolo": "HTTPS",
    "metodo_http": "POST",
    "origem_ip": "192.168.0.42",
    "endpoint": "/api/v1/login",
    "dados_recebidos": {
        "email": "' OR '1'='1",
        "senha": "12345"
    }
}

prompt_ia = f"""
Atue como um especialista em segurança de software. Analise este log de requisição web e responda:
1. Houve uma tentativa de ataque? De qual tipo?
2. Como a aplicação deveria tratar essa entrada para evitar falhas?

LOG DE REQUISIÇÃO:
{json.dumps(log_sistema, indent=2)}
"""

print("\n--- PROMPT ENVIADO À IA GENERATIVA ---")
print(prompt_ia)

resposta_gerada_ia = """
--- RESPOSTA ESTIMADA DA IA GENERATIVA ---
1. DIAGNÓSTICO DE SEGURANÇA:
   Sim! Foi identificada uma tentativa de ataque de SQL Injection (Injeção de SQL).
   O atacante tentou utilizar a condição sempre verdadeira ("' OR '1'='1") para burlar a autenticação.

2. MEDIDAS DE RECOMENDAÇÃO:
   - Substituir queries concatenadas por Prepared Statements (consultas parametrizadas).
   - Implementar validação e sanitização no campo de e-mail no backend da API.
"""

print(resposta_gerada_ia)