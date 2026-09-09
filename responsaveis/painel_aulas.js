/**
 * painel_aulas.js
 * Projeto: Dashboard inteligente de aulas — EE Antonio Reginato
 * Autor: Adriano Justino Rosa
 *
 * Responsabilidades:
 *  - Busca a grade do dia UMA ÚNICA VEZ no back-end Flask (/api/painel)
 *  - Obtém a hora oficial de Brasília via WorldTimeAPI
 *  - Calcula o status de cada horário (passada / em_andamento / proxima / futura)
 *  - Re-consulta a hora oficial a cada 60s e re-renderiza os status
 */

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const CONFIG = {
  // Altere para o endereço do servidor Flask em produção
  API_PAINEL:   'http://localhost:5000/api/painel',
  API_AULAS:    'http://localhost:5000/api/aulas',
  API_HORA:     'https://worldtimeapi.org/api/timezone/America/Sao_Paulo',
  INTERVALO_MS: 60_000,           // Recalcula status a cada 60 segundos
  DURACAO_AULA: 50,               // Minutos de duração de cada aula
};

// ============================================================
// ESTADO GLOBAL
// ============================================================

let gradeDoDia   = null;   // JSON da grade, carregado uma única vez
let timerRelogio = null;   // Referência ao setInterval
let listaAulasCrud = [];   // Cache das aulas no modal CRUD

// ============================================================
// UTILIDADES DE TEMPO
// ============================================================

/**
 * Converte string "HH:MM" em total de minutos desde meia-noite.
 */
function horaParaMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Busca a hora oficial de Brasília via WorldTimeAPI.
 * Retorna uma string "HH:MM" ou null em caso de falha.
 */
