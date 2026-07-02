// LocalStorage Migration: Ensure old local backend URL is migrated to the new production URL
let activeApiUrl = localStorage.getItem('devprovas_api_url');
if (activeApiUrl === 'http://localhost:8000') {
    activeApiUrl = 'https://geduc.inetz.com.br';
    localStorage.setItem('devprovas_api_url', activeApiUrl);
}

// State Management
const state = {
    apiBaseUrl: activeApiUrl || 'https://geduc.inetz.com.br',
    disciplines: [],
    schools: [],
    filters: {
        search: '',
        status: 'todos'
    },
    deleteTarget: {
        id: null,
        name: ''
    },
    healthCheckInterval: null
};

// DOM Elements
const elements = {
    apiInput: document.getElementById('api-base-url-input'),
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    searchInput: document.getElementById('search-input'),
    filterStatus: document.getElementById('filter-status'),
    btnCreate: document.getElementById('btn-create-discipline'),
    gridWrapper: document.getElementById('disciplines-grid-wrapper'),
    
    // Discipline Modal
    disciplineModal: document.getElementById('discipline-modal'),
    disciplineForm: document.getElementById('discipline-form'),
    modalTitle: document.getElementById('modal-title'),
    modalCloseBtn: document.getElementById('modal-close-btn'),
    btnCancelDiscipline: document.getElementById('btn-cancel-discipline'),
    disciplineId: document.getElementById('discipline-id'),
    disciplineNome: document.getElementById('discipline-nome'),
    disciplineCodigo: document.getElementById('discipline-codigo'),
    disciplineEscola: document.getElementById('discipline-escola'),
    manualEscolaContainer: document.getElementById('manual-escola-container'),
    disciplineEscolaManual: document.getElementById('discipline-escola-manual'),
    disciplineAtivo: document.getElementById('discipline-ativo'),
    
    // Delete Modal
    deleteModal: document.getElementById('delete-modal'),
    deleteModalCloseBtn: document.getElementById('delete-modal-close-btn'),
    btnCancelDelete: document.getElementById('btn-cancel-delete'),
    btnConfirmDelete: document.getElementById('btn-confirm-delete'),
    deleteDisciplineName: document.getElementById('delete-discipline-name'),
    
    // Toast
    toastContainer: document.getElementById('toast-container')
};

// Toast Notifications System
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <div class="toast-message">${message}</div>
        <button class="toast-close">&times;</button>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto dismiss after 4 seconds
    const autoDismiss = setTimeout(() => {
        dismissToast(toast);
    }, 4000);
    
    // Click to dismiss
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(autoDismiss);
        dismissToast(toast);
    });
}

function dismissToast(toast) {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
        toast.remove();
    });
}

// API Integration Helpers
async function apiFetch(endpoint, options = {}) {
    // Sanitize API URL to ensure no trailing slash, avoiding double-slash URLs
    const cleanedBase = state.apiBaseUrl.replace(/\/+$/, '');
    const url = `${cleanedBase}${endpoint}`;
    
    // Setting default headers, no authorization header since auth is disabled
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const config = {
        ...options,
        headers
    };
    
    try {
        const response = await fetch(url, config);
        
        if (response.status === 204) {
            return null; // No Content
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            // FastAPI validation errors structure or custom message
            const errorMessage = data.detail 
                ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) 
                : 'Erro desconhecido na requisição.';
            throw new Error(errorMessage);
        }
        
        return data;
    } catch (error) {
        console.error(`Erro na requisição para ${endpoint}:`, error);
        throw error;
    }
}

// Check backend health status
async function checkHealth() {
    try {
        const data = await apiFetch('/health');
        if (data && data.status === 'healthy') {
            elements.statusDot.className = 'status-dot online';
            elements.statusText.textContent = 'Conectado';
        } else if (data && data.status === 'unhealthy') {
            // API responds but database reports disconnected (unhealthy)
            elements.statusDot.className = 'status-dot warning';
            elements.statusText.textContent = 'Conectado (Instável)';
        } else {
            elements.statusDot.className = 'status-dot offline';
            elements.statusText.textContent = 'Erro de Status';
        }
    } catch (error) {
        elements.statusDot.className = 'status-dot offline';
        elements.statusText.textContent = 'API Desconectada';
    }
}

