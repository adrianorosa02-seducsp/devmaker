/**
 * form1.js - Lógica específica da tela de Cadastro de Escola
 * Integração com a API GEDUC (https://geduc.inetz.com.br/escolas/)
 */

(function() {
  const escolaForm = document.getElementById('escolaForm');
  const btnSubmit = document.getElementById('btnSubmit');

  // Campos do formulário
  const inputNome = document.getElementById('nome');
  const inputEndereco = document.getElementById('endereco');
  const inputTelefone = document.getElementById('telefone');
  const inputEmail = document.getElementById('email');

  // Elementos do Card de Prévia
  const previewNome = document.getElementById('previewNome');
  const previewEnderecoTxt = document.getElementById('previewEnderecoTxt');
  const previewStatus = document.getElementById('previewStatus');

  // Ativa a máscara de telefone brasileira do Design System
  if (window.EscolaDoFuturo && window.EscolaDoFuturo.aplicarMascaraTelefone) {
    window.EscolaDoFuturo.aplicarMascaraTelefone(inputTelefone);
  }

  // Atualização em tempo real do Card de Prévia
  function updatePreview() {
    const nome = inputNome ? inputNome.value.trim() : '';
    const endereco = inputEndereco ? inputEndereco.value.trim() : '';

    if (previewNome) {
      previewNome.textContent = nome || 'Nova Escola (Aguardando preenchimento)';
    }

    if (previewEnderecoTxt) {
      previewEnderecoTxt.textContent = endereco || 'Informe o endereço da unidade';
    }

    if (previewStatus) {
      if (nome && endereco && inputTelefone.value && inputEmail.value) {
        previewStatus.innerHTML = '<span style="color: var(--sf-success-green);">✓ Pronta para envio</span>';
      } else {
        previewStatus.textContent = 'Preenchendo dados...';
      }
    }
  }

  [inputNome, inputEndereco, inputTelefone, inputEmail].forEach(input => {
    if (input) input.addEventListener('input', updatePreview);
  });

  // Envio do formulário para a API GEDUC
  if (escolaForm) {
    escolaForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (window.EscolaDoFuturo && window.EscolaDoFuturo.limparAlertas) {
        window.EscolaDoFuturo.limparAlertas('alertContainer');
      }

      const nome = inputNome.value.trim();
      const endereco = inputEndereco.value.trim();
      const telefone = inputTelefone.value.trim();
      const email = inputEmail.value.trim();

      if (!nome || !endereco || !telefone || !email) {
        if (window.EscolaDoFuturo && window.EscolaDoFuturo.mostrarAlerta) {
          window.EscolaDoFuturo.mostrarAlerta(
            'alertContainer',
            'error',
            'Campos obrigatórios',
            'Por favor, preencha todos os campos do formulário para prosseguir.'
          );
        }
        return;
      }

      // Payload JSON no mesmo contrato cURL da API GEDUC
      const dados = {
        nome: nome,
        endereco: endereco,
        telefone: telefone,
        email: email
      };

      try {
        // Estado de carregamento no botão
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cadastrando escola...';

        const response = await fetch('https://geduc.inetz.com.br/escolas/', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dados)
        });

        if (!response.ok) {
          throw new Error(`Servidor respondeu com status HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('Resposta da API:', data);

        // Feedback de sucesso
        if (window.EscolaDoFuturo && window.EscolaDoFuturo.mostrarAlerta) {
          window.EscolaDoFuturo.mostrarAlerta(
            'alertContainer',
            'success',
            'Escola cadastrada com sucesso!',
            `A unidade escolar <strong>${nome}</strong> foi registrada com sucesso.<br><small style="color: #64748b;">Resposta: ${JSON.stringify(data)}</small>`
          );
        }

        // Reseta o formulário e atualiza a prévia
        escolaForm.reset();
        updatePreview();

      } catch (error) {
        console.error('Erro na requisição:', error);
        if (window.EscolaDoFuturo && window.EscolaDoFuturo.mostrarAlerta) {
          window.EscolaDoFuturo.mostrarAlerta(
            'alertContainer',
            'error',
            'Erro ao enviar formulário',
            `Não foi possível registrar a escola no servidor GEDUC. Detalhes: ${error.message}`
          );
        }
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Cadastrar Escola';
      }
    });
  }
})();
