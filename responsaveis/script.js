/**
 * script.js - Lógica do Formulário de Cadastro de Responsáveis
 * Integração com modelo.js (alunos.txt) e Webhook n8n
 */

document.addEventListener('DOMContentLoaded', () => {
  // Configuração dos Endpoints n8n
  const ENDPOINTS = {
    test: 'https://n8n.inetz.com.br/webhook-test/responsavel',
    prod: 'https://webhook.inetz.com.br/webhook/responsavel'
  };

  // Elementos do DOM
  const envBadge = document.getElementById('envBadge');
  const turmaSelect = document.getElementById('turmaSelect');
  const alunoSelect = document.getElementById('alunoSelect');
  const studentInfoCard = document.getElementById('studentInfoCard');
  const studentNameDisplay = document.getElementById('studentNameDisplay');
  const studentSubDisplay = document.getElementById('studentSubDisplay');
  const studentTurmaBadge = document.getElementById('studentTurmaBadge');
  const formResponsavel = document.getElementById('formResponsavel');
  const btnSubmit = document.getElementById('btnSubmit');
  const alertContainer = document.getElementById('alertContainer');
  const inputTelefone = document.getElementById('telefone');

  // Detecta parâmetro 'prod=true' na URL
  const urlParams = new URLSearchParams(window.location.search);
  const isProd = urlParams.get('prod') === 'true';
  const currentEndpoint = isProd ? ENDPOINTS.prod : ENDPOINTS.test;
  const currentAmbiente = isProd ? 'producao' : 'teste';

  // Configura a Badge do Ambiente
  if (isProd) {
    envBadge.className = 'env-badge prod';
    envBadge.innerHTML = '<i class="fa-solid fa-rocket"></i> Ambiente: Produção';
  } else {
    envBadge.className = 'env-badge test';
    envBadge.innerHTML = '<i class="fa-solid fa-flask"></i> Ambiente: Teste';
  }

  // Popula os Selects de Turma e Alunos
  function renderAlunos(turma = 'TODAS') {
    alunoSelect.innerHTML = '<option value="">-- Selecione o Aluno --</option>';
    
    if (!window.ModeloAlunos) return;

    const alunos = window.ModeloAlunos.getAlunosPorTurma(turma);
    alunos.forEach(aluno => {
      const option = document.createElement('option');
      option.value = aluno.id;
      option.textContent = `${aluno.nome} (${aluno.turma})`;
      alunoSelect.appendChild(option);
    });

    alunoSelect.disabled = false;
  }

  // Inicializa Turma e Alunos
  if (window.ModeloAlunos) {
    // Opção para todas as turmas
    const optionTodas = document.createElement('option');
    optionTodas.value = 'TODAS';
    optionTodas.textContent = `Todas as Turmas (${window.ModeloAlunos.getTodosAlunos().length} alunos)`;
    optionTodas.selected = true;
    turmaSelect.appendChild(optionTodas);

    const turmas = window.ModeloAlunos.getTurmas();
    turmas.forEach(turma => {
      const option = document.createElement('option');
      option.value = turma;
      option.textContent = `Turma ${turma}`;
      turmaSelect.appendChild(option);
    });

    // Popula inicialmente com todos os alunos de alunos.txt
    renderAlunos('TODAS');
  }

  // Evento: Selecionar Turma -> Filtra Select de Alunos
  turmaSelect.addEventListener('change', (e) => {
    const turmaSelecionada = e.target.value;
    studentInfoCard.classList.add('hidden');
    renderAlunos(turmaSelecionada);
  });

  // Evento: Selecionar Aluno -> Atualiza Card do Aluno
  alunoSelect.addEventListener('change', (e) => {
    const alunoId = e.target.value;
    if (!alunoId) {
      studentInfoCard.classList.add('hidden');
      return;
    }

    const aluno = window.ModeloAlunos.getAlunoPorId(alunoId);
    if (aluno) {
      studentNameDisplay.textContent = aluno.nome;
      studentSubDisplay.textContent = `RA: ${aluno.ra} | Escola: ${aluno.escola}`;
      studentTurmaBadge.textContent = `Turma ${aluno.turma}`;
      studentInfoCard.classList.remove('hidden');
    }
  });

  // Máscara dinâmica de telefone celular brasileiro (XX) XXXXX-XXXX
  inputTelefone.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }

    e.target.value = value;
  });

  // Helper para exibir alertas na tela
  function showMessage(type, text) {
    alertContainer.innerHTML = `
      <div class="alert-box ${type}">
        <span>${type === 'success' ? '✅' : '⚠️'}</span>
        <div>${text}</div>
      </div>
    `;
    alertContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearMessage() {
    alertContainer.innerHTML = '';
  }

  // Evento: Submit do Formulário
  formResponsavel.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage();

    const alunoId = alunoSelect.value;
    if (!alunoId) {
      showMessage('error', 'Por favor, selecione um aluno válido.');
      return;
    }

    const dadosResponsavel = {
      nome: document.getElementById('nomeResponsavel').value,
      tipo: document.getElementById('tipoResponsavel').value,
      telefone: inputTelefone.value,
      isWhatsapp: document.getElementById('isWhatsapp').checked,
      email: document.getElementById('emailResponsavel').value
    };

    try {
      // Monta o payload padronizado via modelo.js
      const payload = window.ModeloAlunos.vincularResponsavelPayload(
        alunoId,
        dadosResponsavel,
        currentAmbiente
      );

      // Desabilita o botão para evitar envio duplo
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '⌛ Enviando dados...';

      // Dispara a requisição POST para o webhook n8n
      const response = await fetch(currentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok || response.status === 200 || response.status === 201) {
        showMessage(
          'success',
          `<strong>Sucesso!</strong> Cadastro do responsável <strong>${dadosResponsavel.nome}</strong> enviado com sucesso para o n8n (${currentAmbiente.toUpperCase()}).`
        );
        formResponsavel.reset();
        studentInfoCard.classList.add('hidden');
        renderAlunos(turmaSelect.value);
      } else {
        throw new Error(`Servidor respondeu com código ${response.status}`);
      }
    } catch (err) {
      console.error('Erro no envio do formulário:', err);
      showMessage(
        'error',
        `<strong>Erro ao enviar:</strong> Não foi possível conectar ao servidor n8n (${currentAmbiente.toUpperCase()}). Verifique sua conexão ou tente novamente.`
      );
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Cadastrar e Vincular Responsável';
    }
  });
});