// Start polling API health
function startHealthChecking() {
    if (state.healthCheckInterval) {
        clearInterval(state.healthCheckInterval);
    }
    checkHealth();
    state.healthCheckInterval = setInterval(checkHealth, 10000);
}

// Load data from the server
async function loadInitialData() {
    renderLoading(true);
    
    try {
        // Fetch Schools first so we can map names
        await fetchSchools();
    } catch (error) {
        showToast('Não foi possível carregar as escolas de apoio. O formulário usará entrada de texto manual.', 'warning');
    }
    
    try {
        await fetchDisciplines();
    } catch (error) {
        showToast('Erro ao carregar as disciplinas. Verifique a URL do servidor ou se a API está online.', 'error');
        renderEmptyState('Não foi possível obter a lista de disciplinas. Verifique a conexão com a API.');
    }
}

// Fetch disciplines list
async function fetchDisciplines() {
    try {
        const data = await apiFetch('/disciplinas/');
        state.disciplines = data || [];
        renderDisciplines();
    } catch (error) {
        throw error;
    }
}

// Fetch schools list for select input dropdown
async function fetchSchools() {
    try {
        const data = await apiFetch('/escolas/');
        state.schools = data || [];
        populateSchoolsSelect(state.schools);
    } catch (error) {
        populateSchoolsSelectFallback();
        throw error;
    }
}

// Render Loading Spinner
function renderLoading(show) {
    if (show) {
        elements.gridWrapper.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Carregando dados da API...</p>
            </div>
        `;
    }
}

// Render Empty State
function renderEmptyState(message = 'Nenhuma disciplina encontrada.') {
    elements.gridWrapper.innerHTML = `
        <div class="empty-state">
            <i class="fa-solid fa-folder-open"></i>
            <p>${message}</p>
        </div>
    `;
}

// Populate the select dropdown for schools
function populateSchoolsSelect(schools) {
    elements.disciplineEscola.innerHTML = '<option value="">-- Selecione uma Escola (Opcional) --</option>';
    elements.manualEscolaContainer.style.display = 'none';
    
    schools.forEach(school => {
        const option = document.createElement('option');
        option.value = school.id;
        option.textContent = school.nome;
        elements.disciplineEscola.appendChild(option);
    });
    
    // Add option to toggle manual UUID typing
    const manualOption = document.createElement('option');
    manualOption.value = 'manual';
    manualOption.textContent = '-- Informar UUID manualmente --';
    elements.disciplineEscola.appendChild(manualOption);
}

// Fallback when schools endpoint is unavailable
function populateSchoolsSelectFallback() {
    elements.disciplineEscola.innerHTML = `
        <option value="">-- Sem escolas disponíveis --</option>
        <option value="manual" selected>-- Informar UUID manualmente --</option>
    `;
    elements.manualEscolaContainer.style.display = 'block';
}

// Map Escola UUID to name
function getSchoolName(schoolId) {
    if (!schoolId) return null;
    const school = state.schools.find(s => s.id === schoolId);
    return school ? school.nome : `Escola (UUID: ${schoolId.substring(0, 8)}...)`;
}

// Render Disciplines List with Filters Applied
function renderDisciplines() {
    const filtered = state.disciplines.filter(item => {
        // Status filter
        if (state.filters.status === 'ativos' && !item.ativo) return false;
        if (state.filters.status === 'inativos' && item.ativo) return false;
        
        // Search query filter (by name or code)
        if (state.filters.search) {
            const query = state.filters.search.toLowerCase();
            const nameMatch = item.nome ? item.nome.toLowerCase().includes(query) : false;
            const codeMatch = item.codigo ? item.codigo.toLowerCase().includes(query) : false;
            return nameMatch || codeMatch;
        }
        
        return true;
    });

    // Check empty results
    if (filtered.length === 0) {
        renderEmptyState(state.disciplines.length === 0 
            ? 'Nenhuma disciplina cadastrada. Clique em "Nova Disciplina" para começar!' 
            : 'Nenhuma disciplina atende aos filtros de pesquisa.'
        );
        return;
    }

    elements.gridWrapper.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'list-container';
    
    filtered.forEach((discipline, index) => {
        const card = document.createElement('div');
        card.className = 'discipline-card';
        card.style.animation = `fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards`;
        card.style.animationDelay = `${index * 0.05}s`;
        card.style.opacity = '0';
        
        const schoolName = getSchoolName(discipline.escola_id);
        
        card.innerHTML = `
            <div class="card-header">
                <span class="discipline-code">${discipline.codigo || 'S/ COD'}</span>
                <span class="status-badge ${discipline.ativo ? 'active' : 'inactive'}">
                    ${discipline.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </div>
            <div class="card-body">
                <h3 class="discipline-title" title="${discipline.nome}">${discipline.nome}</h3>
                ${schoolName ? `
                    <div class="school-info" title="Escola vinculada">
                        <i class="fa-solid fa-school"></i>
                        <span>${schoolName}</span>
                    </div>
                ` : `
                    <div class="school-info" style="opacity: 0.5;">
                        <i class="fa-solid fa-link-slash"></i>
                        <span>Nenhuma escola vinculada</span>
                    </div>
                `}
            </div>
            <div class="card-footer">
                <button class="btn btn-secondary btn-icon-only edit-btn" data-id="${discipline.id}" title="Editar disciplina">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn btn-danger btn-icon-only delete-btn" data-id="${discipline.id}" data-nome="${discipline.nome}" title="Excluir disciplina">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        
        grid.appendChild(card);
    });

    elements.gridWrapper.appendChild(grid);
    
    // Add event listeners to card buttons dynamically
    grid.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            openDisciplineModal(id);
        });
    });

    grid.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const name = e.currentTarget.getAttribute('data-nome');
            openDeleteModal(id, name);
        });
    });
}

