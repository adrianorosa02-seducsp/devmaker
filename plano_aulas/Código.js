/**
 * SISTEMA DE GERAÇÃO DE PLANOS DE AULA COM QR CODE E TABELA BIMESTRAL/RECUPERAÇÃO
 */

const PLANILHA_ID = '1NhYxV2b0nAM_YPhH3bYmI9y9eJJP4mbbQrD-cgGyH9s';
const ABA = 'planos';
const TEMPLATE_ID = '1MN-Il4moS_NTtKoADzKGfd87C071X8l1OdbcPGVqzuA';
const TEMPLATE_BIMESTRAL_ID = '11xBDRXDczxHP2ngs-aXuCDNDufm2nYCfJMT3vMRDCEA';
//const PASTA_DESTINO_ID = '1yhEnsVKPAF_Y-Hyfpw0968a46YkzioyZ';      // Programação Backend
//const PASTA_DESTINO_ID = '1FAKvHvLLKU5Dn1Sq2WNHFG7m60gQzKkW';      // Inteligencia Artificial
//const PASTA_DESTINO_ID = '1edZOGfomObtAOYbEweZ9Tj20zBd3kLsj';      // Programação Frontend (Eduardo)
//const PASTA_DESTINO_ID = '1OZ9pRWTNhB9Lb6GRRfqF-1kq0b5nOAsB';      // Processo de desenvolvimento de Sistemas
//const PASTA_DESTINO_ID = '1zxPifMZI7LtA0HaFvj6wmE-Rr6FuLLt4';      // Rede de computadores
let PASTA_DESTINO_ID = '1WcK8xex0SjbXF8fY-Hdn7wsb61YyWJDg';      // Carreiras


// --- CONFIGURAÇÃO MESTRE (Altere aqui para testar) ---
const CONFIG = {
  professor: 'Adriano Justino Rosa.',
  //professor: 'Eduardo Lazaro Roesler de Oliveira',
  ano: 'ANO1', // <-- ADICIONADO AQUI (Ex: ANO1, ANO2, etc.)
  codigoComponente: '',
  modulo: 'CCM',
  bimestre: 2
};

/**
 * Função principal: Percorre a planilha e processa as linhas marcadas.
 */
function gerarPlanosComDiaAulaPreenchido() {
  const planilha = SpreadsheetApp.openById(PLANILHA_ID);
  const aba = planilha.getSheetByName(ABA);
  const valores = aba.getDataRange().getValues();
  const cabecalho = valores[0];

  const indiceDiaAula = cabecalho.indexOf('DIA_AULA');
  const indiceImprimir = cabecalho.indexOf('IMPRIMIR');

  if (indiceDiaAula === -1 || indiceImprimir === -1) {
    throw new Error('Certifique-se de que as colunas DIA_AULA e IMPRIMIR existem na planilha.');
  }

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    const diaAula = String(linha[indiceDiaAula] || '').trim();
    const imprimir = String(linha[indiceImprimir] || '').trim().toUpperCase();

    // Só processa se tiver data e se a coluna IMPRIMIR for "S"
    if (diaAula !== '' && imprimir === 'S') {
      const dados = {};
      cabecalho.forEach((campo, index) => {
        dados[campo] = linha[index];
      });

      if (!dados.ID_AULA) {
        Logger.log('Aviso: Linha ' + (i + 1) + ' ignorada pois ID_AULA está vazio.');
        continue;
      }

      try {
        const urlPdf = gerarPlanoDeAulaQrcode(dados);
        aba.getRange(i + 1, indiceImprimir + 1).setValue('N');
        Logger.log('Sucesso na linha ' + (i + 1) + ': ' + urlPdf);
      } catch (erro) {
        Logger.log('Erro ao processar linha ' + (i + 1) + ': ' + erro.message);
      }
    }
  }
}

/**
 * Gera o documento individual, insere o QR Code e salva como PDF.
 */
