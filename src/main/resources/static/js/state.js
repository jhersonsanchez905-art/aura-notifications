(function() {
    'use strict';
  
    const _state = {
      notifications: [],
      filter: 'ALL',
      connectionStatus: 'disconnected',
      unreadCount: 0
    };
  
    const _subscribers = [];
  
    function _recalculateUnread() {
      _state.unreadCount = _state.notifications.filter(n => !n.read).length;
    }
  
    function _emit() {
      _subscribers.forEach(callback => {
        try { callback(_state); }
        catch (error) { console.error('[State] Error en suscriptor:', error); }
      });
    }
  
    function addNotification(notification) {
      if (!notification || !notification.id) return;
      const exists = _state.notifications.some(n => n.id === notification.id);
      if (exists) return;
      _state.notifications.unshift(notification);
      if (_state.notifications.length > 100) {
        _state.notifications = _state.notifications.slice(0, 100);
      }
      _recalculateUnread();
      _emit();
      console.log('[State] ➕', notification.type, '-', notification.title);
    }
  
    function loadHistory(notifications) {
      if (!Array.isArray(notifications)) return;
      _state.notifications = [...notifications].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      _recalculateUnread();
      _emit();
      console.log('[State] 📥 Historial:', notifications.length, 'eventos');
    }
  
    function markAsRead(id) {
      const n = _state.notifications.find(n => n.id === id);
      if (!n || n.read) return;
      n.read = true;
      _recalculateUnread();
      _emit();
      fetch('/api/v1/notifications/' + id + '/read', { method: 'PUT' })
        .then(r => { if (!r.ok) throw new Error('Error servidor'); })
        .catch(err => {
          console.error('[State] Error markAsRead:', err);
          n.read = false;
          _recalculateUnread();
          _emit();
        });
    }
  
    function setFilter(filterValue) {
      const valid = ['ALL','ENTRADA','ACTIVIDAD','SALIDA','VALOR','UNREAD','READ'];
      if (!valid.includes(filterValue)) return;
      _state.filter = filterValue;
      _emit();
      console.log('[State] 🔍 Filtro:', filterValue);
    }
  
    function setConnectionStatus(status) {
      const valid = ['connected','connecting','disconnected'];
      if (!valid.includes(status)) return;
      _state.connectionStatus = status;
      _emit();
    }
  
    function getAll() { return [..._state.notifications]; }
  
    function getFiltered() {
      const f = _state.filter;
      if (f === 'ALL')    return [..._state.notifications];
      if (f === 'UNREAD') return _state.notifications.filter(n => !n.read);
      if (f === 'READ')   return _state.notifications.filter(n => n.read);
      return _state.notifications.filter(n => n.type === f);
    }
  
    function getStatsByType() {
      const stats = { ENTRADA:0, ACTIVIDAD:0, SALIDA:0, VALOR:0 };
      _state.notifications.forEach(n => {
        if (stats[n.type] !== undefined) stats[n.type]++;
      });
      return stats;
    }
  
    function subscribe(callback) {
      if (typeof callback !== 'function') return () => {};
      _subscribers.push(callback);
      callback(_state);
      return function() {
        const i = _subscribers.indexOf(callback);
        if (i > -1) _subscribers.splice(i, 1);
      };
    }
  
    function initState() {
      console.log('[State] ✓ Inicializado');
    }
  
    window.state = {
      addNotification,
      loadHistory,
      markAsRead,
      setFilter,
      setConnectionStatus,
      getAll,
      getFiltered,
      getStatsByType,
      subscribe
    };
  
    window.initState = initState;
  
  })();