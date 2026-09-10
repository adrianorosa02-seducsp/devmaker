function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📚 Detalhar Aulas")
    .addItem("Abrir dia selecionado", "mostrarDia")
    .addSeparator()
    .addItem("🎯 Lançar Atividade", "abrirModalPorMenu")
    .addToUi();
}

/**
 * Abre o modal ao clicar no botão do menu.
 * Pegaaa linha selecionada e abre o modal para lançamento.
 */
function abrirModalPorMenu() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dia = ss.getSheetByName("Dia");
  
  if (!dia) {
    SpreadsheetApp.getUi().alert("Aba 'Dia' não encontrada.");
    return;
  }

  const range = ss.getActiveRange();
  const linha = range.getRow();

  if (linha < 4 || linha > 20) {
    SpreadsheetApp.getUi().alert("Selecione uma célula entre as linhas 4 e 20 da aba 'Dia'.");
    return;
  }

  if (range.getSheet().getName() !== "Dia") {
    SpreadsheetApp.getUi().alert("Selecione uma célula na aba 'Dia'.");
    return;
  }

  const relatorioAtual = dia.getRange(linha, 10).getValue();
  const textoAtual = (typeof relatorioAtual === "string") ? relatorioAtual : "";

  abrirModalLancamento(linha, textoAtual);
}

function onEdit(e) {
  if (!e || !e.range) return;
  Logger.log('onEdit triggered: %s on sheet %s', e.range.getA1Notation(), e.range.getSheet().getName());
  dispararLancamento(e);
}

/**
 * Gatilho que monitora qualquer clique na caixa de seleção da aba "Dia" (Coluna I).
 */
