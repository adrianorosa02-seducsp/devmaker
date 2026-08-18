// Banco de dados em memória (Armazenamento de Tokens)
let tokensStore = JSON.parse(localStorage.getItem('exam_tokens_db')) || [
  {
    id: 1,
    token: '7F3A9B12',
    user_id: 'ALUNO-202601',
    user_name: 'Adriano Justino',
    exam_id: 'EXAM-101',
    exam_name: 'Matemática Discreta - P1',
    status: 'pode_usar',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 15 * 60000).toISOString()
  },
  {
    id: 2,
    token: 'B4C8D9E0',
    user_id: 'ALUNO-202602',
    user_name: 'Maria Silva',
    exam_id: 'EXAM-102',
    exam_name: 'Estrutura de Dados II',
    status: 'em_uso',
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    expires_at: new Date(Date.now() + 10 * 60000).toISOString()
  }
];

let activeStudentToken = null;

// Função para mudar de aba
function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
  if (activeBtn) activeBtn.classList.add('active');
}

// Salva estado no LocalStorage
function saveState() {
  localStorage.setItem('exam_tokens_db', JSON.stringify(tokensStore));
}

// Gera um token aleatório e seguro
function generateSecureToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  const cryptoObj = window.crypto || window.msCrypto;
  const values = new Uint8Array(8);
  cryptoObj.getRandomValues(values);
  for (let i = 0; i < 8; i++) {
    token += chars[values[i] % chars.length];
  }
  return token;
}

// Manipula o envio do formulário de geração pelo Professor
function handleGenerateToken(e) {
  e.preventDefault();

  const examSelect = document.getElementById('exam_id');
  const userSelect = document.getElementById('user_id');
  const minutes = parseInt(document.getElementById('expiration_time').value);

  const newTokenCode = generateSecureToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + minutes * 60000);

  const newToken = {
    id: Date.now(),
    token: newTokenCode,
    user_id: userSelect.value,
    user_name: userSelect.options[userSelect.selectedIndex].text.split('(')[0].trim(),
    exam_id: examSelect.value,
    exam_name: examSelect.options[examSelect.selectedIndex].text,
    status: 'pode_usar',
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString()
  };

  tokensStore.unshift(newToken);
  saveState();
  renderTokenTable();

  // Exibe a caixa de destaque com o novo token
  document.getElementById('latest-token-box').style.display = 'block';
  document.getElementById('display-token-code').innerText = newTokenCode;
  document.getElementById('display-token-timer').innerText = `Válido por ${minutes} minutos (até ${expiresAt.toLocaleTimeString()})`;
}

// Copia o código do último token
function copyLatestToken() {
  const code = document.getElementById('display-token-code').innerText;
  navigator.clipboard.writeText(code).then(() => {
    alert('Código do Token copiado para a área de transferência!');
  });
}

// Copia qualquer token da tabela
function copyToken(tokenCode) {
  navigator.clipboard.writeText(tokenCode).then(() => {
    alert(`Token ${tokenCode} copiado!`);
  });
}

// Revoga ou expira token manualmente
function revokeToken(tokenId) {
  const target = tokensStore.find(t => t.id === tokenId);
  if (target) {
    target.status = 'expirado';
    saveState();
    renderTokenTable();
  }
}

// Atualiza e renderiza a tabela de tokens
function renderTokenTable() {
  const tbody = document.getElementById('tokens-table-body');
  tbody.innerHTML = '';

  const now = new Date();

  tokensStore.forEach(t => {
    // Checa expiração dinâmica
    if (t.status === 'pode_usar' && new Date(t.expires_at) < now) {
      t.status = 'expirado';
    }

    const tr = document.createElement('tr');
    
    const formattedExpires = new Date(t.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    tr.innerHTML = `
      <td><strong style="font-family: monospace; letter-spacing: 1px; color: var(--accent-cyan);">${t.token}</strong></td>
      <td>${t.user_name}</td>
      <td>${t.exam_name}</td>
      <td><span class="badge badge-${t.status}">${t.status.replace('_', ' ')}</span></td>
      <td>${formattedExpires}</td>
      <td>
        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="copyToken('${t.token}')">Copiar</button>
        ${t.status === 'pode_usar' ? `<button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: var(--accent-rose);" onclick="revokeToken(${t.id})">Cancelar</button>` : ''}
      </td>
    `;

    tbody.appendChild(tr);
  });

  saveState();
}

// Validação pelo Aluno
function handleValidateStudentToken(e) {
  e.preventDefault();
  const inputToken = document.getElementById('student_input_token').value.trim().toUpperCase();
  const feedback = document.getElementById('student-feedback');
  
  const tokenObj = tokensStore.find(t => t.token === inputToken);
  const now = new Date();

  feedback.style.display = 'block';

  if (!tokenObj) {
    feedback.style.background = 'rgba(239, 68, 68, 0.2)';
    feedback.style.color = 'var(--accent-rose)';
    feedback.innerText = '❌ Token inválido ou não encontrado. Verifique com o professor.';
    return;
  }

  if (tokenObj.status === 'expirado' || new Date(tokenObj.expires_at) < now) {
    tokenObj.status = 'expirado';
    saveState();
    renderTokenTable();
    feedback.style.background = 'rgba(239, 68, 68, 0.2)';
    feedback.style.color = 'var(--accent-rose)';
    feedback.innerText = '⚠️ Este token já expirou! Solicite a liberação de um novo código.';
    return;
  }

  if (tokenObj.status === 'utilizado') {
    feedback.style.background = 'rgba(148, 163, 184, 0.2)';
    feedback.style.color = 'var(--text-muted)';
    feedback.innerText = 'ℹ️ Este token já foi utilizado para realizar a prova.';
    return;
  }

  // Token válido -> alterar status para em_uso
  tokenObj.status = 'em_uso';
  activeStudentToken = tokenObj;
  saveState();
  renderTokenTable();

  feedback.style.background = 'rgba(16, 185, 129, 0.2)';
  feedback.style.color = 'var(--accent-emerald)';
  feedback.innerText = '✅ Token validado com sucesso! Carregando caderno de prova...';

  setTimeout(() => {
    document.getElementById('student-login-card').style.display = 'none';
    document.getElementById('exam-paper-card').classList.add('active');

    document.getElementById('paper-exam-title').innerText = tokenObj.exam_name;
    document.getElementById('paper-student-name').innerText = `Aluno: ${tokenObj.user_name}`;
  }, 1000);
}

// Entrega de Prova pelo Aluno
function handleSubmitExam() {
  if (activeStudentToken) {
    activeStudentToken.status = 'utilizado';
    saveState();
    renderTokenTable();

    alert('🎉 Prova enviada com sucesso! O status do token foi atualizado para UTILIZADO.');

    // Reiniciar tela do aluno
    document.getElementById('exam-paper-card').classList.remove('active');
    document.getElementById('student-login-card').style.display = 'block';
    document.getElementById('student_input_token').value = '';
    document.getElementById('student-feedback').style.display = 'none';
  }
}

// Inicializar na carga do documento
document.addEventListener('DOMContentLoaded', () => {
  renderTokenTable();
  // Timer de checagem a cada 10 segundos para atualizar expirações
  setInterval(renderTokenTable, 10000);
});
