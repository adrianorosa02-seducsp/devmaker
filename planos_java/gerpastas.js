function exportarPastaParaJSON() {
  var folderId = '16AQk1iMws_IhNqLbAfvXuIwRGs9fVBGb'; // <--- INSIRA O ID DA PASTA AQUI
  var folder = DriveApp.getFolderById(folderId);
  
  Logger.log('--- Iniciando processamento da pasta: ' + folder.getName() + ' ---');
  
  var estrutura = {
    pasta_raiz: folder.getName(),
    data_processamento: new Date().toISOString(),
    subpastas: processarSubpastas(folder)
  };
  
  var json = JSON.stringify(estrutura, null, 2);
  
  // Criar arquivo
  var nomeArquivo = 'Estrutura_' + folder.getName() + '.json';
  var arquivo = DriveApp.createFile(nomeArquivo, json, MimeType.PLAIN_TEXT);
  
  Logger.log('Processamento concluído.');
  Logger.log('Arquivo gerado: ' + nomeArquivo);
  Logger.log('Link para o arquivo JSON: ' + arquivo.getUrl());
  
  // Exibe um popup de aviso no Editor do Google Apps Script com o link
  SpreadsheetApp.getUi().alert('Sucesso! Arquivo gerado:\n' + arquivo.getUrl());
}

function processarSubpastas(pasta) {
  var listaSubpastas = [];
  var folders = pasta.getFolders();
  
  while (folders.hasNext()) {
    var sub = folders.next();
    Logger.log('Processando subpasta: ' + sub.getName());
    
    listaSubpastas.push({
      nome: sub.getName(),
      id: sub.getId(),
      url: sub.getUrl(),
      subpastas: processarSubpastas(sub)
    });
  }
  return listaSubpastas;
}