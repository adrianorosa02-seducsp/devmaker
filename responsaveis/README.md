# Dashboard Inteligente de Aulas - Painel Frontend

Este repositório contém o painel frontend (arquivos estáticos em HTML, CSS e JavaScript) responsável por exibir a grade de aulas de forma inteligente e em tempo real, consultando a API (FastAPI) do backend.

---

## 📅 Como Importar os Horários

Antes de conseguir visualizar a grade de aulas, você precisa popular o banco de dados do backend FastAPI processando o PDF de horários.

1. Configure as credenciais ou a fonte da grade via API (ou banco de dados), adicionando o link do PDF público do Google Drive.
2. Certifique-se de que sua "Escola", "PainelConfiguracao" e "FonteGrade" estão devidamente inseridos no banco.
3. Dispache uma requisição via API para processar a importação:
   - **Endpoint:** `POST /painel/importacoes`
   - **Payload Exemplo:**
     ```json
     {
       "configuracao_id": "seu-uuid-da-configuracao",
       "fonte_id": "seu-uuid-da-fonte-do-pdf"
     }
     ```
4. O backend (`devprovas`) baixará o PDF do Google Drive automaticamente, fará a varredura das tabelas/turmas (via `pdfplumber` e `pandas`) e populacionará as tabelas do seu painel.

---

## 💻 Como Rodar Localmente (Desenvolvimento)

Para rodar a aplicação localmente de forma profissional e sem problemas de bloqueio de segurança (CORS), siga os passos abaixo:

### 1. Iniciar o Backend (API FastAPI)
O painel de aulas depende do backend `devprovas` para fornecer os dados. Em um terminal separado, navegue até a pasta do backend e inicie o servidor com o Uvicorn:

```bash
cd caminho/para/devprovas
poetry run uvicorn app.main:app --reload
```
A API estará rodando por padrão na porta `8000`.

### 2. Iniciar o Frontend
No terminal, navegue até a pasta onde encontra-se o arquivo `painel_aulas.html` (este repositório) e suba um servidor web local na porta `3000` usando o módulo nativo do Python:

```bash
cd caminho/para/devmaker/responsaveis
python -m http.server 3000
```
> **Nota:** Usamos a porta 3000 pois ela já está mapeada na lista de permissões (CORS) do backend.

### 3. Acessar a Aplicação
Abra o navegador e acesse a URL:
👉 **http://localhost:3000/painel_aulas.html**

---

## 🚀 Como Rodar em Produção (VPS / Docker Swarm)

Em um ambiente de produção (VPS), não utilizamos o servidor embutido do Python. Como o frontend é composto apenas por **arquivos estáticos**, a melhor prática é serví-los usando um servidor web focado em performance, como o **NGINX** (podendo também ser deployado no Docker Swarm).

### 1. Configurar o Frontend
Antes de enviar os arquivos para o servidor, você precisa alterar a constante `CONFIG` no arquivo `painel_aulas.js` para apontar para a URL real do seu backend em produção:

```javascript
// Exemplo em painel_aulas.js
const ESCOLA_ID = 'c83b5925-3c67-43d7-8ccf-7b72ff4dd479';
const CONFIG = {
  // Substitua localhost pela URL de produção do seu backend FastAPI
  API_PAINEL: `https://api.seudominio.com.br/painel/dashboard/legacy?escola_id=${ESCOLA_ID}`,
  API_AULAS:  `https://api.seudominio.com.br/painel/horarios`,
  ...
};
```

### 2. Configurar o CORS no Backend (FastAPI)
Lembre-se de adicionar a URL de produção onde o frontend ficará hospedado (ex: `https://painel.seudominio.com.br`) na lista `origins` do arquivo `app/main.py` no projeto backend, para autorizar a comunicação.

### 3. Deploy com NGINX
Configure um bloco simples (Virtual Host) no seu servidor NGINX apontando para a pasta dos seus arquivos:

```nginx
server {
    listen 80;
    server_name painel.seudominio.com.br;

    root /var/www/painel_aulas;
    index painel_aulas.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Caso esteja rodando via Docker Swarm, você pode empacotar essa pasta junto com uma imagem oficial do `nginx:alpine` utilizando um `Dockerfile` simples:

```dockerfile
# Dockerfile
FROM nginx:alpine
COPY ./ /usr/share/nginx/html/
# Configure o NGINX via volumes ou copiando o default.conf
```
