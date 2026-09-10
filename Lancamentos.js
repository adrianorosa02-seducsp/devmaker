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
