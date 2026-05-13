(function() {
    'use strict';
  
    const DURATION  = 4000;
    const FADE_OUT  = 300;
    const MAX_TOASTS = 3;
  
    function getIcon(type) {
      const icons = { ENTRADA:'📥', ACTIVIDAD:'⚡', SALIDA:'📤', VALOR:'💎' };
      return icons[type] || '🔔';
    }
  
    function removeToast(toast) {
      if (!toast || !toast.parentNode) return;
      toast.classList.add('fade-out');
      setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, FADE_OUT);
    }
  
    function showToast(notification) {
      const container = document.getElementById('toast-container');
      if (!container) return;
  
      const existing = container.querySelectorAll('.toast');
      if (existing.length >= MAX_TOASTS) removeToast(existing[0]);
  
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `
        <div class="toast-icon">${getIcon(notification.type)}</div>
        <div class="toast-body">
          <div class="toast-title">${notification.title}</div>
          <div class="toast-sub">${notification.type} · ${notification.processId || ''} · ${notification.priority || 'LOW'}</div>
        </div>`;
  
      container.appendChild(toast);
  
      const timeout = setTimeout(() => removeToast(toast), DURATION);
  
      toast.addEventListener('click', () => {
        clearTimeout(timeout);
        removeToast(toast);
        const card = document.querySelector(`.notif-card[data-id="${notification.id}"]`);
        if (card) {
          card.scrollIntoView({ behavior:'smooth', block:'center' });
          card.style.outline = '2px solid var(--blue)';
          setTimeout(() => card.style.outline = '', 2000);
        }
      });
    }
  
    function initToast() {
      const container = document.getElementById('toast-container');
      if (!container) {
        console.error('[Toast] No se encontró #toast-container');
        return;
      }
      console.log('[Toast] ✓ Inicializado');
    }
  
    window.initToast  = initToast;
    window.showToast  = showToast;
  })();