(function() {
    'use strict';
  
    function formatTimestamp(iso) {
      const diff = Math.floor((new Date() - new Date(iso)) / 1000);
      if (diff < 10)  return 'ahora mismo';
      if (diff < 60)  return 'hace ' + diff + ' seg';
      if (diff < 3600) return 'hace ' + Math.floor(diff/60) + ' min';
      if (diff < 86400) return 'hace ' + Math.floor(diff/3600) + 'h';
      if (diff < 172800) return 'ayer';
      return 'hace ' + Math.floor(diff/86400) + ' días';
    }
  
    function groupByDate(notifications) {
      const today = new Date(); today.setHours(0,0,0,0);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
      const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate()-7);
      const groups = { 'HOY':[], 'AYER':[], 'ESTA SEMANA':[], 'ANTERIOR':[] };
      notifications.forEach(n => {
        const d = new Date(n.timestamp); d.setHours(0,0,0,0);
        if (d.getTime() === today.getTime())     groups['HOY'].push(n);
        else if (d.getTime() === yesterday.getTime()) groups['AYER'].push(n);
        else if (d >= weekAgo)                   groups['ESTA SEMANA'].push(n);
        else                                     groups['ANTERIOR'].push(n);
      });
      return groups;
    }
  
    function renderCard(n) {
      const readClass = n.read ? '' : 'unread';
      const dotBlue   = n.read ? '' : '<div class="notif-dot-blue"></div>';
      const readBtn   = n.read ? '' : `<button class="action-btn read" data-action="read" data-id="${n.id}" title="Marcar como leída">✓</button>`;
      return `
        <div class="notif-card ${readClass}" data-id="${n.id}">
          ${!n.read ? '<div class="unread-dot"></div>' : ''}
          <div class="notif-avatar" style="background:linear-gradient(135deg,#1d4ed8,#3b82f6)">
            🔔
          </div>
          <div class="notif-content">
            <div class="notif-title">${n.title}</div>
            <div class="notif-desc">${n.description}</div>
          </div>
          <div class="notif-meta">
            <span class="notif-time">${formatTimestamp(n.timestamp)}</span>
            ${dotBlue}
            <div class="notif-actions">
              ${readBtn}
              <button class="action-btn del" data-action="delete" data-id="${n.id}" title="Eliminar">🗑</button>
            </div>
          </div>
        </div>`;
    }
  
    function renderFeed(notifications) {
      const container = document.getElementById('notifications-container');
      if (!container) return;
      if (notifications.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay notificaciones para mostrar</div>';
        return;
      }
      const groups = groupByDate(notifications);
      let html = '';
      Object.entries(groups).forEach(([label, items]) => {
        if (!items.length) return;
        html += `<div class="date-label">${label}</div>`;
        items.forEach(n => { html += renderCard(n); });
      });
      container.innerHTML = html;
    }
  
    function prependCard(n) {
      const container = document.getElementById('notifications-container');
      if (!container) return;
      const empty = container.querySelector('.empty-state');
      if (empty) empty.remove();
      let todayHeader = container.querySelector('[data-group="HOY"]');
      if (!todayHeader) {
        todayHeader = document.createElement('div');
        todayHeader.className = 'date-label';
        todayHeader.setAttribute('data-group', 'HOY');
        todayHeader.textContent = 'HOY';
        container.insertBefore(todayHeader, container.firstChild);
      }
      const tmp = document.createElement('div');
      tmp.innerHTML = renderCard(n);
      todayHeader.insertAdjacentElement('afterend', tmp.firstElementChild);
    }
  
    function updateUnreadBadge(count) {
      const badge = document.getElementById('unread-badge');
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
    }
  
    function handleCardActions(e) {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.action === 'read') {
        const card = document.querySelector(`.notif-card[data-id="${id}"]`);
        if (card) {
          card.classList.add('marking-read');
          setTimeout(() => {
            card.classList.remove('unread','marking-read');
            const dot = card.querySelector('.unread-dot');
            const bdot = card.querySelector('.notif-dot-blue');
            if (dot) dot.remove();
            if (bdot) bdot.remove();
            btn.remove();
          }, 400);
        }
        window.state.markAsRead(id);
      }
      if (btn.dataset.action === 'delete') {
        const card = document.querySelector(`.notif-card[data-id="${id}"]`);
        if (card) {
          card.classList.add('deleting');
          setTimeout(() => card.remove(), 300);
        }
      }
    }
  
    let _firstRender = true;
    let _lastId = null;
  
    function initNotifications() {
      const container = document.getElementById('notifications-container');
      if (!container) return;
      container.addEventListener('click', handleCardActions);
  
      const loadMore = document.getElementById('load-more-btn');
      if (loadMore) {
        loadMore.addEventListener('click', function() {
          fetch('/api/v1/notifications')
            .then(r => r.json())
            .then(data => { data.forEach(n => window.state.addNotification(n)); })
            .catch(err => console.error('[Notifications] Error load more:', err));
        });
      }
  
      state.subscribe(function(currentState) {
        const filtered = state.getFiltered();
        if (_firstRender) {
          renderFeed(filtered);
          _firstRender = false;
          if (currentState.notifications.length > 0) {
            _lastId = currentState.notifications[0].id;
          }
        } else {
          const newest = currentState.notifications[0];
          if (newest && newest.id !== _lastId) {
            const f = currentState.filter;
            const show = f === 'ALL' || f === newest.type ||
                         (f === 'UNREAD' && !newest.read);
            if (show) prependCard(newest);
            _lastId = newest.id;
            if (typeof window.showToast === 'function') window.showToast(newest);
          } else {
            renderFeed(filtered);
          }
        }
        updateUnreadBadge(currentState.unreadCount);
      });
  
      console.log('[Notifications] ✓ Inicializado');
    }
  
    window.initNotifications = initNotifications;
  })();