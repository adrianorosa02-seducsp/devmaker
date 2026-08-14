import os
from google import genai

# Inicializa o cliente do Gemini
# Certifique-se de configurar a variável de ambiente GEMINI_API_KEY no seu sistema:
# Windows PowerShell: $env:GEMINI_API_KEY="sua_chave_aqui"
# Windows CMD: set GEMINI_API_KEY=sua_chave_aqui
client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY")
)

def executar_prompt(prompt: str, modelo: str = "gemini-2.5-flash"):
    """
    Envia um prompt para a API do Google Gemini e retorna a resposta gerada.
    """
    try:
        response = client.models.generate_content(
            model=modelo,
            contents=prompt,
        )
        return response.text

    except Exception as e:
        print(f"Erro ao conectar com a API do Gemini: {e}")
        return None

if __name__ == "__main__":
    # Exemplo de uso: enviando uma frase do arquivo comentarios.txt para análise
    prompt_teste = (
        "Classifique o sentimento da seguinte frase em 'POSITIVO', 'NEGATIVO' ou 'AMBÍGUO/COMPLEXO':\n"
        "\"A entrega demorou uma eternidade, mas o produto é incrível!\""
    )
    
    print("Enviando prompt para o Google Gemini...")
    resposta = executar_prompt(prompt_teste)
    
    print("\n--- Resposta da IA (Gemini) ---")
    print(resposta)
