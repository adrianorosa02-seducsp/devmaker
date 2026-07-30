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

/**
 * Importa o mapeamento gerado (arquivo JSON) para a API FastAPI.
 * Procura por um arquivo chamado 'estrutura_gdrive.json' ou por arquivos que
 * comecem com 'Estrutura_' e envia cada professor como payload.
 * apiBaseUrl: Ex: 'https://meu-dominio.com' (sem barra no final)
 */
function importa_mapeamento(apiBaseUrl) {
  if (!apiBaseUrl) {
    SpreadsheetApp.getUi().alert('Informe a URL base da API (ex: https://meu-dominio.com)');
    return;
  }

  var file = null;
  var filesByName = DriveApp.getFilesByName('estrutura_gdrive.json');
  if (filesByName.hasNext()) {
    file = filesByName.next();
  } else {
    // procura por arquivos que comecem com Estrutura_
    var files = DriveApp.getFiles();
    var latest = null;
    while (files.hasNext()) {
      var f = files.next();
      if (f.getName().indexOf('Estrutura_') === 0) {
        if (!latest || f.getDateCreated() > latest.getDateCreated()) latest = f;
      }
    }
    file = latest;
  }

  if (!file) {
    SpreadsheetApp.getUi().alert('Arquivo de estrutura não encontrado no Drive. Rode exportarPastaParaJSON() primeiro.');
    return;
  }

  var content = file.getBlob().getDataAsString();
  var estrutura = JSON.parse(content);

  var professores = estrutura.subpastas || [];
  var url = apiBaseUrl.replace(/\/$/, '') + '/api/v1/mapa-gdrive/sync';

  professores.forEach(function(prof) {
    try {
      var payload = {
        alias_professor: prof.nome,
        estrutura: {
          subpastas: prof.subpastas || []
        }
      };

      var options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      var resp = UrlFetchApp.fetch(url, options);
      Logger.log('Sync ' + prof.nome + ' -> ' + resp.getResponseCode() + ' ' + resp.getContentText());
    } catch (e) {
      Logger.log('Erro ao sincronizar ' + prof.nome + ': ' + e.message);
    }
  });

  SpreadsheetApp.getUi().alert('Sincronização concluída. Verifique os logs para detalhes.');
}