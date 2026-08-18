import os
import json
from openai import OpenAI

# Inicializa o cliente da OpenAI
# Windows PowerShell: $env:OPENAI_API_KEY="sua_chave_aqui"
# Windows CMD: set OPENAI_API_KEY=sua_chave_aqui
client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY")
)

def classificar_frase(frase: str, modelo: str = "gpt-4o-mini") -> str:
    """
    Envia uma frase individual para a API da OpenAI classificar o sentimento.
    """
    prompt = f"""Classifique o sentimento da seguinte frase em apenas uma das opções: POSITIVO, NEGATIVO ou COMPLEXO.

Frase: "{frase}"

Resposta (responda apenas com a palavra da classificação):"""

    try:
        response = client.chat.completions.create(
            model=modelo,
            messages=[
                {"role": "system", "content": "Você é um classificador de sentimentos preciso e direto."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Erro ao processar frase '{frase}': {e}")
        return "ERRO"


def processar_arquivo_txt(caminho_arquivo: str, arquivo_saida: str = "resultados_openai.json"):
    """
    Lê um arquivo .txt linha a linha, envia cada linha para o prompt da OpenAI
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
