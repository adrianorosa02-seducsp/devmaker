/**
 * Abre uma caixa de diálogo HTML personalizada com campo de texto expandido e editável.
 */
function abrirModalLancamento(linhaAtiva, textoExistente) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dia = ss.getSheetByName("Dia");

  const turmaSelecionada = String(dia.getRange(linhaAtiva, 4).getValue()).trim();
  const componenteSelecionado = String(dia.getRange(linhaAtiva, 5).getValue()).trim();

  // Tratamento seguro para injetar o texto sem quebrar aspas ou quebras de linha
  const textoSeguro = JSON.stringify(textoExistente || "");

  const htmlOutput = HtmlService.createHtmlOutput(`
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body { font-family: Arial, sans-serif; padding: 15px; margin: 0; background-color: #f9f9f9; color: #333; }
          h3 { margin-top: 0; color: #1a73e8; font-size: 16px; }
          p { font-size: 13px; color: #555; margin-bottom: 10px; }
          textarea { width: 100%; height: 120px; padding: 10px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; resize: vertical; }
          .buttons { margin-top: 15px; text-align: right; }
          button { padding: 8px 16px; margin-left: 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
          button.cancel { background-color: #f1f3f4; color: #3c4043; }
          button.ok { background-color: #1a73e8; color: white; }
          button:hover { opacity: 0.9; }
        </style>
      </head>
      <body>
        <h3>Lançar Atividades Paeet</h3>
        <p><b>Turma:</b> ${turmaSelecionada} | <b>Componente:</b> ${componenteSelecionado}</p>
        <p>Edite ou insira o conteúdo/link do relatório:</p>
        
        <textarea id="textoRelatorio"></textarea>
        
        <div class="buttons">
          <button class="cancel" onclick="google.script.host.close()">Cancelar</button>
          <button class="ok" onclick="salvarConteudo()">Salvar</button>
        </div>

        <script>
          // Atribui o texto com segurança logo ao carregar a página
          document.getElementById('textoRelatorio').value = ${textoSeguro};

          function salvarConteudo() {
            var texto = document.getElementById('textoRelatorio').value;
            
            // Desabilita o botão para evitar duplo clique
            document.querySelector('.ok').disabled = true;
            document.querySelector('.ok').innerText = "Salvando...";

            google.script.run
              .withSuccessHandler(function() {
                google.script.host.close();
              })
              .withFailureHandler(function(err) {
                alert("Erro ao salvar: " + err.message);
                document.querySelector('.ok').disabled = false;
                document.querySelector('.ok').innerText = "Salvar";
              })
              .processarSalvarHTML(${linhaAtiva}, texto);
          }
        </script>
      </body>
    </html>
  `)
  .setWidth(450)
  .setHeight(300);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Lançamento de Atividades");
}