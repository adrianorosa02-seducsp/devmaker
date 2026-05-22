O Formato Ideal de Texto para o Embedding
Em vez de passar apenas o texto da célula, criamos um bloco de texto contextualizado (Template) para gerar o vetor:

Plaintext
Componente: Programação Mobile (C14) | Unidade Curricular: Aplicações Móveis
Bimestre: 1 | Semana: 1 | Aula: Aula 1: Introdução ao desenvolvimento de aplicações móveis
Tema da Semana: Introdução ao Desenvolvimento de Aplicações Móveis
Objetivos da Aula: Conhecer a história do desenvolvimento móvel. Diferenciar o desenvolvimento móvel e web.
Habilidades Técnicas: Conhecer os conceitos básicos do desenvolvimento de aplicações móveis.
Objeto de Conhecimento: 1. Conceitos básicos do desenvolvimento de aplicações móveis
2. Modelagem do Banco no PostgreSQL (pgvector)
No Postgres, separamos o vetor do contexto textual e guardamos os metadados como colunas indexadas. Isso permite buscas híbridas (ex: buscar por vetor apenas no 2º Bimestre).

SQL
-- Ativar a extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE escopo_sequencia (
    id SERIAL PRIMARY KEY,
    id_aula_complementar VARCHAR(50) UNIQUE, -- Ex: SISANO2C1B1S1A1
    bimestre INT,
    semana INT,
    componente_nome VARCHAR(150),
    componente_codigo VARCHAR(50),
    aulas_semanais INT, -- 3 ou 4
    titulo_aula VARCHAR(255),
    conteudo_contextualizado TEXT, -- O texto formatado que foi enviado para o embedding
    embedding VECTOR(1536), -- 1536 para text-embedding-3-small da OpenAI ou 3072 para o large
    link_material TEXT,
    link_roteiro TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para acelerar a busca combinada
CREATE INDEX idx_escopo_filtros ON escopo_sequencia (componente_codigo, bimestre, semana);
CREATE INDEX idx_escopo_vector ON escopo_sequencia USING hnsw (embedding vector_cosine_ops);
3. Implementação com Python (Script de Carga)
A melhor forma de processar isso é criar um script Python que pode ser disparado pelo n8n (via nó Execute Command ou criando uma micro API com FastAPI).

O script abaixo lê a estrutura da planilha, higieniza os textos, gera o embedding e salva no banco.

Python
import os
import psycopg2
from psycopg2.extras import execute_values
from openai import OpenAI
import pandas as pd

# Inicializa clientes (certifique-se de ter as variáveis de ambiente configuradas)
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
conn = psycopg2.connect(os.environ.get("DATABASE_URL"))
cursor = conn.cursor()

def gerar_embedding(texto):
    response = client.embeddings.create(
        input=[texto],
        model="text-embedding-3-small" # Excelente custo-benefício e performance
    )
    return response.data[0].embedding

def processar_e_salvar(dados_planilha):
    # dados_planilha pode ser obtido via API do n8n ou lendo o arquivo gerado
    df = pd.DataFrame(dados_planilha)
    
    for _, row in df.iterrows():
        # 1. Monta o contexto textual rico para o modelo de embedding
        contexto = (
            f"Componente: {row['Nome do componente']} ({row['Código componente']}) | "
            f"Bimestre: {row['Bimestre']} | Semana: {row['Semana']} | "
            f"Aula: {row['Título aula']} | Tema: {row['Tema da semana']} | "
            f"Objetivos: {row['Objetivos da aula']} | "
            f"Habilidades: {row['Habilidades técnicas']} | "
            f"Conhecimento: {row['Objeto de conhecimento']}"
        )
        
        # 2. Gera o vetor
        vetor = gerar_embedding(contexto)
        
        # 3. Trata número de aulas semanais (Extrai apenas o número da string '3 ou 4 aulas...')
        aulas_semanais = 3 if "3" in str(row['Componente de 3 ou 4 aulas semanais?']) else 4

        # 4. Query de inserção/atualização (Upsert)
        query = """
            INSERT INTO escopo_sequencia 
            (id_aula_complementar, bimestre, semana, componente_nome, componente_codigo, aulas_semanais, titulo_aula, conteudo_contextualizado, embedding, link_material, link_roteiro)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id_aula_complementar) DO UPDATE SET
                conteudo_contextualizado = EXCLUDED.conteudo_contextualizado,
                embedding = EXCLUDED.embedding,
                link_material = EXCLUDED.link_material,
                link_roteiro = EXCLUDED.link_roteiro;
        """
        
        cursor.execute(query, (
            row['IDAula complementar'], int(row['Bimestre']), int(row['Semana']),
            row['Nome do componente'], row['Código componente'], aulas_semanais,
            row['Título aula'], contexto, vetor, row['Link para Material'], row['Link para Roteiro Atividades']
        ))
    
    conn.commit()
    return "Processamento concluído com sucesso!"
4. Arquitetura de Integração com o n8n
Como você já usa o n8n, não precisa abandonar a ferramenta. O n8n é excelente para atuar como o Orquestrador:

[Google Sheets / Trigger] ➔ [n8n: Formata JSON] ➔ [n8n: Envia para o Script Python] ➔ [PostgreSQL + pgvector]
Como estruturar no n8n:
Captura: Use o nó Google Sheets (ou Webhook) para capturar as linhas da planilha.

Formatação Base: Use um nó Code (JavaScript) para garantir que strings vazias não quebrem o fluxo e para renomear chaves complexas se necessário.

Execução do Embedding:

Abordagem A (Nativa n8n): Você pode usar o nó Postgres combinado com o nó OpenAI Embedding avançado do n8n para inserir direto (inserindo o vetor como uma string formatada [0.1, 0.2, ...]).

Abordagem B (Híbrida - Mais Robusta): Envie o JSON gerado no n8n para o script Python acima usando o nó Execute Command (chamando o script localmente) ou via HTTP Request (caso coloque o script Python em um container Docker/FastAPI).

5. Estratégia de Recuperação (Retrieval) pelo Agente
Quando o Agente de IA for buscar uma informação (ex: "Quais habilidades preciso trabalhar na primeira aula de mobile?"), a busca no banco deve usar filtros estritos de metadados combinados com a busca vetorial:

SQL
-- Exemplo de query que o Agente executará por trás dos panos
SELECT id_aula_complementar, titulo_aula, link_material, 
       (embedding <=> '%s') AS distancia
FROM escopo_sequencia
WHERE componente_codigo = 'C14' AND bimestre = 1
ORDER BY distancia ASC
LIMIT 1;
(O operador <=> calcula a distância de cosseno entre o vetor da pergunta do usuário %s e os vetores do banco).