async function fetchHoraOficial() {
  try {
    const res  = await fetch(CONFIG.API_HORA, { cache: 'no-store' });
    const data = await res.json();
    const dt = new Date(data.datetime);
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch (err) {
    console.warn('WorldTimeAPI indisponível. Usando relógio local.', err);
    const agora = new Date();
    const hh = String(agora.getHours()).padStart(2, '0');
    const mm = String(agora.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}

// ============================================================
// STATUS DAS AULAS
// ============================================================

function calcularStatus(horarios, horaAtual) {
  const minAtual = horaParaMinutos(horaAtual);
  let emAndamentoIdx = -1;

  const comStatus = horarios.map((slot, idx) => {
    const ini = horaParaMinutos(slot.horario);
    const fim = ini + CONFIG.DURACAO_AULA;

    let status;
    if (fim <= minAtual) {
      status = 'passada';
    } else if (ini <= minAtual && minAtual < fim) {
      status = 'em_andamento';
      emAndamentoIdx = idx;
    } else {
      status = 'futura';
    }

    return { ...slot, status };
  });

  const idxProxima = emAndamentoIdx >= 0
    ? emAndamentoIdx + 1
    : comStatus.findIndex(s => s.status === 'futura');

  if (idxProxima >= 0 && idxProxima < comStatus.length && comStatus[idxProxima].status === 'futura') {
    comStatus[idxProxima].status = 'proxima';
  }

  return comStatus;
}

// ============================================================
// RENDERIZAÇÃO DA GRADE DE AULAS
// ============================================================

function renderGrade(grade, horaAtual) {
  const container = document.getElementById('gradeContainer');
  const horaDisplay = document.getElementById('horaAtualDisplay');
  const statusGlobal = document.getElementById('statusGlobal');

  if (horaDisplay) horaDisplay.textContent = horaAtual;

  if (!grade || !grade.horarios || grade.horarios.length === 0) {
    container.innerHTML = `
      <div class="painel-vazio">
        <i class="fa-solid fa-calendar-xmark"></i>
        <p>Sem aulas hoje — ${grade?.dia_semana || 'Fim de semana'}</p>
      </div>`;
    if (statusGlobal) statusGlobal.textContent = '';
    return;
  }

  const slotsComStatus = calcularStatus(grade.horarios, horaAtual);
  const turmas = Object.keys(slotsComStatus[0]?.turmas || {}).sort();

  const emAndamento = slotsComStatus.find(s => s.status === 'em_andamento');
  const proxima     = slotsComStatus.find(s => s.status === 'proxima');
  if (statusGlobal) {
    if (emAndamento) {
      statusGlobal.innerHTML =
        `<span class="badge-em-andamento"><span class="pulso"></span>EM CURSO: ${emAndamento.horario}</span>`;
    } else if (proxima) {
      statusGlobal.innerHTML =
        `<span class="badge-proxima">⏭ PRÓXIMA: ${proxima.horario}</span>`;
    } else {
      statusGlobal.innerHTML = '';
    }
  }

  let html = `
    <div class="grade-wrapper">
      <table class="grade-tabela" id="gradeTabela">
        <thead>
          <tr>
            <th class="col-horario">Horário</th>
            ${turmas.map(t => `<th class="col-turma">${t}</th>`).join('')}
          </tr>
        </thead>
        <tbody>`;

  slotsComStatus.forEach(slot => {
    const cssStatus = `status-${slot.status}`;
    let badgeHTML = '';
    if (slot.status === 'em_andamento') {
      badgeHTML = `<span class="badge-em-andamento"><span class="pulso"></span>EM CURSO</span>`;
    } else if (slot.status === 'proxima') {
      badgeHTML = `<span class="badge-proxima">⏭ PRÓXIMA</span>`;
    }

    html += `<tr class="linha-horario ${cssStatus}">
      <td class="col-horario">
        <div class="horario-wrap">
          <span class="horario-hora">${slot.horario}</span>
          ${badgeHTML}
        </div>
      </td>`;

    turmas.forEach(turma => {
      const aula = slot.turmas?.[turma];
      const diaSemana = grade.dia_semana || 'Seg';
      
      if (aula) {
        html += `
          <td class="col-aula col-aula-clickable" 
              data-dia="${diaSemana}" 
              data-horario="${slot.horario}" 
              data-turma="${turma}" 
              data-disciplina="${aula.disciplina}" 
              data-professor="${aula.professor}"
              title="Clique para editar a aula de ${turma}">
            <div class="aula-card">
              <span class="aula-disciplina">${aula.disciplina}</span>
              <span class="aula-professor">${aula.professor}</span>
            </div>
          </td>`;
      } else {
        html += `
          <td class="col-aula col-vazia col-aula-clickable" 
              data-dia="${diaSemana}" 
              data-horario="${slot.horario}" 
              data-turma="${turma}" 
              data-disciplina="" 
              data-professor=""
              title="Clique para cadastrar aula para ${turma} às ${slot.horario}">—</td>`;
      }
    });

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;

  // Atribui evento de clique para edição rápida em cada célula da grade
  document.querySelectorAll('.col-aula-clickable').forEach(cell => {
    cell.addEventListener('click', () => {
      const dia = cell.getAttribute('data-dia');
      const horario = cell.getAttribute('data-horario');
      const turma = cell.getAttribute('data-turma');
      const disciplina = cell.getAttribute('data-disciplina');
      const professor = cell.getAttribute('data-professor');

      abrirModalCrudComDados({
        dia_semana: dia,
        horario: horario,
        turma: turma,
        disciplina: disciplina,
        professor: professor
      });
    });
  });
}

// ============================================================
// FETCH DA GRADE
// ============================================================

async function fetchGrade() {
  const container = document.getElementById('gradeContainer');
  try {
    const res  = await fetch(CONFIG.API_PAINEL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    gradeDoDia = await res.json();

    const subtitulo = document.getElementById('painelSubtitulo');
    if (subtitulo && gradeDoDia.data) {
      subtitulo.textContent = `${gradeDoDia.data} — ${gradeDoDia.dia_semana}`;
    }
  } catch (err) {
    console.error('Erro ao buscar grade:', err);
    container.innerHTML = `
      <div class="painel-erro">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>Não foi possível conectar ao servidor.<br>
           Verifique se o Flask está rodando em <code>${CONFIG.API_PAINEL}</code></p>
      </div>`;
  }
}

async function tick() {
  if (!gradeDoDia) return;
  const hora = await fetchHoraOficial();
  renderGrade(gradeDoDia, hora);
}

async function iniciar() {
  await fetchGrade();
  if (gradeDoDia) {
    const hora = await fetchHoraOficial();
    renderGrade(gradeDoDia, hora);
  }
  timerRelogio = setInterval(tick, CONFIG.INTERVALO_MS);
}

// ============================================================
// MODAL CRUD DE HORÁRIOS
// ============================================================

function abrirModalCrudComDados(dados = {}) {
  const modal = document.getElementById('modalCrudHorario');
  const inputId = document.getElementById('crudAulaId');
  const inputDia = document.getElementById('crudDiaSemana');
  const inputHorario = document.getElementById('crudHorario');
  const inputTurma = document.getElementById('crudTurma');
  const inputDisciplina = document.getElementById('crudDisciplina');
  const inputProfessor = document.getElementById('crudProfessor');
  const btnExcluir = document.getElementById('btnExcluirAula');
  const modalTitulo = document.getElementById('modalTitulo');

  if (dados.id) {
    inputId.value = dados.id;
    if (btnExcluir) btnExcluir.style.display = 'inline-flex';
    if (modalTitulo) modalTitulo.textContent = 'Editar Horário de Aula';
  } else {
    inputId.value = '';
    if (btnExcluir) btnExcluir.style.display = 'none';
    if (modalTitulo) modalTitulo.textContent = 'Cadastrar / Gerenciar Horários';
  }

  if (dados.dia_semana) inputDia.value = dados.dia_semana;
  if (dados.horario) inputHorario.value = dados.horario;
  if (dados.turma) inputTurma.value = dados.turma;
  if (dados.disciplina) inputDisciplina.value = dados.disciplina;
  if (dados.professor) inputProfessor.value = dados.professor;

  modal.classList.add('active');
  carregarAulasCrud();
}

function fecharModalCrud() {
  const modal = document.getElementById('modalCrudHorario');
  modal.classList.remove('active');
  limparFormCrud();
}

function limparFormCrud() {
  document.getElementById('crudAulaId').value = '';
  document.getElementById('formAulaCrud').reset();
  const btnExcluir = document.getElementById('btnExcluirAula');
  const modalTitulo = document.getElementById('modalTitulo');
  if (btnExcluir) btnExcluir.style.display = 'none';
  if (modalTitulo) modalTitulo.textContent = 'Gerenciar Horários de Aulas';
}

async function carregarAulasCrud(busca = '') {
  const tbody = document.getElementById('tbodyAulasCrud');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--sf-text-muted);"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando...</td></tr>`;

  try {
    let url = CONFIG.API_AULAS;
    if (busca) url += `?busca=${encodeURIComponent(busca)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao listar aulas');
    listaAulasCrud = await res.json();

    renderTabelaCrud(listaAulasCrud);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--sf-accent-red);">Erro ao carregar horários.</td></tr>`;
  }
}

function renderTabelaCrud(aulas) {
  const tbody = document.getElementById('tbodyAulasCrud');
  if (!aulas || aulas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--sf-text-muted);">Nenhum horário encontrado.</td></tr>`;
    return;
  }

  let html = '';
  aulas.forEach(a => {
    html += `
      <tr>
        <td><strong>${a.dia_semana}</strong></td>
        <td>${a.horario}</td>
        <td><span class="badge-turma-item">${a.turma}</span></td>
        <td><strong>${a.disciplina}</strong></td>
        <td>${a.professor || '—'}</td>
        <td style="text-align: center;">
          <button class="btn-icon-action btn-icon-edit" onclick="editarAulaPeloId(${a.id})" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="btn-icon-action btn-icon-delete" onclick="excluirAulaPeloId(${a.id})" title="Excluir"><i class="fa-solid fa-trash-can"></i></button>
        </td>
      </tr>`;
  });

  tbody.innerHTML = html;
}

window.editarAulaPeloId = function(id) {
  const aula = listaAulasCrud.find(a => a.id === id);
  if (aula) {
    abrirModalCrudComDados(aula);
  }
};

window.excluirAulaPeloId = async function(id) {
  if (!confirm(`Tem certeza que deseja excluir esta aula (ID ${id})?`)) return;

  try {
    const res = await fetch(`${CONFIG.API_AULAS}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir aula');
    
    alert('Aula excluída com sucesso!');
    limparFormCrud();
    await carregarAulasCrud();
    await fetchGrade();
    const hora = await fetchHoraOficial();
    renderGrade(gradeDoDia, hora);
  } catch (err) {
    alert('Erro ao excluir aula: ' + err.message);
  }
};

async function salvarFormCrud(e) {
  e.preventDefault();

  const id = document.getElementById('crudAulaId').value;
  const payload = {
    dia_semana: document.getElementById('crudDiaSemana').value,
    horario: document.getElementById('crudHorario').value,
    turma: document.getElementById('crudTurma').value,
    disciplina: document.getElementById('crudDisciplina').value,
    professor: document.getElementById('crudProfessor').value,
  };

  const method = id ? 'PUT' : 'POST';
  const url = id ? `${CONFIG.API_AULAS}/${id}` : CONFIG.API_AULAS;

  try {
    const res = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.erro || 'Erro ao salvar aula');
    }

    alert(id ? 'Aula atualizada com sucesso!' : 'Aula cadastrada com sucesso!');
    limparFormCrud();
    await carregarAulasCrud();
    await fetchGrade();
    const hora = await fetchHoraOficial();
    renderGrade(gradeDoDia, hora);
  } catch (err) {
    alert('Erro ao salvar: ' + err.message);
  }
}

// ============================================================
// FUNCIONALIDADES DE INTERFACE (TELA INTEIRA E MENU RECOLHIDO)
// ============================================================

function toggleFullscreen() {
  const doc = document.documentElement;
  const isFS = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );

  if (!isFS) {
    if (doc.requestFullscreen) {
      doc.requestFullscreen();
    } else if (doc.webkitRequestFullscreen) {
      doc.webkitRequestFullscreen();
    } else if (doc.mozRequestFullScreen) {
      doc.mozRequestFullScreen();
    } else if (doc.msRequestFullscreen) {
      doc.msRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

function setupUIInteractions() {
  const sidebar         = document.getElementById('sidebar');
  const mobileToggle    = document.getElementById('mobileMenuToggle');
  const sidebarCollapse = document.getElementById('sidebarCollapseBtn');
  const fullscreenBtn   = document.getElementById('fullscreenBtn');

  const btnGerenciar = document.getElementById('btnGerenciarHorarios');
  const btnFecharModal = document.getElementById('btnFecharModal');
  const btnCancelarEdicao = document.getElementById('btnCancelarEdicao');
  const formCrud = document.getElementById('formAulaCrud');
  const btnExcluir = document.getElementById('btnExcluirAula');
  const inputBusca = document.getElementById('inputBuscaCrud');

  // Listeners do Modal CRUD
  if (btnGerenciar) {
    btnGerenciar.addEventListener('click', () => abrirModalCrudComDados());
  }

  if (btnFecharModal) {
    btnFecharModal.addEventListener('click', fecharModalCrud);
  }

  if (btnCancelarEdicao) {
    btnCancelarEdicao.addEventListener('click', limparFormCrud);
  }

  if (formCrud) {
    formCrud.addEventListener('submit', salvarFormCrud);
  }

  if (btnExcluir) {
    btnExcluir.addEventListener('click', () => {
      const id = document.getElementById('crudAulaId').value;
      if (id) window.excluirAulaPeloId(parseInt(id, 10));
    });
  }

  if (inputBusca) {
    let timeoutBusca = null;
    inputBusca.addEventListener('input', (e) => {
      clearTimeout(timeoutBusca);
      timeoutBusca = setTimeout(() => {
        carregarAulasCrud(e.target.value.trim());
      }, 300);
    });
  }

  // Sidebar Collapse & Mobile
  const isCollapsedSaved = localStorage.getItem('sidebar_collapsed') === 'true';
  if (isCollapsedSaved && sidebar && window.innerWidth > 900) {
    sidebar.classList.add('collapsed');
  }

  if (sidebarCollapse && sidebar) {
    sidebarCollapse.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        sidebar.classList.toggle('open');
      } else {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
      }
    });
  }

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Tela Inteira (Fullscreen)
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    const updateFullscreenUI = () => {
      const isFS = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      if (isFS) {
        fullscreenBtn.classList.add('active');
        fullscreenBtn.innerHTML = `<i class="fa-solid fa-compress"></i> <span>Sair da Tela Inteira</span>`;
        fullscreenBtn.title = 'Sair do modo Tela Inteira (Esc)';
        document.body.classList.add('fullscreen-mode');
      } else {
        fullscreenBtn.classList.remove('active');
        fullscreenBtn.innerHTML = `<i class="fa-solid fa-expand"></i> <span>Tela Inteira</span>`;
        fullscreenBtn.title = 'Alternar modo Tela Inteira (F11)';
        document.body.classList.remove('fullscreen-mode');
      }
    };

    document.addEventListener('fullscreenchange', updateFullscreenUI);
    document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
    document.addEventListener('mozfullscreenchange', updateFullscreenUI);
    document.addEventListener('MSFullscreenChange', updateFullscreenUI);
  }
}

// ============================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  setupUIInteractions();
  iniciar();
});