// Modal Toggle Functions
function toggleModal(modal, show) {
    if (show) {
        modal.classList.add('active');
    } else {
        modal.classList.remove('active');
    }
}

// Open Discipline Form Modal (Create or Edit)
function openDisciplineModal(id = null) {
    elements.disciplineForm.reset();
    elements.manualEscolaContainer.style.display = 'none';
    
    if (id) {
        // Edit Mode
        elements.modalTitle.textContent = 'Editar Disciplina';
        elements.disciplineId.value = id;
        
        const discipline = state.disciplines.find(item => item.id === id);
        if (discipline) {
            elements.disciplineNome.value = discipline.nome;
            elements.disciplineCodigo.value = discipline.codigo || '';
            elements.disciplineAtivo.checked = discipline.ativo;
            
            // Handle school id selection
            if (discipline.escola_id) {
                // If it is in the select dropdown list
                const optionExists = Array.from(elements.disciplineEscola.options).some(opt => opt.value === discipline.escola_id);
                if (optionExists) {
                    elements.disciplineEscola.value = discipline.escola_id;
                } else {
                    // Fall back to manual input mode
                    elements.disciplineEscola.value = 'manual';
                    elements.manualEscolaContainer.style.display = 'block';
                    elements.disciplineEscolaManual.value = discipline.escola_id;
                }
            } else {
                elements.disciplineEscola.value = '';
            }
        }
    } else {
        // Create Mode
        elements.modalTitle.textContent = 'Nova Disciplina';
        elements.disciplineId.value = '';
        elements.disciplineAtivo.checked = true;
        elements.disciplineEscola.value = '';
    }
    
    toggleModal(elements.disciplineModal, true);
    elements.disciplineNome.focus();
}