function dispararLancamento(e) {
  if (!e || !e.range) return;
  const range = e.range;
  const sheet = range.getSheet();

  const linha = range.getRow();
  const coluna = range.getColumn();
  Logger.log('dispararLancamento: sheet=%s linha=%s coluna=%s', sheet.getName(), linha, coluna);

  if (sheet.getName() !== "Dia") {
    Logger.log('dispararLancamento: sheet diferente de Dia => %s', sheet.getName());
    return;
  }

  if (coluna === 9 && linha >= 4 && linha <= 20) {
    const relatorioAtual = sheet.getRange(linha, 10).getValue();
    const textoAtual = (typeof relatorioAtual === "string") ? relatorioAtual : "";

    try {
      // Abre a janela HTML interativa passando a linha e o texto existente
      abrirModalLancamento(linha, textoAtual);
    } catch (err) {
      Logger.log('Erro ao tentar abrir modal em dispararLancamento: %s', err.message || err);
      return;
    }

    range.setValue(true);
    mostrarDia();
  } else {
    Logger.log('dispararLancamento: edição fora da coluna 9 ou linha 4-20');
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
          #mensagem { margin-top: 10px; padding: 10px; border-radius: 4px; display: none; }
          #mensagem.erro { background-color: #ffebee; color: #c62828; }
          #mensagem.sucesso { background-color: #e8f5e9; color: #2e7d32; }
        </style>
      </head>
      <body>
        <h3>Lançar Atividades Paeet</h3>
        <p><b>Turma:</b> ${turmaSelecionada} | <b>Componente:</b> ${componenteSelecionado}</p>
        <p>Edite ou insira o conteúdo/link do relatório:</p>
        
        <textarea id="textoRelatorio">${textoExistente || ""}</textarea>
        
        <div id="mensagem"></div>
        
        <div class="buttons">
          <button class="cancel" onclick="google.script.host.close()">Cancelar</button>
          <button class="ok" onclick="salvarConteudo()">Salvar</button>
        </div>

        <script>
          function salvarConteudo() {
            var texto = document.getElementById('textoRelatorio').value;
            var botao = document.querySelector('.ok');
            var mensagemDiv = document.getElementById('mensagem');
            
            botao.disabled = true;
            botao.innerText = 'Salvando...';
            
            google.script.run
              .withSuccessHandler(function(resultado) {
                mensagemDiv.className = 'sucesso';
                mensagemDiv.innerText = 'Salvo com sucesso!';
                mensagemDiv.style.display = 'block';
                setTimeout(function() { google.script.host.close(); }, 1500);
              })
              .withFailureHandler(function(erro) {
                console.error('Erro:', erro);
                var mensagem = String(erro || 'Erro desconhecido');
                if (mensagem.indexOf('PERMISSION_DENIED') !== -1 || mensagem.indexOf('permission') !== -1) {
                  mensagem = 'Falha de permissão. Confirme que a conta correta está autorizada como editora da planilha e do projeto Apps Script.';
                }
                mensagemDiv.className = 'erro';
                mensagemDiv.innerText = 'Erro ao salvar: ' + mensagem;
                mensagemDiv.style.display = 'block';
                botao.disabled = false;
                botao.innerText = 'Salvar';
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
  try {
    Logger.log("=== Iniciando processarSalvarHTML ===");
    Logger.log("Linha: %s, Texto: %s", linhaAtiva, textoDigitado);
    Logger.log("Usuário efetivo: %s", Session.getEffectiveUser().getEmail());
    Logger.log("Usuário ativo: %s", Session.getActiveUser().getEmail());
    Logger.log("Conta esperada para edição: adrianorosa02@prof.educacao.sp.gov.br");
    
    if (!textoDigitado || textoDigitado.trim() === "") {
      throw new Error("Nenhum texto foi digitado. Operação cancelada.");
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log("Spreadsheet obtido: %s", ss.getName());
    
    const dia = ss.getSheetByName("Dia");
    const abaAulas = ss.getSheetByName("Aulas Diárias");

    if (!dia) {
      throw new Error("Aba 'Dia' não encontrada. Abas disponíveis: " + ss.getSheets().map(s => s.getName()).join(", "));
    }
    if (!abaAulas) {
      throw new Error("Aba 'Aulas Diárias' não encontrada. Abas disponíveis: " + ss.getSheets().map(s => s.getName()).join(", "));
    }

    Logger.log("Abas encontradas OK");

    const dataDia = dia.getRange("B1").getValue();
    Logger.log("Data em B1: %s", dataDia);
    
    if (!(dataDia instanceof Date)) {
      throw new Error("Data inválida em B1 da aba Dia: " + dataDia);
    }

    const horarioSelecionado = String(dia.getRange(linhaAtiva, 1).getValue()).trim();
    const turmaSelecionada = String(dia.getRange(linhaAtiva, 4).getValue()).trim();
    
    Logger.log("Horário: %s, Turma: %s", horarioSelecionado, turmaSelecionada);

    const ultimaLinhaAulas = abaAulas.getLastRow();
    Logger.log("Última linha em Aulas Diárias: %s", ultimaLinhaAulas);
    
    if (ultimaLinhaAulas < 2) {
      throw new Error("Aba 'Aulas Diárias' está vazia.");
    }

    const dadosAulas = abaAulas.getRange(1, 1, ultimaLinhaAulas, 16).getValues();
    Logger.log("Dados carregados: %s linhas", dadosAulas.length);
    
    const dataBuscaStr = Utilities.formatDate(dataDia, "America/Sao_Paulo", "yyyy-MM-dd");
    Logger.log("Buscando data: %s", dataBuscaStr);
    
    let linhaEncontradaNaOrigem = -1;

    for (let i = 0; i < dadosAulas.length; i++) {
      let celulaA = dadosAulas[i][0];
      if (celulaA instanceof Date) {
        let celulaAStr = Utilities.formatDate(celulaA, "America/Sao_Paulo", "yyyy-MM-dd");
        
        if (celulaAStr === dataBuscaStr) {
          let horarioOrigem = String(dadosAulas[i][6]).trim();
          let turmaOrigem = String(dadosAulas[i][9]).trim();

          Logger.log("Linha %s: Horário=%s, Turma=%s", i + 1, horarioOrigem, turmaOrigem);

          if (horarioOrigem === horarioSelecionado && turmaOrigem === turmaSelecionada) {
            linhaEncontradaNaOrigem = i + 1;
            Logger.log("Linha encontrada: %s", linhaEncontradaNaOrigem);
            break;
          }
        }
      }
    }

    if (linhaEncontradaNaOrigem !== -1) {
      Logger.log("Escrevendo na coluna 16 (P), linha: %s", linhaEncontradaNaOrigem);
      
      const celulaDestinoOrigem = abaAulas.getRange(linhaEncontradaNaOrigem, 16);

      if (textoDigitado.startsWith("http://") || textoDigitado.startsWith("https://")) {
        Logger.log("Salvando como link");
        const richText = SpreadsheetApp.newRichTextValue()
          .setText(textoDigitado)
          .setLinkUrl(textoDigitado)
          .build();
        celulaDestinoOrigem.setRichTextValue(richText);
      } else {
        Logger.log("Salvando como texto");
        celulaDestinoOrigem.setValue(textoDigitado);
      }
      
      Logger.log("Texto salvo com sucesso na linha %s", linhaEncontradaNaOrigem);
      return "Salvo com sucesso!";
    } else {
      throw new Error("Não foi possível localizar a aula correspondente na aba 'Aulas Diárias'. Buscou por Horário: " + horarioSelecionado + " ou Turma: " + turmaSelecionada);
    }
  } catch (err) {
    var mensagemErro = err && err.message ? err.message : String(err);
    Logger.log("ERRO em processarSalvarHTML: %s", mensagemErro);

    if (mensagemErro.indexOf('PERMISSION_DENIED') !== -1 || mensagemErro.indexOf('permission') !== -1) {
      throw new Error('Falha de permissão. Confirme que a conta ' + Session.getEffectiveUser().getEmail() + ' tem acesso de editor à planilha e ao projeto Apps Script.');
    }

    throw err;
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

  const dataBuscaStr = Utilities.formatDate(dataSelecionada, "America/Sao_Paulo", "yyyy-MM-dd");

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