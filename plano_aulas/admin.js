/**
 * Lista arquivos de uma pasta que começam com um prefixo específico.
 * @param {string} pastaId - O ID da pasta no Drive.
 * @param {string} prefixo - O início do nome do arquivo (ex: "PLANO_SISANO1C1").
 * @returns {Array} - Lista de objetos com nome e URL dos arquivos encontrados.
 */
function listarArquivosPorPrefixo(pastaId, prefixo) {
  const pasta = DriveApp.getFolderById(pastaId);
  const arquivos = pasta.getFiles();
  const listaEncontrados = [];

  while (arquivos.hasNext()) {
    const arquivo = arquivos.next();
    const nomeArquivo = arquivo.getName();

    // Filtro: começa com o prefixo E termina com .pdf (ignora maiúsculas/minúsculas)
    if (nomeArquivo.startsWith(prefixo) && nomeArquivo.toLowerCase().endsWith('.pdf')) {
      listaEncontrados.push({
        nome: nomeArquivo,
        url: arquivo.getUrl(),
        id: arquivo.getId()
      });
      Logger.log('PDF encontrado: ' + nomeArquivo);
    }
  }

  return listaEncontrados;
}

function testarBusca() {
  const PASTA_DESTINO_ID = '1XH8-ilVO0rBeCS7yQStPhmVFhA76cI4n';
  const prefixoBusca = 'PLANO_CCMANO1';
  
  const resultados = listarArquivosPorPrefixo(PASTA_DESTINO_ID, prefixoBusca);
  
  if (resultados.length > 0) {
    console.log('Foram encontrados ' + resultados.length + ' arquivos.');
  } else {
    console.log('Nenhum arquivo encontrado com esse prefixo.');
  }
}