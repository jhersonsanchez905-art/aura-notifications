(function() {
    'use strict';
  
    function updateSidebarActive(filter) {
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
      });
      const active = document.querySelector(`.nav-item[data-filter="${filter}"]`);
      if (active) active.classList.add('active');
    }
  
    function updateTabActive(filter) {
      document.querySelectorAll('.feed-tab').forEach(tab => {
        tab.classList.remove('active');
      });
      const active = document.querySelector(`.feed-tab[data-filter="${filter}"]`);
      if (active) active.classList.add('active');
    }
  
    function updateBadges(currentState) {
      const stats = state.getStatsByType();
  
      const badgeTotal = document.getElementById('badge-total');
      if (badgeTotal) {
        badgeTotal.textContent = currentState.unreadCount || '';
      }
  
      const map = {
        'badge-entrada':   stats.ENTRADA || 0,
        'badge-actividad': stats.ACTIVIDAD || 0,
        'badge-salida':    stats.SALIDA || 0,
        'badge-valor':     stats.VALOR || 0
      };
      Object.entries(map).forEach(([id, count]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = count > 0 ? count : '';
      });
    }
  
    function initFilters() {
      // Sidebar
      document.querySelectorAll('.nav-item[data-filter]').forEach(item => {
        item.addEventListener('click', function() {
          const f = this.dataset.filter;
          if (['ALL','ENTRADA','ACTIVIDAD','SALIDA','VALOR',
               'UNREAD','READ','GRUPOS','MENSAJES',
               'CONFIG','PERFIL'].includes(f)) {
            window.state.setFilter(
              ['ALL','ENTRADA','ACTIVIDAD','SALIDA','VALOR',
               'UNREAD','READ'].includes(f) ? f : 'ALL'
            );
          }
        });
      });
  
      // Tabs header
      document.querySelectorAll('.feed-tab[data-filter]').forEach(tab => {
        tab.addEventListener('click', function() {
          window.state.setFilter(this.dataset.filter);
        });
      });
  
      // Suscribirse al estado
      state.subscribe(function(currentState) {
        updateSidebarActive(currentState.filter);
        updateTabActive(currentState.filter);
        updateBadges(currentState);
      });
  
      console.log('[Filters] ✓ Inicializado');
    }
  
    window.initFilters = initFilters;
  })();