function gerarPlanoDeAulaQrcode(dados) {
  const nomeArquivo = 'PLANO_' + dados.ID_AULA;
  const arquivoTemplate = DriveApp.getFileById(TEMPLATE_ID);
  const pastaDestino = DriveApp.getFolderById(PASTA_DESTINO_ID);
  
  const copia = arquivoTemplate.makeCopy(nomeArquivo, pastaDestino);
  const doc = DocumentApp.openById(copia.getId());
  const body = doc.getBody();

  const links = separarLinks(dados.MATERIAIS);

  substituir(body, 'ID_AULA', dados.ID_AULA);
  substituir(body, 'DIA_AULA', formatarData(dados.DIA_AULA));
  substituir(body, 'NOME_COMPONENTE', dados.NOME_COMPONENTE);
  substituir(body, 'COMPETENCIA', dados.COMPETENCIA);
  
  const tituloFull = String(dados.TITULO_AULA || '');
  const tituloLimpo = tituloFull.includes(':') ? tituloFull.split(':').pop().trim() : tituloFull;
  substituir(body, 'TITULO_AULA', tituloLimpo);

  if (links.pdf) {
    body.replaceText("\\[PDF\\]", dados.ID_AULA+".pdf");
    const el = body.findText(dados.ID_AULA+".pdf");
    if(el) el.getElement().asText().setLinkUrl(links.pdf);
  } else {
    body.replaceText("\\[PDF\\]", "PDF não disponível");
  }

  if (links.ap) {
    body.replaceText("\\[AP\\]", dados.ID_AULA+"AP.pdf");
    const el = body.findText(dados.ID_AULA+"AP.pdf");
    if(el) el.getElement().asText().setLinkUrl(links.ap);
  } else {
    body.replaceText("\\[AP\\]", "Atividade Prática não disponível para essa Aula");
  }

  substituir(body, 'MATERIAIS', dados.MATERIAIS);
  substituir(body, 'APRENDIZAGEM', dados.APRENDIZAGEM);
  substituir(body, 'CONTEUDOS', dados.CONTEUDOS);
  substituir(body, 'ATIVIDADES', dados.ATIVIDADES);
  substituir(body, 'RESUMO', dados.RESUMO);
  substituir(body, 'AVALIACAO', dados.AVALIACAO);
  substituir(body, 'RECURSOS', dados.RECURSOS);

  substituir(body, 'OBJETIVO_AULA', formatarListaJson(dados.OBJETIVO_AULA));
  const estrategiasFormatadas = formatarListaEmLinhas(dados.ESTRATEGIAS);
  substituir(body, 'ESTRATEGIAS', estrategiasFormatadas);
  substituir(body, 'BIBLIOGRAFIA', formatarBibliografia(dados.BIBLIOGRAFIA));

  const linkParaQrCode = "https://drive.google.com/uc?export=download&id=" + copia.getId();
  const qrCodeUrl = "https://quickchart.io/qr?text=" + encodeURIComponent(linkParaQrCode) + "&size=150";
  
  try {
    const imagemBlob = UrlFetchApp.fetch(qrCodeUrl).getBlob();
    const elemento = body.findText("\\[QR_CODE\\]");
    if (elemento) {
      const rangeElement = elemento.getElement();
      const pai = rangeElement.getParent();
      if (pai.getType() == DocumentApp.ElementType.PARAGRAPH) {
         pai.asParagraph().appendInlineImage(imagemBlob);
         rangeElement.asText().deleteText(elemento.getStartOffset(), elemento.getEndOffsetInclusive());
      }
    }
  } catch (e) {
    Logger.log("Erro no QR Code: " + e.message);
  }

  doc.saveAndClose();

  const arquivoPdf = DriveApp.getFileById(copia.getId()).getAs(MimeType.PDF);
  arquivoPdf.setName(nomeArquivo + '.pdf');
  const pdfCriado = pastaDestino.createFile(arquivoPdf);

  try {
    const ss = SpreadsheetApp.openById(PLANILHA_ID);
    let sheetDb = ss.getSheetByName('db_planos');
    if (!sheetDb) {
      sheetDb = ss.insertSheet('db_planos');
      sheetDb.appendRow(['id','modulo','componente','data_aula','titulo','link_plano']);
    }

    const idPlano = dados.ID_AULA || '';
    const moduloPlano = String(idPlano).substring(0, 3);
    const componentePlano = CONFIG.codigoComponente || '';
    const dataAulaFormatada = formatarData(dados.DIA_AULA);
    const tituloPlano = tituloLimpo || '';
    const urlPdfCriado = pdfCriado.getUrl();

    sheetDb.appendRow([idPlano, moduloPlano, componentePlano, dataAulaFormatada, tituloPlano, urlPdfCriado]);
  } catch (e) {
    Logger.log('Erro ao salvar em db_planos: ' + e.message);
  }

  return pdfCriado.getUrl();
}

