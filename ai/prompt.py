import os
from openai import OpenAI

# Inicializa o cliente da OpenAI
# Certifique-se de configurar a variável de ambiente OPENAI_API_KEY no seu sistema
# Windows PowerShell: $env:OPENAI_API_KEY="sua_chave_aqui"
# Windows CMD: set OPENAI_API_KEY=sua_chave_aqui
client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY")
)

def executar_prompt(prompt: str, modelo: str = "gpt-4o-mini"):
    """
    Envia um prompt para a API da OpenAI e retorna a resposta gerada.
    """
    try:
        response = client.chat.completions.create(
            model=modelo,
            messages=[
                {"role": "system", "content": "Você é um assistente especialista em análise de sentimentos e classificação de texto."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        resultado = response.choices[0].message.content
        return resultado

    except Exception as e:
        print(f"Erro ao conectar com a API da OpenAI: {e}")
        return None

if __name__ == "__main__":
    # Exemplo de uso: enviando as frases do arquivo comentarios.txt para análise
    prompt_teste = (
        "Classifique o sentimento da seguinte frase em 'POSITIVO', 'NEGATIVO' ou 'AMBÍGUO/COMPLEXO':\n"
        "\"A entrega demorou uma eternidade, mas o produto é incrível!\""
    )
    
    print("Enviando prompt para a OpenAI...")
    resposta = executar_prompt(prompt_teste)
    
    print("\n--- Resposta da IA ---")
    print(resposta)
