(function() {
    'use strict';
  
    const REQUIRED_MODULES = [
      'initState',
      'initNotifications',
      'initFilters',
      'initToast',
      'initStats',
      'connectWebSocket'
    ];
  
    function showError(message) {
      console.error('[AURA]', message);
      const container = document.getElementById('notifications-container');
      if (container) {
        container.innerHTML = `
          <div style="padding:40px; text-align:center; color:#ef4444;">
            <h3>⚠ Error al iniciar</h3>
            <p style="margin-top:8px; color:#94a3b8;">${message}</p>
            <button onclick="location.reload()"
              style="margin-top:16px; padding:8px 20px; border:1px solid #ef4444;
              background:transparent; color:#ef4444; border-radius:6px; cursor:pointer;">
              Recargar
            </button>
          </div>
        `;
      }
    }
  
    function checkModules() {
      const missing = REQUIRED_MODULES.filter(m => typeof window[m] !== 'function');
      if (missing.length > 0) {
        showError('Módulos faltantes: ' + missing.join(', '));
        return false;
      }
      return true;
    }
  
    document.addEventListener('DOMContentLoaded', function() {
      console.log('[AURA] Iniciando v1.0.0...');
  
      if (!checkModules()) return;
  
      try {
        initState();
        initNotifications();
        initFilters();
        initToast();
        initStats();
        connectWebSocket();
        console.log('[AURA] ✅ Aplicación lista');
      } catch (error) {
        showError('Error al inicializar: ' + error.message);
      }
    });
  
    window.addEventListener('error', function(e) {
      console.error('[AURA] Error global:', e.error);
    });
  
    window.addEventListener('unhandledrejection', function(e) {
      console.error('[AURA] Promesa rechazada:', e.reason);
    });
  
  })();