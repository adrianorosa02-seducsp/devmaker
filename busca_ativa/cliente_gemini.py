import os
import json
from google import genai

# Inicializa o cliente do Gemini
# Windows PowerShell: $env:GEMINI_API_KEY="sua_chave_aqui"
# Windows CMD: set GEMINI_API_KEY=sua_chave_aqui
client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY")
)

def classificar_frase(frase: str, modelo: str = "gemini-2.5-flash") -> str:
    """
    Envia uma frase individual para a API do Gemini classificar o sentimento.
    """
    prompt = f"""Classifique o sentimento da seguinte frase em apenas uma das opções: POSITIVO, NEGATIVO ou COMPLEXO.

Frase: "{frase}"

Resposta (responda apenas com a palavra da classificação):"""

    try:
        response = client.models.generate_content(
            model=modelo,
            contents=prompt,
        )
        return response.text.strip()
    except Exception as e:
        print(f"Erro ao processar frase '{frase}': {e}")
        return "ERRO"


def processar_arquivo_txt(caminho_arquivo: str, arquivo_saida: str = "resultados_gemini.json"):
    """
    Lê um arquivo .txt linha a linha, envia cada linha para o prompt do Gemini
    e salva os resultados em um arquivo JSON.
    """
    if not os.path.exists(caminho_arquivo):
        print(f"Arquivo '{caminho_arquivo}' não encontrado.")
        return

    resultados = []

    print(f"Lendo e processando '{caminho_arquivo}' linha por linha...\n")

    with open(caminho_arquivo, "r", encoding="utf-8") as f:
        linhas = f.readlines()

    total_linhas = len(linhas)

    for index, linha in enumerate(linhas, 1):
        frase = linha.strip()
        if not frase:
            continue  # Pula linhas vazias

        classificacao = classificar_frase(frase)
        
        item = {
            "linha": index,
            "frase": frase,
            "classificacao": classificacao
        }
        resultados.append(item)

        print(f"[{index}/{total_linhas}] Frase: \"{frase[:40]}...\" -> {classificacao}")

    # Salva o resultado em arquivo JSON
    with open(arquivo_saida, "w", encoding="utf-8") as f_out:
        json.dump(resultados, f_out, ensure_ascii=False, indent=2)

    print(f"\nProcessamento concluído! Resultados salvos em '{arquivo_saida}'.")


if __name__ == "__main__":
    caminho_txt = "comentarios.txt"
    processar_arquivo_txt(caminho_txt)