/**
 * Função Auxiliar para separar os links do Google Drive
 */
function separarLinks(conteudoBruto) {
  const regex = /https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/view\?usp=drivesdk/g;
  const links = String(conteudoBruto).match(regex);
  return {
    pdf: links && links[0] ? links[0] : null,
    ap: links && links[1] ? links[1] : null
  };
}

/**
 * FUNÇÕES AUXILIARES DE FORMATAÇÃO
 */
function formatarListaEmLinhas(texto) {
  if (!texto) return "";
  return texto.split('; ').join('\n');
}

function substituir(body, campo, valor) {
  const texto = valor !== null && valor !== undefined ? String(valor) : '';
  body.replaceText('\\[' + campo + '\\]', texto);
}

function formatarData(valor) {
  if (!valor) return '';
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor)) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  }
  return String(valor).trim();
}

function formatarListaJson(jsonTexto) {
  if (!jsonTexto) return '';
  let itens;
  try { itens = typeof jsonTexto === 'string' ? JSON.parse(jsonTexto) : jsonTexto; } 
  catch (e) { return String(jsonTexto); }
  
  return itens.map(item => typeof item === 'string' ? '• ' + item : '• ' + Object.values(item).join(' - ')).join('\n');
}

function formatarBibliografia(jsonTexto) {
  return formatarListaJson(jsonTexto);
}

// --- FUNÇÃO PARA EXECUTAR A TABELA BIMESTRAL ---
function rodarGeracaoTabela() {
  const codComponente = CONFIG.codigoComponente; // 'C2'
  const bimestre = CONFIG.bimestre;             // 1
  const isRecuperacao = true;                  // Altere para true se quiser buscar dados da coluna W (Recuperação)
  
  const params = {
    professor: CONFIG.professor,
    codigoComponente: codComponente,
    modulo: CONFIG.modulo,
    bimestre: bimestre,
    recuperacao: isRecuperacao
  };
  
  // Chamada correta da função de busca passando o booleano de recuperação
  const dados = buscarDados(isRecuperacao);
  
  if (dados.length > 0) {
    const url = gerarTabela(dados, params);
    Logger.log('Documento gerado com sucesso: ' + url);
  } else {
    Logger.log('Nenhum dado encontrado para o filtro. Verifique se o Módulo, Componente e Bimestre conferem com a planilha.');
  }
}

/**
 * BUSCA OS DADOS NA PLANILHA COM FILTRAGEM ROBUSTA E SEGURA
 * Suporta o modo normal (por bimestre) e o modo recuperação (coluna W).
 */
/**
 * BUSCA OS DADOS NA PLANILHA COM FILTRAGEM ROBUSTA E SEGURA
 * Suporta o modo normal (por bimestre/ano) e o modo recuperação (coluna W).
 */
