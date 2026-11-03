/**
 * app.js - Script Global e Compartilhado da Escola do Futuro
 * Contém o comportamento padrão da interface (Sidebar, Busca, Máscaras, Alertas)
 * Reutilizável em todas as páginas e cadastros da aplicação.
 */

window.EscolaDoFuturo = window.EscolaDoFuturo || {};

document.addEventListener('DOMContentLoaded', () => {
  // Elementos comuns do Layout
  const sidebar = document.getElementById('sidebar');
  const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  const sidebarSearchInput = document.getElementById('sidebarSearchInput');
  const sidebarNavList = document.getElementById('sidebarNavList');

  // Restaura estado de recolhimento da sidebar no desktop
  const isCollapsedSaved = localStorage.getItem('sidebar_collapsed') === 'true';
  if (isCollapsedSaved && sidebar && window.innerWidth > 900) {
    sidebar.classList.add('collapsed');
  }

  // Alterna gaveta mobile da sidebar
  function toggleMobileSidebar() {
    if (!sidebar) return;
    const isOpen = sidebar.classList.toggle('open');
    if (sidebarBackdrop) {
      sidebarBackdrop.classList.toggle('active', isOpen);
    }
  }

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', toggleMobileSidebar);
  }

  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('open');
      sidebarBackdrop.classList.remove('active');
    });
  }

  if (sidebarCollapseBtn && sidebar) {
    sidebarCollapseBtn.addEventListener('click', () => {
      if (window.innerWidth <= 900) {
        toggleMobileSidebar();
      } else {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebar_collapsed', isCollapsed ? 'true' : 'false');
      }
    });
  }

  // Filtro de busca de módulos na sidebar
  if (sidebarSearchInput && sidebarNavList) {
    sidebarSearchInput.addEventListener('input', (e) => {
      const termo = e.target.value.toLowerCase().trim();
      const items = sidebarNavList.querySelectorAll('li');

      items.forEach(item => {
        if (item.classList.contains('nav-category-header')) return;
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(termo) ? '' : 'none';
      });
    });
  }
});

/**
 * Utilitário: Aplica máscara dinâmica de telefone brasileiro (Fixo: 10 dígitos / Celular: 11 dígitos)
 * @param {HTMLInputElement} input
 */
EscolaDoFuturo.aplicarMascaraTelefone = function(input) {
  if (!input) return;
  input.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 10) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }

    e.target.value = value;
  });
};

/**
 * Utilitário: Exibe caixa de alerta padronizada do Design System
 * @param {string} containerId - ID do elemento onde o alerta será inserido
 * @param {'success'|'error'} tipo - Tipo do alerta
 * @param {string} titulo - Título em negrito do alerta
 * @param {string} mensagem - Texto ou HTML detalhado da mensagem
 */
EscolaDoFuturo.mostrarAlerta = function(containerId, tipo, titulo, mensagem) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const icon = tipo === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation';
  const iconColor = tipo === 'success' ? 'var(--sf-success-green)' : 'var(--sf-accent-red)';

  container.innerHTML = `
    <div class="alert-box ${tipo}">
      <i class="fa-solid ${icon}" style="font-size: 1.25rem; color: ${iconColor}; margin-top: 2px;"></i>
      <div>
        <strong>${titulo}</strong><br>
        ${mensagem}
      </div>
    </div>
  `;
  container.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

/**
 * Utilitário: Limpa os alertas do container informado
 * @param {string} containerId
 */
EscolaDoFuturo.limparAlertas = function(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }
};

// ============================================================
// SISTEMA DE ROTAS (SPA - SINGLE PAGE APPLICATION)
// ============================================================
window.EscolaSPA = {
  canvasId: 'spa-canvas',
  
  carregarPagina: async function(url, linkElement = null) {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas) return;

    // Atualiza estado ativo no menu
    if (linkElement) {
      document.querySelectorAll('.sidebar-nav-item').forEach(el => el.classList.remove('active'));
      linkElement.classList.add('active');
    }

    // Loader
    canvas.innerHTML = `
      <div class="spa-loader" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:40vh;">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size:3rem; color:#2563eb; margin-bottom:20px;"></i>
        <span style="color:#64748b; font-size:1.2rem;">Carregando módulo...</span>
      </div>
    `;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      
      const htmlText = await response.text();
      
      // Extrair apenas o conteúdo útil se for uma página completa
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlText;
      const contentCanvas = tempDiv.querySelector('.content-canvas');
      
      canvas.innerHTML = contentCanvas ? contentCanvas.innerHTML : htmlText;

      // Executar scripts contidos na View injetada
      this.executarScriptsDaView(tempDiv);

    } catch (error) {
      console.error('Erro no SPA:', error);
      canvas.innerHTML = `
        <div class="spa-loader" style="color: #ef4444; text-align:center; padding: 40px;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem;"></i>
          <p>Falha ao carregar o módulo solicitado.</p>
        </div>
      `;
    }
  },

  executarScriptsDaView: function(container) {
    const scripts = container.querySelectorAll('script');
    scripts.forEach(oldScript => {
      // Ignorar app.js para não recarregar a engine toda vez
      if (oldScript.src && oldScript.src.includes('app.js')) return;

      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      if (oldScript.innerHTML) newScript.appendChild(document.createTextNode(oldScript.innerHTML));
      document.body.appendChild(newScript);
    });
  },

  inicializarRouter: function() {
    const links = document.querySelectorAll('.spa-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const url = link.getAttribute('data-url');
        if (url) {
          this.carregarPagina(url, link);
          // Fecha menu lateral se estiver no mobile
          const sidebar = document.getElementById('sidebar');
          if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            const backdrop = document.getElementById('sidebarBackdrop');
            if(backdrop) backdrop.classList.remove('active');
          }
        }
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('spa-canvas')) {
    window.EscolaSPA.inicializarRouter();
  }
});
