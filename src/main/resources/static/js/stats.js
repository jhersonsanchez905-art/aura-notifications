(function() {
    'use strict';
  
    function updateSummary(currentState) {
      const total  = currentState.notifications.length;
      const unread = currentState.unreadCount;
      const read   = total - unread;
  
      const elTotal  = document.getElementById('stat-total');
      const elUnread = document.getElementById('stat-unread');
      const elRead   = document.getElementById('stat-read');
  
      if (elTotal)  elTotal.textContent  = total.toLocaleString();
      if (elUnread) elUnread.textContent = unread;
      if (elRead)   elRead.textContent   = read.toLocaleString();
    }
  
    function updateBars(currentState) {
      const stats = state.getStatsByType();
      const total = currentState.notifications.length;
      if (total === 0) return;
  
      ['ENTRADA','ACTIVIDAD','SALIDA','VALOR'].forEach(type => {
        const count = stats[type] || 0;
        const pct   = Math.round((count / total) * 100);
        const li    = document.querySelector(`.cat-list .cat-row[data-type="${type}"]`) ||
                      document.querySelector(`.type-list li[data-type="${type}"]`);
        if (!li) return;
        const bar   = li.querySelector('.cat-bar') || li.querySelector('.bar-fill');
        const cnt   = li.querySelector('.cat-count') || li.querySelector('.type-count');
        const p     = li.querySelector('.cat-pct');
        if (bar) bar.style.width = pct + '%';
        if (cnt) cnt.textContent = count;
        if (p)   p.textContent   = pct + '%';
      });
    }
  
    function initStats() {
      const panel = document.querySelector('.stats-col') ||
                    document.querySelector('.stats-panel');
      if (!panel) {
        console.error('[Stats] No se encontró el panel de estadísticas');
        return;
      }
  
      state.subscribe(function(currentState) {
        updateSummary(currentState);
        updateBars(currentState);
      });
  
      console.log('[Stats] ✓ Inicializado');
    }
  
    window.initStats = initStats;
  })();