function buscarDados(recuperacao = false) {
  const ss = SpreadsheetApp.openById(PLANILHA_ID);
  const sheet = ss.getSheetByName(ABA);
  const valores = sheet.getDataRange().getValues();
  const dados = [];

  // Mapeia o cabeçalho dinamicamente para evitar problemas de índice fixo
  const cabecalho = valores[0];
  const indiceId = 0;                  // Coluna A (ID_AULA)
  const indiceDia = 1;                 // Coluna B (DIA_AULA)
  const indiceComponente = 2;          // Coluna C (NOME_COMPONENTE ou Código do Componente)
  const indiceTitulo = 4;              // Coluna E (TITULO_AULA)
  const indiceObjetivo = 5;            // Coluna F (OBJETIVO_AULA)
  const indiceMateriais = 6;           // Coluna G (MATERIAIS)
  const indiceAprendizagem = 7;        // Coluna H (APRENDIZAGEM)
  const indiceConteudo = 8;            // Coluna I (CONTEUDOS)
  const indiceAvaliacao = 9;           // Coluna J (AVALIACAO)
  const indiceRecursos = 10;           // Coluna K (RECURSOS)
  const indiceEstrategias = 11;        // Coluna L (ESTRATEGIAS)
  
  // Procura o índice exato da coluna "recuperacao" dinamicamente
  let indiceColunaRecuperacao = cabecalho.findIndex(col => String(col).trim().toLowerCase() === 'recuperacao');
  if (indiceColunaRecuperacao === -1) {
    indiceColunaRecuperacao = 22; // Coluna W caso o rótulo exato não seja encontrado
  }

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    const str = String(linha[indiceId] || ''); // ID da aula (ex: SISANO2C6B1S3A2)

    if (!str) continue;

    const moduloExtraido = str.substring(0, 3); // Ex: "SIS"
    
    // Verificamos a coluna de componente (ou o ID se contiver o código do componente)
    const componenteLinha = String(linha[indiceComponente] || '');
    const valorRecuperacao = String(linha[indiceColunaRecuperacao] || '').trim().toUpperCase();

    // 1. Validação de Módulo
    if (moduloExtraido !== CONFIG.modulo) {
      continue;
    }

    // 2. Validação de Componente
    const contemComponente = componenteLinha.includes(CONFIG.codigoComponente) || str.includes(CONFIG.codigoComponente);
    if (!contemComponente) {
      continue;
    }

    // 3. NOVO: Validação por Ano (Extrai "ANO1", "ANO2", etc. do ID)
    const matchAno = str.match(/ANO\d+/i);
    const anoExtraido = matchAno ? matchAno[0].toUpperCase() : '';
    
    if (anoExtraido !== CONFIG.ano.toUpperCase()) {
      continue; // Pula a linha se o Ano extraído for diferente de CONFIG.ano
    }

    // 4. Validação do Modo Recuperação vs Bimestre Normal
    if (recuperacao) {
      // Se for recuperação, exigimos que a coluna de recuperação seja "S"
      if (valorRecuperacao !== 'S') {
        continue;
      }
    } else {
      // Se for modo normal, ignoramos linhas marcadas como recuperação ("S")
      if (valorRecuperacao === 'S') {
        continue;
      }

      // Valida o bimestre extraindo do ID da aula
      const matchBimestre = str.match(/B(\d+)/i);
      if (!matchBimestre) continue;

      const bimestreExtraido = parseInt(matchBimestre[1], 10);
      if (bimestreExtraido !== CONFIG.bimestre) {
        continue; 
      }
    }
    
    // Adiciona o registro validado ao array de dados
    dados.push({
      ID_AULA: linha[indiceId],
      DIA_AULA: linha[indiceDia],
      TITULO_AULA: linha[indiceTitulo],
      OBJETIVO_AULA: linha[indiceObjetivo],
      NOME_COMPONENTE: linha[indiceComponente],
      MATERIAIS: linha[indiceMateriais],
      APRENDIZAGEM: linha[indiceAprendizagem],
      CONTEUDOS: linha[indiceConteudo],
      AVALIACAO: linha[indiceAvaliacao],
      RECURSOS: linha[indiceRecursos],
      ESTRATEGIAS: linha[indiceEstrategias]
    });
  }

  return dados;
}

