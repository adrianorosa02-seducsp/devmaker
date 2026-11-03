/**
 * form_importacao_pdf.js
 * Lida com a configuração de importação e sincronização de grade via PDF
 */

const ESCOLA_ID = 'c83b5925-3c67-43d7-8ccf-7b72ff4dd479';
const URL_BASE = 'https://geduc.inetz.com.br'; // Se for testar local, mude para http://localhost:8000

(function() {
  const form = document.getElementById('importacaoForm');
  const inputFonte = document.getElementById('fonte_dados');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnSync = document.getElementById('btnSync');

  // Inicializa o estado visual
  verificarEstadoBotaoSync();

  // Escuta alteração no input para validar botão de sync
  inputFonte.addEventListener('input', verificarEstadoBotaoSync);

  // Manipulador do Formulário (Salvar Configuração)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      window.mostrarAlerta('Preencha a URL corretamente.', 'warning');
      return;
    }

    const fonte_dados = inputFonte.value.trim();

    // Estado de Loading
    const iconeOriginal = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...';
    btnSubmit.disabled = true;

    try {
      const urlConfig = `${URL_BASE}/escolas/${ESCOLA_ID}/configuracao-importacao`;
      const response = await fetch(urlConfig, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fonte_dados })
      });

      if (!response.ok) {
        throw new Error(`Erro do Servidor: ${response.status}`);
      }

      window.mostrarAlerta('URL do Google Drive configurada com sucesso!', 'success');
      verificarEstadoBotaoSync();

    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      window.mostrarAlerta('Falha ao comunicar com o servidor para salvar a URL.', 'error');
    } finally {
      btnSubmit.innerHTML = iconeOriginal;
      btnSubmit.disabled = false;
    }
  });

  // Manipulador do Botão Sincronizar
  btnSync.addEventListener('click', async () => {
    if (!inputFonte.value.trim()) return;

    // Estado de Loading no botão Sync
    const iconeOriginal = btnSync.innerHTML;
    btnSync.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Baixando PDF e Sincronizando...';
    btnSync.disabled = true;
    btnSubmit.disabled = true;

    try {
      const urlImport = `${URL_BASE}/escolas/${ESCOLA_ID}/importar-horarios`;
      const response = await fetch(urlImport, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Erro do Servidor: ${response.status}`);
      }

      const dados = await response.json();
      window.mostrarAlerta(`Sincronização Concluída: ${dados.mensagem || 'Grade atualizada no painel.'}`, 'success');

    } catch (error) {
      console.error('Erro ao sincronizar grade:', error);
      window.mostrarAlerta('Falha ao processar o PDF. Verifique se o link está público e no formato correto.', 'error');
    } finally {
      btnSync.innerHTML = iconeOriginal;
      btnSubmit.disabled = false;
      verificarEstadoBotaoSync();
    }
  });

  function verificarEstadoBotaoSync() {
    if (inputFonte.value.trim().length > 10) {
      btnSync.disabled = false;
      btnSync.title = "Sincronizar a grade agora";
    } else {
      btnSync.disabled = true;
      btnSync.title = "Salve uma URL válida antes de sincronizar";
    }
  }
})();
