function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📚 Detalhar Aulas")
    .addItem("Abrir dia selecionado", "mostrarDia")
    .addToUi();
}

/**
 * Gatilho que monitora qualquer clique na caixa de seleção da aba "Dia" (Coluna I).
 */
function dispararLancamento(e) {
  if (!e) return;
  const range = e.range;
  const sheet = range.getSheet();
  
  if (sheet.getName() !== "Dia") return;
  
  const linha = range.getRow();
  const coluna = range.getColumn();
  
  if (coluna === 9 && linha >= 4 && linha <= 20) {
    const relatorioAtual = sheet.getRange(linha, 10).getValue();
    const textoAtual = (typeof relatorioAtual === "string") ? relatorioAtual : "";
    
    // Abre a janela HTML interativa passando a linha e o texto existente
    abrirModalLancamento(linha, textoAtual);
    
    range.setValue(true);
    mostrarDia();
  }
}

/**
 * Abre uma caixa de diálogo HTML personalizada com campo de texto expandido e editável.
 */
function abrirModalLancamento(linhaAtiva, textoExistente) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dia = ss.getSheetByName("Dia");

  const turmaSelecionada = String(dia.getRange(linhaAtiva, 4).getValue()).trim();
  const componenteSelecionado = String(dia.getRange(linhaAtiva, 5).getValue()).trim();

  // Cria o conteúdo HTML da janela com textarea grande e valor pré-carregado
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
        
        <textarea id="textoRelatorio">${textoExistente || ""}</textarea>
        
        <div class="buttons">
          <button class="cancel" onclick="google.script.host.close()">Cancelar</button>
          <button class="ok" onclick="salvarConteudo()">Salvar</button>
        </div>

        <script>
          function salvarConteudo() {
            var texto = document.getElementById('textoRelatorio').value;
            google.script.run
              .withSuccessHandler(function() { google.script.host.close(); })
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

/**
 * Função chamada pelo HTML para persistir o texto na base de dados (Coluna P).
 */
function processarSalvarHTML(linhaAtiva, textoDigitado) {
  if (!textoDigitado || textoDigitado.trim() === "") return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dia = ss.getSheetByName("Dia");
  const abaAulas = ss.getSheetByName("Aulas Diárias");

  const dataDia = dia.getRange("B1").getValue();
  if (!(dataDia instanceof Date)) return;

  const horarioSelecionado = String(dia.getRange(linhaAtiva, 1).getValue()).trim();
  const turmaSelecionada = String(dia.getRange(linhaAtiva, 4).getValue()).trim();

  const ultimaLinhaAulas = abaAulas.getLastRow();
  if (ultimaLinhaAulas < 2) return;

  const dadosAulas = abaAulas.getRange(1, 1, ultimaLinhaAulas, 16).getValues();
  const dataBuscaStr = Utilities.formatDate(dataDia, Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  let linhaEncontradaNaOrigem = -1;

  for (let i = 0; i < dadosAulas.length; i++) {
    let celulaA = dadosAulas[i][0];
    if (celulaA instanceof Date) {
      let celulaAStr = Utilities.formatDate(celulaA, Session.getScriptTimeZone(), "yyyy-MM-dd");
      
      if (celulaAStr === dataBuscaStr) {
        let horarioOrigem = String(dadosAulas[i][6]).trim();
        let turmaOrigem = String(dadosAulas[i][9]).trim();

        if (horarioOrigem === horarioSelecionado || turmaOrigem === turmaSelecionada) {
          linhaEncontradaNaOrigem = i + 1;
          break;
        }
      }
    }
  }

  if (linhaEncontradaNaOrigem !== -1) {
    const celulaDestinoOrigem = abaAulas.getRange(linhaEncontradaNaOrigem, 16);

    if (textoDigitado.startsWith("http://") || textoDigitado.startsWith("https://")) {
      const richText = SpreadsheetApp.newRichTextValue()
        .setText(textoDigitado)
        .setLinkUrl(textoDigitado)
        .build();
      celulaDestinoOrigem.setRichTextValue(richText);
    } else {
      celulaDestinoOrigem.setValue(textoDigitado);
    }
  }
}

/**
 * Lê as aulas do dia, insere a checkbox e resgata o relatório gravado na Coluna P para a Coluna J.
 */
function mostrarDia() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const calendario = ss.getSheetByName("Calendário");
  const dia = ss.getSheetByName("Dia");
  const template = ss.getSheetByName("Template");
  const abaAulas = ss.getSheetByName("Aulas Diárias");

  let dataSelecionada = calendario.getActiveCell().getValue();
  if (!(dataSelecionada instanceof Date)) {
    dataSelecionada = dia.getRange("B1").getValue();
  }

  if (!(dataSelecionada instanceof Date)) {
    return;
  }

  dia.getRange("B1").setValue(dataSelecionada);

  const ultimaLinhaAulas = abaAulas.getLastRow();
  if (ultimaLinhaAulas < 2) {
    template.getRange("A4:J20").copyTo(dia.getRange("A4:J20"), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    ss.setActiveSheet(dia);
    return;
  }

  const dadosAulas = abaAulas.getRange(1, 1, ultimaLinhaAulas, 16).getValues();
  const displayAulas = abaAulas.getRange(1, 1, ultimaLinhaAulas, 16).getDisplayValues();
  const richtextAulas = abaAulas.getRange(1, 1, ultimaLinhaAulas, 16).getRichTextValues();
  
  let linhasParaInserir = [];
  let linksJ = []; 

  const dataBuscaStr = Utilities.formatDate(dataSelecionada, Session.getScriptTimeZone(), "yyyy-MM-dd");

  for (let i = 0; i < dadosAulas.length; i++) {
    let celulaA = dadosAulas[i][0];

    if (celulaA instanceof Date) {
      let celulaAStr = Utilities.formatDate(celulaA, Session.getScriptTimeZone(), "yyyy-MM-dd");

      if (celulaAStr === dataBuscaStr) {
        let linhaDados = [];

        for (let col = 6; col <= 13; col++) {
          if (col === 6 || col === 7) {
            linhaDados.push(displayAulas[i][col]);
          } else {
            linhaDados.push(dadosAulas[i][col]);
          }
        }

        linhaDados.push(""); 
        linhaDados.push(displayAulas[i][15]); 

        linhasParaInserir.push(linhaDados);
        linksJ.push(richtextAulas[i][15]); 
      }
    }
  }

  dia.getRange(4, 1, 17, 10).clearContent();
  dia.getRange(4, 1, 17, 10).clearFormat();
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

/**
 * Função chamada pelo HTML para persistir o texto na base de dados (Coluna P).
 */
function processarSalvarHTML(linhaAtiva, textoDigitado) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dia = ss.getSheetByName("Dia");
  const abaAulas = ss.getSheetByName("Aulas Diárias");

  const dataDia = dia.getRange("B1").getValue();
  if (!(dataDia instanceof Date)) {
    throw new Error("Data inválida na célula B1 da aba Dia.");
  }

  const horarioSelecionado = String(dia.getRange(linhaAtiva, 1).getValue()).trim();
  const turmaSelecionada = String(dia.getRange(linhaAtiva, 4).getValue()).trim();

  const ultimaLinhaAulas = abaAulas.getLastRow();
  if (ultimaLinhaAulas < 2) {
    throw new Error("A aba 'Aulas Diárias' está vazia.");
  }

  const dadosAulas = abaAulas.getRange(1, 1, ultimaLinhaAulas, 16).getValues();
  const dataBuscaStr = Utilities.formatDate(dataDia, Session.getScriptTimeZone(), "yyyy-MM-dd");
  
  let linhaEncontradaNaOrigem = -1;

  for (let i = 0; i < dadosAulas.length; i++) {
    let celulaA = dadosAulas[i][0];
    if (celulaA instanceof Date) {
      let celulaAStr = Utilities.formatDate(celulaA, Session.getScriptTimeZone(), "yyyy-MM-dd");
      
      if (celulaAStr === dataBuscaStr) {
        let horarioOrigem = String(dadosAulas[i][6]).trim();
        let turmaOrigem = String(dadosAulas[i][9]).trim();

        if (horarioOrigem === horarioSelecionado || turmaOrigem === turmaSelecionada) {
          linhaEncontradaNaOrigem = i + 1;
          break;
        }
      }
    }
  }

  if (linhaEncontradaNaOrigem !== -1) {
    const celulaDestinoOrigem = abaAulas.getRange(linhaEncontradaNaOrigem, 16);

    if (textoDigitado && (textoDigitado.startsWith("http://") || textoDigitado.startsWith("https://"))) {
      const richText = SpreadsheetApp.newRichTextValue()
        .setText(textoDigitado)
        .setLinkUrl(textoDigitado)
        .build();
      celulaDestinoOrigem.setRichTextValue(richText);
    } else {
      celulaDestinoOrigem.setValue(textoDigitado || "");
    }
  } else {
    throw new Error("Não foi possível localizar a linha correspondente na aba 'Aulas Diárias'.");
  }
}
  if (linhasParaInserir.length > 0) {
    const rangeDestinoCompleto = dia.getRange(4, 1, linhasParaInserir.length, 10);
    rangeDestinoCompleto.setValues(linhasParaInserir);

    for (let j = 0; j < linhasParaInserir.length; j++) {
      let linhaAtual = 4 + j;
      
      dia.getRange(linhaAtual, 9).insertCheckboxes();
      
      let temConteudo = linksJ[j] && (linksJ[j].getText() !== "" || linksJ[j].getLinkUrl());
      let textoTextoBruto = dia.getRange(linhaAtual, 10).getValue();
      
      if (temConteudo || (textoTextoBruto && String(textoTextoBruto).trim() !== "")) {
        dia.getRange(linhaAtual, 9).setValue(true);
        if (temConteudo) {
          dia.getRange(linhaAtual, 10).setRichTextValue(linksJ[j]);
        }
      } else {
        dia.getRange(linhaAtual, 9).setValue(false);
      }
    }
  }

  template.getRange("A4:J20").copyTo(
    dia.getRange("A4:J20"),
    SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
    false
  );

  ss.setActiveSheet(dia);
}