/**
 * Gera o documento consolidado da tabela bimestral ou de recuperação
 */
function gerarTabela(listaDados, params) {
  const template = DriveApp.getFileById(TEMPLATE_BIMESTRAL_ID);
  const pasta = DriveApp.getFolderById(PASTA_DESTINO_ID);
  
  const sufixo = params.recuperacao ? '_RECUPERACAO' : '_B' + params.bimestre;
  const nomeArquivo = params.professor + '_' + params.codigoComponente + sufixo;
  
  const copia = template.makeCopy(nomeArquivo, pasta);
  const doc = DocumentApp.openById(copia.getId());
  const body = doc.getBody();
  
  substituir(body, 'bimestre', params.bimestre);
  substituir(body, 'professor', params.professor);
  substituir(body, 'componente', params.codigoComponente);
  substituir(body, 'nomecomponente', listaDados[0].NOME_COMPONENTE);
  
  const tabela = body.getTables()[0];
  const linhaModelo = tabela.getRow(1);

  listaDados.forEach(item => {
    const novaLinha = tabela.appendTableRow(linhaModelo.copy());
    novaLinha.getCell(0).setText(formatarCelulaIDeData(item.ID_AULA, item.DIA_AULA, item.TITULO_AULA));
    novaLinha.getCell(1).setText(String(item.OBJETIVO_AULA || ''));
    novaLinha.getCell(2).setText(String(item.APRENDIZAGEM || ''));
    novaLinha.getCell(3).setText(String(item.CONTEUDOS || ''));
    novaLinha.getCell(4).setText(String(item.AVALIACAO || ''));
    novaLinha.getCell(5).setText(String(item.RECURSOS || '') + '\n \n' + String(item.MATERIAIS || ''));
    novaLinha.getCell(6).setText(String(item.ESTRATEGIAS || ''));
  });

  tabela.removeRow(1);
  doc.saveAndClose();
  return copia.getUrl();
}

/**
 * Função auxiliar para formatar o texto da primeira coluna da tabela
 */
function formatarCelulaIDeData(idAula, diaAula, titulo) {
  const id = String(idAula || '');
  const data = formatarData(diaAula);
  return id + '\n' + data + '\n' + titulo;
}

/**
 * Web wrappers e utilitários para frontend
 */
function setPastaDestinoId(id) {
  if (id) PASTA_DESTINO_ID = id;
}

function webSetConfig(params) {
  if (!params) return CONFIG;
  if (params.professor) CONFIG.professor = params.professor;
  if (params.ano) CONFIG.ano = params.ano;
  if (params.codigoComponente) CONFIG.codigoComponente = params.codigoComponente;
  if (params.modulo) CONFIG.modulo = params.modulo;
  if (params.bimestre) CONFIG.bimestre = params.bimestre;
  return CONFIG;
}

function webRunRodarGeracaoTabela(params) {
  webSetConfig(params);
  if (params && params.pastaId) setPastaDestinoId(params.pastaId);
  try {
    rodarGeracaoTabela();
    return {status: 'ok'};
  } catch (e) {
    return {status: 'error', message: e.message};
  }
}

function webRunGerarPlanos(params) {
  webSetConfig(params);
  if (params && params.pastaId) setPastaDestinoId(params.pastaId);
  try {
    gerarPlanosComDiaAulaPreenchido();
    return {status: 'ok'};
  } catch (e) {
    return {status: 'error', message: e.message};
  }
}

function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  t.estrutura = ESTRUTURA_GDRIVE || {};
  return t.evaluate().setTitle('Gerador de Planos');
}