// Open Delete Modal
function openDeleteModal(id, name) {
    state.deleteTarget.id = id;
    state.deleteTarget.name = name;
    elements.deleteDisciplineName.textContent = name;
    toggleModal(elements.deleteModal, true);
}

// Action Handlers
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = elements.disciplineId.value;
    const nome = elements.disciplineNome.value.trim();
    const codigo = elements.disciplineCodigo.value.trim() || null;
    const ativo = elements.disciplineAtivo.checked;
    
    // Handle Escola ID matching manual vs dropdown
    let escola_id = null;
    if (elements.disciplineEscola.value === 'manual') {
        escola_id = elements.disciplineEscolaManual.value.trim() || null;
    } else if (elements.disciplineEscola.value) {
        escola_id = elements.disciplineEscola.value;
    }
    
    if (!nome) {
        showToast('O nome da disciplina é obrigatório.', 'warning');
        return;
    }
    
    const payload = { nome, codigo, escola_id, ativo };
    
    try {
        if (id) {
            // Edit
            await apiFetch(`/disciplinas/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showToast('Disciplina atualizada com sucesso!', 'success');
        } else {
            // Create
            await apiFetch('/disciplinas/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showToast('Disciplina criada com sucesso!', 'success');
        }
        
        toggleModal(elements.disciplineModal, false);
        fetchDisciplines(); // Refresh UI
    } catch (error) {
        showToast(`Erro ao salvar: ${error.message}`, 'error');
    }
}

async function handleConfirmDelete() {
    const id = state.deleteTarget.id;
    if (!id) return;
    
    try {
        await apiFetch(`/disciplinas/${id}`, {
            method: 'DELETE'
        });
        showToast('Disciplina excluída com sucesso!', 'success');
        toggleModal(elements.deleteModal, false);
        fetchDisciplines();
    } catch (error) {
        showToast(`Erro ao excluir: ${error.message}`, 'error');
    }
}

// Event Listeners initialization
function setupEventListeners() {
    // API URL change listener
    elements.apiInput.addEventListener('change', () => {
        const inputVal = elements.apiInput.value.trim();
        if (inputVal) {
            state.apiBaseUrl = inputVal;
            localStorage.setItem('devprovas_api_url', inputVal);
            showToast(`Servidor API alterado para: ${inputVal}`, 'info');
            startHealthChecking();
            loadInitialData();
        }
    });
    
    // Search & Filter listeners
    elements.searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        renderDisciplines();
    });
    
    elements.filterStatus.addEventListener('change', (e) => {
        state.filters.status = e.target.value;
        renderDisciplines();
    });
    
    // Create button listener
    elements.btnCreate.addEventListener('click', () => openDisciplineModal());
    
    // Modal close listeners
    elements.modalCloseBtn.addEventListener('click', () => toggleModal(elements.disciplineModal, false));
    elements.btnCancelDiscipline.addEventListener('click', () => toggleModal(elements.disciplineModal, false));
    
    elements.deleteModalCloseBtn.addEventListener('click', () => toggleModal(elements.deleteModal, false));
    elements.btnCancelDelete.addEventListener('click', () => toggleModal(elements.deleteModal, false));
    
    // Form submission
    elements.disciplineForm.addEventListener('submit', handleFormSubmit);
    
    // Delete action
    elements.btnConfirmDelete.addEventListener('click', handleConfirmDelete);
    
    // Toggle manual school ID field
    elements.disciplineEscola.addEventListener('change', (e) => {
        if (e.target.value === 'manual') {
            elements.manualEscolaContainer.style.display = 'block';
            elements.disciplineEscolaManual.focus();
        } else {
            elements.manualEscolaContainer.style.display = 'none';
        }
    });
}

// FadeInUp animation setup via JS for dynamic layouts
const styleEl = document.createElement('style');
styleEl.innerHTML = `
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(15px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;
document.head.appendChild(styleEl);

// Application bootstrap
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    startHealthChecking();
    loadInitialData();
});
