(function() {
    'use strict';
  
    const WS_ENDPOINT    = '/ws-aura';
    const TOPIC          = '/topic/notifications';
    const HISTORY_URL    = '/api/v1/notifications/latest';
    const MAX_ATTEMPTS   = 5;
    const DELAYS         = [1000, 2000, 4000, 8000, 16000];
  
    let _client          = null;
    let _attempts        = 0;
    let _isConnecting    = false;
    let _manualDisconnect = false;
  
    function loadHistory() {
      fetch(HISTORY_URL)
        .then(r => { if (!r.ok) throw new Error('Error ' + r.status); return r.json(); })
        .then(data => { window.state.loadHistory(data); })
        .catch(err => console.error('[WS] Error historial:', err));
    }
  
    function updateIndicator(status) {
      const el = document.getElementById('connection-status');
      const txt = document.getElementById('connection-text');
      if (!el) return;
      el.classList.remove('connected', 'connecting', 'disconnected');
      el.classList.add(status);
      if (txt) {
        const labels = {
          connected:    'Conectado',
          connecting:   'Conectando...',
          disconnected: 'Desconectado'
        };
        txt.textContent = labels[status] || status;
      }
    }
  
    function showBanner(msg, isError) {
      const b = document.getElementById('reconnection-banner');
      if (!b) return;
      b.textContent = msg;
      b.classList.remove('hidden', 'error');
      if (isError) b.classList.add('error');
    }
  
    function hideBanner() {
      const b = document.getElementById('reconnection-banner');
      if (b) b.classList.add('hidden');
    }
  
    function handleMessage(message) {
      try {
        const notification = JSON.parse(message.body);
        window.state.addNotification(notification);
      } catch (e) {
        console.error('[WS] Error al parsear mensaje:', e);
      }
    }
  
    function onConnected() {
      console.log('[WS] ✅ Conectado');
      _attempts     = 0;
      _isConnecting = false;
      window.state.setConnectionStatus('connected');
      updateIndicator('connected');
      hideBanner();
      _client.subscribe(TOPIC, handleMessage);
      loadHistory();
    }
  
    function onDisconnected() {
      console.warn('[WS] ⚠ Desconectado');
      _isConnecting = false;
      window.state.setConnectionStatus('disconnected');
      updateIndicator('disconnected');
      if (!_manualDisconnect) attemptReconnect();
    }
  
    function attemptReconnect() {
      if (_attempts >= MAX_ATTEMPTS) {
        showBanner('No se pudo reconectar. Recargue la página.', true);
        return;
      }
      const delay = DELAYS[_attempts];
      _attempts++;
      console.log('[WS] 🔄 Reintento', _attempts + '/' + MAX_ATTEMPTS, 'en', delay + 'ms');
      showBanner('Reconectando... (intento ' + _attempts + '/' + MAX_ATTEMPTS + ')', false);
      setTimeout(() => { if (!_manualDisconnect) connectWebSocket(); }, delay);
    }
  
    function connectWebSocket() {
      if (_isConnecting || (_client && _client.connected)) return;
      _isConnecting     = true;
      _manualDisconnect = false;
      window.state.setConnectionStatus('connecting');
      updateIndicator('connecting');
      console.log('[WS] 🔌 Conectando...');
  
      try {
        _client = new StompJs.Client({
          webSocketFactory: function() { return new SockJS(WS_ENDPOINT); },
          reconnectDelay: 0,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          debug: function() {}
        });
        _client.onConnect         = onConnected;
        _client.onDisconnect      = onDisconnected;
        _client.onStompError      = function(f) {
          console.error('[WS] Error STOMP:', f.headers['message']);
          _isConnecting = false;
          onDisconnected();
        };
        _client.onWebSocketClose  = function() {
          console.warn('[WS] WebSocket cerrado');
          onDisconnected();
        };
        _client.onWebSocketError  = function(e) {
          console.error('[WS] Error WebSocket:', e);
          _isConnecting = false;
        };
        _client.activate();
      } catch (e) {
        console.error('[WS] Error al conectar:', e);
        _isConnecting = false;
        attemptReconnect();
      }
    }
  
    function disconnectWebSocket() {
      _manualDisconnect = true;
      if (_client) _client.deactivate();
    }
  
    window.connectWebSocket    = connectWebSocket;
    window.disconnectWebSocket = disconnectWebSocket;
  
  })();