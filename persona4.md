# 🎛️ GUÍA DETALLADA — PERSONA 4 (FEATURES / RENDER)

## Proyecto AURA — Días 2 y 3

---

## 🎯 TU ROL EN UNA FRASE

Eres el **constructor de la experiencia de usuario**. Tomas los datos que P3 pone en el estado y los conviertes en tarjetas, filtros, toasts y estadísticas que el usuario ve y toca. Si P3 es el cerebro, tú eres las manos.

---

## 📂 ARCHIVOS QUE CONTROLAS SOLO TÚ

Todo dentro de `src/main/resources/static/js/`:

| Archivo | Contenido |
| --- | --- |
| `notifications.js` | Renderiza el feed de tarjetas (el más importante) |
| `filters.js` | Filtros del sidebar + tabs del header |
| `toast.js` | Toast emergente de 4 segundos |
| `stats.js` | Panel derecho con contadores y barras |

**Regla clave:** Tú **lees** del estado (P3), **nunca escribes** directamente en él. Para cambiar el estado, usas los métodos públicos: `state.markAsRead()`, `state.setFilter()`.

---

## 🏗️ ARQUITECTURA QUE DEBES ENTENDER

```
state.js (P3)
    │
    │  state.subscribe(callback)
    │  → cada vez que algo cambia, tu callback se ejecuta
    ↓
┌─────────────────────────────────────────────────────────────┐
│                     TUS 4 ARCHIVOS                          │
│                                                             │
│  notifications.js   filters.js   toast.js    stats.js      │
│  (renderiza feed)  (gestiona    (notifica    (actualiza     │
│                    filtros)      usuario)     contadores)   │
└─────────────────────────────────────────────────────────────┘
    │                   │              │             │
    ↓                   ↓              ↓             ↓
  index.html        index.html     index.html    index.html
  #notifications-   .nav-item      #toast-       #stat-total
  container         .tab           container     #type-list
```

**Concepto clave:** Patrón **Command**. Cada acción del usuario (clic en filtro, clic en ✓) llama a un método del estado.

---

## 🔑 API DEL ESTADO QUE USAS (de P3)

Estos son los métodos de P3 que tú consumes. **No los modifiques, solo úsalos.**

```javascript
// LEER datos:
state.getAll()           // Array completo de notificaciones
state.getFiltered()      // Array filtrado según filtro activo
state.getStatsByType()   // { ENTRADA: 4, ACTIVIDAD: 3, SALIDA: 3, VALOR: 2 }

// ESCRIBIR (acciones del usuario):
state.markAsRead(id)     // Marcar una tarjeta como leída
state.setFilter(value)   // Cambiar filtro: 'ALL' | 'ENTRADA' | etc.

// SUSCRIBIRSE a cambios:
state.subscribe(function(currentState) {
  // Se ejecuta cada vez que algo cambia
  // currentState.notifications → array
  // currentState.filter → filtro activo
  // currentState.connectionStatus → estado WS
  // currentState.unreadCount → contador
})
```

---

## 📅 DÍA 2 — Los 4 módulos (8 horas)

---

### 🟢 HORA 1 — Sync inicial + funciones auxiliares

#### Primeros 15 minutos: Reunión del equipo

**Tu rol en la reunión:** confirmar con P3 la API del estado antes de escribir código.

Pregunta clave que debes hacer a P3:

> "¿`state.subscribe` se llama inmediatamente con el estado actual, o tengo que esperar al primer cambio?"

La respuesta debe ser: **"sí, se llama inmediatamente"** — eso significa que tus funciones de render se ejecutarán tan pronto como te suscribas.

#### Minutos 15-60: Funciones auxiliares compartidas

Antes de crear los 4 archivos, hay funciones que todos van a usar. Las pondrás al inicio de `notifications.js` porque es tu archivo principal.

**Funciones de utilidad que necesitas:**

```javascript
/**
 * Convierte un timestamp ISO a texto relativo
 * Ej: "hace 3 segundos", "hace 2 min", "hace 1 hora"
 */
function formatTimestamp(isoString) {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return 'ahora mismo';
  if (diffSec < 60) return `hace ${diffSec} seg`;
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHour < 24) return `hace ${diffHour}h`;
  if (diffDay === 1) return 'ayer';
  return `hace ${diffDay} días`;
}

/**
 * Devuelve el ícono emoji según el tipo de evento
 */
function getTypeIcon(type) {
  const icons = {
    ENTRADA: '📥',
    ACTIVIDAD: '⚡',
    SALIDA: '📤',
    VALOR: '💎'
  };
  return icons[type] || '🔔';
}

/**
 * Agrupa notificaciones por fecha (HOY, AYER, ESTA SEMANA)
 */
function groupByDate(notifications) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = {
    'HOY': [],
    'AYER': [],
    'ESTA SEMANA': [],
    'ANTERIOR': []
  };

  notifications.forEach(n => {
    const date = new Date(n.timestamp);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
      groups['HOY'].push(n);
    } else if (date.getTime() === yesterday.getTime()) {
      groups['AYER'].push(n);
    } else if (date >= weekAgo) {
      groups['ESTA SEMANA'].push(n);
    } else {
      groups['ANTERIOR'].push(n);
    }
  });

  return groups;
}
```

**Commit parcial:**

```bash
git add .
git commit -m "feat(p4): funciones auxiliares de formato y agrupacion"
git push origin feature/websocket-notifications
```

---

### 🟢 HORA 2 — Crear `notifications.js` (el más importante)

Crea `src/main/resources/static/js/notifications.js`:

```javascript
/**
 * notifications.js — Renderizado del feed de notificaciones
 * Lee del estado (P3) y renderiza tarjetas en el DOM
 */
(function() {
  'use strict';

  // ============================================
  // FUNCIONES AUXILIARES
  // ============================================

  function formatTimestamp(isoString) {
    const now = new Date();
    const date = new Date(isoString);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 10) return 'ahora mismo';
    if (diffSec < 60) return `hace ${diffSec} seg`;
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffHour < 24) return `hace ${diffHour}h`;
    if (diffDay === 1) return 'ayer';
    return `hace ${diffDay} días`;
  }

  function getTypeIcon(type) {
    const icons = {
      ENTRADA: '📥',
      ACTIVIDAD: '⚡',
      SALIDA: '📤',
      VALOR: '💎'
    };
    return icons[type] || '🔔';
  }

  function groupByDate(notifications) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups = { 'HOY': [], 'AYER': [], 'ESTA SEMANA': [], 'ANTERIOR': [] };

    notifications.forEach(n => {
      const date = new Date(n.timestamp);
      date.setHours(0, 0, 0, 0);
      const t = date.getTime();

      if (t === today.getTime())         groups['HOY'].push(n);
      else if (t === yesterday.getTime()) groups['AYER'].push(n);
      else if (date >= weekAgo)           groups['ESTA SEMANA'].push(n);
      else                                groups['ANTERIOR'].push(n);
    });

    return groups;
  }

  // ============================================
  // RENDERIZADO DE UNA TARJETA
  // ============================================

  /**
   * Genera el HTML de una tarjeta de notificación
   * Usa las clases CSS que P2 definió en notifications.css
   */
  function renderCard(notification) {
    const typeClass = notification.type.toLowerCase();
    const priorityClass = (notification.priority || 'LOW').toLowerCase();
    const readClass = notification.read ? '' : 'unread';
    const icon = getTypeIcon(notification.type);
    const timeText = formatTimestamp(notification.timestamp);

    return `
      <div class="notification-card ${readClass}"
           data-id="${notification.id}"
           data-type="${notification.type}">

        <div class="notification-icon ${typeClass}">
          ${icon}
        </div>

        <div class="notification-content">
          <div class="notification-header">
            <span class="notification-type ${typeClass}">
              ${notification.type}
            </span>
            <span class="notification-process">
              ${notification.processId || ''} · Etapa ${notification.stage || '?'}
            </span>
          </div>

          <p class="notification-title">${notification.title}</p>
          <p class="notification-description">${notification.description}</p>

          <div class="notification-actions">
            ${!notification.read ? `
              <button class="action-btn read"
                      title="Marcar como leída"
                      data-action="read"
                      data-id="${notification.id}">✓</button>
            ` : ''}
            <button class="action-btn delete"
                    title="Eliminar"
                    data-action="delete"
                    data-id="${notification.id}">🗑</button>
          </div>
        </div>

        <div class="notification-meta">
          <span class="notification-time">${timeText}</span>
          <span class="priority-badge ${priorityClass}">
            ${notification.priority || 'LOW'}
          </span>
        </div>

      </div>
    `;
  }

  // ============================================
  // RENDERIZADO DEL FEED COMPLETO
  // ============================================

  /**
   * Renderiza todas las notificaciones agrupadas por fecha
   */
  function renderFeed(notifications) {
    const container = document.getElementById('notifications-container');
    if (!container) return;

    if (notifications.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p style="color: var(--text-sub); text-align: center; padding: 40px;">
            No hay notificaciones para mostrar
          </p>
        </div>
      `;
      return;
    }

    const groups = groupByDate(notifications);
    let html = '';

    Object.entries(groups).forEach(([label, items]) => {
      if (items.length === 0) return;

      html += `<div class="date-group-header">${label}</div>`;
      items.forEach(n => {
        html += renderCard(n);
      });
    });

    container.innerHTML = html;

    // Actualizar timestamps cada 30 segundos
    startTimestampUpdater();
  }

  // ============================================
  // AGREGAR UNA TARJETA NUEVA (animada)
  // ============================================

  /**
   * Agrega una sola tarjeta nueva al inicio del feed
   * con animación de entrada. Llamado al llegar evento en tiempo real.
   */
  function prependCard(notification) {
    const container = document.getElementById('notifications-container');
    if (!container) return;

    // Limpiar "empty state" si existía
    const empty = container.querySelector('.empty-state');
    if (empty) empty.remove();

    // Crear o encontrar el grupo HOY
    let todayGroup = container.querySelector('[data-group="HOY"]');
    if (!todayGroup) {
      // Insertar encabezado HOY al principio
      const header = document.createElement('div');
      header.className = 'date-group-header';
      header.setAttribute('data-group', 'HOY');
      header.textContent = 'HOY';
      container.insertBefore(header, container.firstChild);
      todayGroup = header;
    }

    // Crear la tarjeta
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderCard(notification);
    const card = tempDiv.firstElementChild;

    // Insertar después del encabezado HOY
    todayGroup.insertAdjacentElement('afterend', card);

    console.log('[Notifications] ➕ Tarjeta añadida:', notification.type);
  }

  // ============================================
  // ACTUALIZAR TIMESTAMPS PERIÓDICAMENTE
  // ============================================

  let _timestampInterval = null;

  function startTimestampUpdater() {
    if (_timestampInterval) clearInterval(_timestampInterval);

    _timestampInterval = setInterval(() => {
      document.querySelectorAll('.notification-time').forEach(el => {
        const card = el.closest('.notification-card');
        if (!card) return;
        const id = card.dataset.id;
        const notification = state.getAll().find(n => n.id === id);
        if (notification) {
          el.textContent = formatTimestamp(notification.timestamp);
        }
      });
    }, 30000); // Cada 30 segundos
  }

  // ============================================
  // MANEJADORES DE EVENTOS DEL DOM
  // ============================================

  /**
   * Delegar eventos de los botones de acción
   * (clic en ✓ o en 🗑)
   */
  function handleCardActions(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === 'read') {
      handleMarkAsRead(id);
    } else if (action === 'delete') {
      handleDelete(id);
    }
  }

  /**
   * Marca una notificación como leída con animación
   */
  function handleMarkAsRead(id) {
    const card = document.querySelector(`.notification-card[data-id="${id}"]`);
    if (!card) return;

    // Animación de marcar leída (clase de P2)
    card.classList.add('marking-read');

    setTimeout(() => {
      card.classList.remove('unread', 'marking-read');
      card.classList.add('read');

      // Quitar el botón ✓
      const readBtn = card.querySelector('[data-action="read"]');
      if (readBtn) readBtn.remove();

      // Actualizar en el estado (P3 hace el PUT al backend)
      state.markAsRead(id);

      console.log('[Notifications] ✓ Marcada como leída:', id);
    }, 400);
  }

  /**
   * Elimina una tarjeta del DOM (solo visual, no del backend en MVP)
   */
  function handleDelete(id) {
    const card = document.querySelector(`.notification-card[data-id="${id}"]`);
    if (!card) return;

    card.classList.add('deleting');
    setTimeout(() => {
      card.remove();
      console.log('[Notifications] 🗑 Tarjeta eliminada del DOM:', id);
    }, 300);
  }

  // ============================================
  // VARIABLE PARA SABER SI ES EL PRIMER RENDER
  // ============================================

  let _isFirstRender = true;
  let _lastNotificationId = null;

  // ============================================
  // SUSCRIPCIÓN AL ESTADO (corazón del módulo)
  // ============================================

  function initNotifications() {
    const container = document.getElementById('notifications-container');
    if (!container) {
      console.error('[Notifications] No se encontró #notifications-container');
      return;
    }

    // Delegar eventos en el contenedor
    container.addEventListener('click', handleCardActions);

    // Suscribirse al estado global
    state.subscribe(function(currentState) {
      const filtered = state.getFiltered();

      if (_isFirstRender) {
        // Primera vez: render completo del feed
        renderFeed(filtered);
        _isFirstRender = false;

        if (filtered.length > 0) {
          _lastNotificationId = filtered[0].id;
        }

        console.log('[Notifications] 🎨 Render inicial:', filtered.length, 'tarjetas');

      } else {
        // Actualizaciones posteriores
        const newest = currentState.notifications[0];

        if (newest && newest.id !== _lastNotificationId) {
          // Llegó una nueva — animar solo si es ALL o su tipo coincide con el filtro
          const filter = currentState.filter;
          const show = filter === 'ALL' ||
                       filter === newest.type ||
                       (filter === 'UNREAD' && !newest.read);

          if (show) {
            prependCard(newest);
          }

          _lastNotificationId = newest.id;

          // Notificar al toast (P4 lo maneja)
          if (typeof window.showToast === 'function') {
            window.showToast(newest);
          }

        } else {
          // Cambio de filtro o marcar como leída → re-render completo
          renderFeed(filtered);
        }
      }

      // Actualizar badge en el header
      updateUnreadBadge(currentState.unreadCount);
    });

    console.log('[Notifications] ✓ Módulo inicializado');
  }

  /**
   * Actualiza el badge de no leídas en el header (campana)
   */
  function updateUnreadBadge(count) {
    const badge = document.getElementById('unread-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  // ============================================
  // EXPONER FUNCIÓN PÚBLICA
  // ============================================
  window.initNotifications = initNotifications;

})();
```

**Commit:**

```bash
git add js/notifications.js
git commit -m "feat(p4): notifications.js con renderizado de feed y acciones de tarjeta"
git push origin feature/websocket-notifications
```

📢 **Avisa a P3:** "notifications.js listo, ya me suscribo al estado. Asegúrate de que `state.subscribe` funcione."

---

### 🟢 HORA 3 — Crear `filters.js`

Crea `src/main/resources/static/js/filters.js`:

```javascript
/**
 * filters.js — Gestión de filtros del sidebar y tabs del header
 * Patrón: Command — cada clic llama a state.setFilter()
 */
(function() {
  'use strict';

  // ============================================
  // ACTUALIZAR UI DE FILTROS
  // ============================================

  /**
   * Resalta visualmente el filtro activo en el sidebar
   */
  function updateSidebarActive(filterValue) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });

    const activeItem = document.querySelector(
      `.nav-item[data-filter="${filterValue}"]`
    );
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }

  /**
   * Resalta visualmente el tab activo en el header
   */
  function updateTabActive(filterValue) {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });

    const activeTab = document.querySelector(
      `.tab[data-filter="${filterValue}"]`
    );
    if (activeTab) {
      activeTab.classList.add('active');
    }
  }

  /**
   * Actualiza los badges numéricos del sidebar
   */
  function updateSidebarBadges(currentState) {
    const stats = state.getStatsByType();
    const total = currentState.notifications.length;
    const unread = currentState.unreadCount;

    // Badge total
    const badgeTotal = document.getElementById('badge-total');
    if (badgeTotal) badgeTotal.textContent = unread || '';

    // Badges por tipo
    const typeBadges = {
      'badge-entrada':   stats.ENTRADA || 0,
      'badge-actividad': stats.ACTIVIDAD || 0,
      'badge-salida':    stats.SALIDA || 0,
      'badge-valor':     stats.VALOR || 0
    };

    Object.entries(typeBadges).forEach(([id, count]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = count || '';
    });
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  /**
   * Registra clicks en los items del sidebar
   */
  function bindSidebarFilters() {
    document.querySelectorAll('.nav-item[data-filter]').forEach(item => {
      item.addEventListener('click', function() {
        const filterValue = this.dataset.filter;
        state.setFilter(filterValue);
        console.log('[Filters] Sidebar → filtro:', filterValue);
      });
    });
  }

  /**
   * Registra clicks en los tabs del header
   */
  function bindHeaderTabs() {
    document.querySelectorAll('.tab[data-filter]').forEach(tab => {
      tab.addEventListener('click', function() {
        const filterValue = this.dataset.filter;
        state.setFilter(filterValue);
        console.log('[Filters] Tab → filtro:', filterValue);
      });
    });
  }

  // ============================================
  // SUSCRIPCIÓN AL ESTADO
  // ============================================

  function initFilters() {
    // Registrar event listeners
    bindSidebarFilters();
    bindHeaderTabs();

    // Suscribirse para mantener la UI sincronizada
    state.subscribe(function(currentState) {
      const filter = currentState.filter;

      // Sincronizar sidebar y tabs con el filtro actual
      updateSidebarActive(filter);
      updateTabActive(filter);

      // Actualizar badges con conteos reales
      updateSidebarBadges(currentState);
    });

    console.log('[Filters] ✓ Módulo inicializado');
  }

  // ============================================
  // EXPONER FUNCIÓN PÚBLICA
  // ============================================
  window.initFilters = initFilters;

})();
```

**Commit:**

```bash
git add js/filters.js
git commit -m "feat(p4): filters.js con sidebar y tabs sincronizados al estado"
git push origin feature/websocket-notifications
```

---

### 🟢 HORA 4 — PRIMER CHECKPOINT

🚨 **Punto de validación antes de seguir.**

Abre `http://localhost:8080` y verifica en consola (F12):

```
[State] ✓ Estado inicializado
[Notifications] ✓ Módulo inicializado
[Filters] ✓ Módulo inicializado
[WS] ✅ Conectado al servidor
[State] 📥 Historial cargado: X eventos
[Notifications] 🎨 Render inicial: X tarjetas
```

**Pruebas rápidas que debes hacer:**

| Acción | Qué debe pasar |
| --- | --- |
| Carga la página | Aparecen tarjetas con historial |
| Esperar 3-8 segundos | Aparece una tarjeta nueva animada |
| Clic en "Entrada" en el sidebar | Solo se muestran tarjetas ENTRADA |
| Clic en "Todos" | Vuelven todas |
| Clic en "No leídos" en los tabs | Solo las no leídas |
| Clic en ✓ de una tarjeta | La tarjeta cambia a leída (gris) |

**Si algo falla:**

| Problema | Causa probable |
| --- | --- |
| No aparecen tarjetas | P3 no está llamando a state o no está conectado |
| Filtros no funcionan | Verifica los `data-filter` en el HTML de P1 |
| Clic en ✓ no hace nada | Revisa que el botón tiene `data-action="read"` y `data-id` |
| Las clases CSS no se aplican | Habla con P2 para confirmar los nombres de clase |

**Commit de verificación:**

```bash
git add .
git commit -m "feat(p4): checkpoint - feed y filtros funcionando"
git push origin feature/websocket-notifications
```

---

### 🟡 HORA 5 — Crear `toast.js`

Crea `src/main/resources/static/js/toast.js`:

```javascript
/**
 * toast.js — Notificación emergente al llegar un evento
 * Aparece 4 segundos y desaparece con animación
 */
(function() {
  'use strict';

  // ============================================
  // CONFIGURACIÓN
  // ============================================
  const TOAST_DURATION = 4000;  // 4 segundos
  const TOAST_FADE_OUT = 300;   // 0.3 segundos de animación de salida
  const MAX_TOASTS = 3;         // Máximo 3 toasts simultáneos

  // ============================================
  // FUNCIONES AUXILIARES
  // ============================================

  function getTypeIcon(type) {
    const icons = {
      ENTRADA: '📥',
      ACTIVIDAD: '⚡',
      SALIDA: '📤',
      VALOR: '💎'
    };
    return icons[type] || '🔔';
  }

  function getPriorityLabel(priority) {
    const labels = {
      HIGH: '🔴 Alta',
      MEDIUM: '🟡 Media',
      LOW: '🟢 Baja'
    };
    return labels[priority] || priority;
  }

  // ============================================
  // MOSTRAR UN TOAST
  // ============================================

  /**
   * Muestra un toast para la notificación recibida
   * Llamado desde notifications.js cuando llega evento nuevo
   */
  function showToast(notification) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Limitar cantidad de toasts simultáneos
    const existing = container.querySelectorAll('.toast');
    if (existing.length >= MAX_TOASTS) {
      // Eliminar el más viejo
      const oldest = existing[0];
      removeToast(oldest);
    }

    const typeClass = notification.type.toLowerCase();
    const icon = getTypeIcon(notification.type);

    // Crear elemento del toast
    const toast = document.createElement('div');
    toast.className = `toast ${typeClass}`;
    toast.innerHTML = `
      <div class="toast-icon ${typeClass}">
        ${icon}
      </div>
      <div class="toast-content">
        <p class="toast-title">${notification.title}</p>
        <p class="toast-meta">
          ${notification.type} · ${notification.processId || ''} · ${getPriorityLabel(notification.priority)}
        </p>
      </div>
    `;

    // Agregar al container
    container.appendChild(toast);
    console.log('[Toast] 🔔 Mostrando toast:', notification.type);

    // Auto-eliminar después de TOAST_DURATION ms
    const timeout = setTimeout(() => {
      removeToast(toast);
    }, TOAST_DURATION);

    // Click para cerrar manualmente
    toast.addEventListener('click', () => {
      clearTimeout(timeout);
      removeToast(toast);
    });
  }

  /**
   * Elimina un toast con animación fade-out
   */
  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;

    toast.classList.add('fade-out');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, TOAST_FADE_OUT);
  }

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  function initToast() {
    // Verificar que existe el container (lo puso P1 en index.html)
    const container = document.getElementById('toast-container');
    if (!container) {
      console.error('[Toast] No se encontró #toast-container');
      return;
    }
    console.log('[Toast] ✓ Módulo inicializado');
  }

  // ============================================
  // EXPONER FUNCIONES PÚBLICAS
  // ============================================
  window.initToast = initToast;
  window.showToast = showToast; // notifications.js llama a esto

})();
```

**Commit:**

```bash
git add js/toast.js
git commit -m "feat(p4): toast.js con emergente de 4 segundos y animacion"
git push origin feature/websocket-notifications
```

**Prueba rápida:** Espera a que llegue un evento. Debe aparecer un recuadro en la esquina inferior derecha durante 4 segundos. Si no aparece, revisa que `#toast-container` existe en el HTML de P1.

---

### 🟡 HORA 6 — Crear `stats.js`

Crea `src/main/resources/static/js/stats.js`:

```javascript
/**
 * stats.js — Panel derecho de estadísticas
 * Actualiza contadores y barras de progreso en tiempo real
 */
(function() {
  'use strict';

  // ============================================
  // ACTUALIZAR TARJETAS DE RESUMEN GENERAL
  // ============================================

  function updateSummaryCards(currentState) {
    const notifications = currentState.notifications;
    const total = notifications.length;
    const unread = currentState.unreadCount;
    const read = total - unread;

    const statTotal  = document.getElementById('stat-total');
    const statUnread = document.getElementById('stat-unread');
    const statRead   = document.getElementById('stat-read');

    if (statTotal)  statTotal.textContent  = total;
    if (statUnread) statUnread.textContent = unread;
    if (statRead)   statRead.textContent   = read;
  }

  // ============================================
  // ACTUALIZAR BARRAS POR TIPO
  // ============================================

  function updateTypeBars(currentState) {
    const stats = state.getStatsByType();
    const total = currentState.notifications.length;

    if (total === 0) return;

    const types = ['ENTRADA', 'ACTIVIDAD', 'SALIDA', 'VALOR'];

    types.forEach(type => {
      const count = stats[type] || 0;
      const percentage = Math.round((count / total) * 100);

      // Actualizar la barra
      const listItem = document.querySelector(
        `.type-list li[data-type="${type}"]`
      );
      if (!listItem) return;

      const barFill = listItem.querySelector('.bar-fill');
      const countEl = listItem.querySelector('.type-count');

      if (barFill) barFill.style.width = `${percentage}%`;
      if (countEl) countEl.textContent = count;
    });
  }

  // ============================================
  // ACTUALIZAR SECCIÓN DESTACADAS
  // ============================================

  /**
   * Muestra las últimas 3 notificaciones de alta prioridad
   */
  function updateFeatured(currentState) {
    const featured = currentState.notifications
      .filter(n => n.priority === 'HIGH' && !n.read)
      .slice(0, 3);

    // Si no hay sección destacadas en el HTML, crearla
    let section = document.querySelector('.featured-section');
    if (!section) {
      const statsPanel = document.querySelector('.stats-panel');
      if (!statsPanel) return;

      const newSection = document.createElement('section');
      newSection.className = 'stats-section';
      newSection.innerHTML = `
        <h3>DESTACADAS</h3>
        <div class="featured-section"></div>
      `;
      statsPanel.appendChild(newSection);
      section = newSection.querySelector('.featured-section');
    }

    if (featured.length === 0) {
      section.innerHTML = `
        <p style="font-size:11px; color:var(--text-sub); padding: 8px 0;">
          Sin alertas de alta prioridad
        </p>
      `;
      return;
    }

    function getTypeIcon(type) {
      const icons = { ENTRADA: '📥', ACTIVIDAD: '⚡', SALIDA: '📤', VALOR: '💎' };
      return icons[type] || '🔔';
    }

    section.innerHTML = featured.map(n => `
      <div class="featured-item">
        <div class="featured-icon">
          ${getTypeIcon(n.type)}
        </div>
        <div class="featured-content">
          <p class="featured-title">${n.title}</p>
          <p class="featured-desc">${n.processId || ''}</p>
        </div>
        <span class="featured-badge important">Alta</span>
      </div>
    `).join('');
  }

  // ============================================
  // SUSCRIPCIÓN AL ESTADO
  // ============================================

  function initStats() {
    // Verificar que el panel existe
    const panel = document.querySelector('.stats-panel');
    if (!panel) {
      console.error('[Stats] No se encontró .stats-panel');
      return;
    }

    // Suscribirse al estado
    state.subscribe(function(currentState) {
      updateSummaryCards(currentState);
      updateTypeBars(currentState);
      updateFeatured(currentState);
    });

    console.log('[Stats] ✓ Módulo inicializado');
  }

  // ============================================
  // EXPONER FUNCIÓN PÚBLICA
  // ============================================
  window.initStats = initStats;

})();
```

**Commit:**

```bash
git add js/stats.js
git commit -m "feat(p4): stats.js con contadores, barras y destacadas en tiempo real"
git push origin feature/websocket-notifications
```

---

### 🟡 HORA 7 — Agrupación HOY/AYER + timestamp relativo

A esta hora el feed ya funciona. Ahora mejora la agrupación verificando que se vea correcta en el navegador.

**Prueba de agrupación:**

1. Abre MongoDB Compass → base de datos `aura` → colección `notifications`
2. Busca documentos con `timestamp` de ayer (para probar el grupo "AYER")
3. Si todos son de hoy, espera unos minutos o modifica manualmente en Compass la fecha de un documento

**Si necesitas crear un documento de prueba con fecha de ayer en Compass:**

```json
{
  "type": "SALIDA",
  "title": "Prueba de ayer",
  "description": "Verificando agrupación de fecha",
  "timestamp": "2026-05-11T10:00:00Z",
  "read": false,
  "priority": "LOW",
  "processId": "PROC-TEST",
  "stage": 3
}
```

**Verifica que los timestamps relativos se actualizan:** espera 30 segundos y confirma que "hace 5 seg" cambia a "hace 35 seg" (el interval en `notifications.js` lo maneja).

**Commit:**

```bash
git add .
git commit -m "feat(p4): verificada agrupacion HOY/AYER/ESTA SEMANA + timestamps"
git push origin feature/websocket-notifications
```

---

### 🟡 HORA 8 — Cierre del Día 2

**Reunión final con el equipo (15 min)**

Reporta tu estado:
- ✅ `notifications.js` — feed renderizando con agrupación
- ✅ `filters.js` — sidebar y tabs funcionando
- ✅ `toast.js` — emergente de 4 segundos
- ✅ `stats.js` — contadores actualizados en tiempo real

**Lista de pruebas rápidas finales antes de cerrar:**

| Prueba | Resultado |
| --- | --- |
| ¿Las tarjetas aparecen agrupadas por HOY/AYER? | ☐ |
| ¿El toast aparece al llegar evento y desaparece en 4s? | ☐ |
| ¿Los filtros del sidebar muestran el tipo correcto? | ☐ |
| ¿Los badges del sidebar se actualizan? | ☐ |
| ¿Los números del panel derecho (Total/No leídas/Leídas) son correctos? | ☐ |
| ¿Las barras de progreso se mueven al llegar eventos? | ☐ |
| ¿Clic en ✓ cambia la tarjeta a leída? | ☐ |
| ¿El badge de la campana muestra el conteo correcto? | ☐ |

**Commit final del día:**

```bash
git add .
git commit -m "chore(p4): cierre del dia 2 con los 4 modulos operativos"
git push origin feature/websocket-notifications
```

---

## 📅 DÍA 3 — Pulido + Pruebas (8 horas)

---

### 🟢 HORA 1 — Stand-up + pull

Después del stand-up con P1, sincroniza:

```bash
git pull origin feature/websocket-notifications
```

Verifica que todo sigue funcionando al abrir el dashboard.

---

### 🟢 HORA 2 — Badge de campana + contador de no leídas

El badge de la campana en el header debe mostrar siempre el número correcto. Verifica que `updateUnreadBadge` en `notifications.js` funciona bien con estos casos:

```javascript
// Test en consola:

// 1. Ver conteo actual
console.log('No leídas:', state.getAll().filter(n => !n.read).length);

// 2. Marcar todas como leídas
state.getAll().filter(n => !n.read).forEach(n => state.markAsRead(n.id));

// 3. Badge debe ser 0 y desaparecer
```

**Posible mejora:** Si el badge del header muestra `0` en lugar de ocultarse, revisa en `notifications.js`:

```javascript
function updateUnreadBadge(count) {
  const badge = document.getElementById('unread-badge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none'; // ← esto oculta si es 0
  }
}
```

**Commit:**

```bash
git add js/notifications.js
git commit -m "fix(p4): badge de campana se oculta cuando no hay no leidas"
git push origin feature/websocket-notifications
```

---

### 🟢 HORA 3 — Botón "Cargar más notificaciones"

El botón ya existe en el HTML de P1 (`#load-more-btn`). Ahora dale funcionalidad. Agrega esto en `notifications.js`, dentro de `initNotifications()`, justo después del `container.addEventListener`:

```javascript
// Botón "Cargar más"
const loadMoreBtn = document.getElementById('load-more-btn');
if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', function() {
    // Llama a la API para más notificaciones
    fetch('/api/v1/notifications?page=1')
      .then(r => r.json())
      .then(data => {
        if (data.length === 0) {
          loadMoreBtn.textContent = 'No hay más notificaciones';
          loadMoreBtn.disabled = true;
          return;
        }
        // Agregar al estado sin duplicar
        data.forEach(n => state.addNotification(n));
      })
      .catch(err => {
        console.error('[Notifications] Error al cargar más:', err);
      });
  });
}
```

> **Nota:** El backend no tiene paginación en el MVP. Cuando el usuario haga clic, puede que devuelva las mismas. La validación de duplicados de P3 se encarga de que no aparezcan dos veces. Si el endpoint devuelve error o array vacío, el botón se deshabilita.

**Commit:**

```bash
git add js/notifications.js
git commit -m "feat(p4): boton cargar mas con llamada al backend"
git push origin feature/websocket-notifications
```

---

### 🟢 HORA 4 — Testing grupal con checklist

P1 convoca al equipo. Tu lista de pruebas específicas:

**Las que TÚ debes pasar:**

- [ ] Feed muestra tarjetas agrupadas HOY/AYER/ESTA SEMANA
- [ ] Toast aparece exactamente 4 segundos al llegar evento
- [ ] Toast tiene el color correcto según el tipo (azul/amarillo/verde/morado)
- [ ] Click en ✓ anima la tarjeta y la marca como leída
- [ ] Click en 🗑 elimina la tarjeta del DOM con animación
- [ ] Clic en "Entrada" sidebar → solo tarjetas ENTRADA visibles
- [ ] Clic en "No leídos" tab → solo no leídas
- [ ] Badges del sidebar se actualizan al llegar eventos
- [ ] Panel derecho: Total / No leídas / Leídas son correctos
- [ ] Barras de progreso se ajustan a los porcentajes reales
- [ ] Sección "Destacadas" muestra solo las de prioridad HIGH sin leer

---

### 🟡 HORA 5 — Bug fixing

Los bugs más comunes de tus módulos y cómo resolverlos:

**Bug 1: Toast no aparece**
- Verifica que `window.showToast` esté expuesto en `toast.js`
- Verifica que `notifications.js` llama a `window.showToast(newest)` al llegar evento nuevo
- Verifica que `#toast-container` existe en el HTML de P1

**Bug 2: Filtros no cambian el feed**
- Verifica que el `data-filter` en los botones del HTML coincide con los valores del estado (`ALL`, `ENTRADA`, `ACTIVIDAD`, `SALIDA`, `VALOR`, `UNREAD`, `READ`)
- Verifica que al cambiar el filtro, `state.subscribe` re-ejecuta y llama a `renderFeed(filtered)`

**Bug 3: Marcar como leída no persiste al recargar**
- Esto es correcto en el MVP — el estado es en memoria
- El backend lo guarda, pero al recargar se hace `loadHistory` y trae el estado desde MongoDB
- Si MongoDB tiene `read: true`, al recargar la tarjeta debe aparecer ya leída

**Bug 4: Las barras de progreso no se mueven**
- Verifica que los `li` en el HTML tienen `data-type="ENTRADA"` (mayúsculas)
- Verifica que `getStatsByType()` devuelve los datos correctos: `console.log(state.getStatsByType())`

**Bug 5: Aparecen tarjetas duplicadas**
- Esto es responsabilidad de P3 (validación por ID en `state.js`)
- Si ves duplicados, reporta a P3 con el ID duplicado
- Verificación: `state.getAll().map(n => n.id)` no debe tener repetidos

---

### 🟡 HORA 6 — Pulido de UX

Con los bugs resueltos, mejora pequeños detalles:

**Mejora 1 — Feedback visual al marcar como leída**

Asegúrate de que el botón ✓ desaparece visualmente y la tarjeta queda en estado leído (sin borde azul). La animación `marking-read` la maneja P2 en CSS.

**Mejora 2 — Toast con clic para ir a la tarjeta**

Actualiza el listener del toast en `toast.js`:

```javascript
toast.addEventListener('click', () => {
  clearTimeout(timeout);
  removeToast(toast);
  // Scroll a la tarjeta correspondiente
  const card = document.querySelector(
    `.notification-card[data-id="${notification.id}"]`
  );
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.style.outline = '2px solid var(--entrada)';
    setTimeout(() => card.style.outline = '', 2000);
  }
});
```

**Mejora 3 — Indicador visual en filtro activo**

Verifica que cuando un tipo tiene `0` eventos, el badge del sidebar no muestra `0` sino que queda vacío:

```javascript
if (countEl) countEl.textContent = count > 0 ? count : '';
```

**Commit:**

```bash
git add .
git commit -m "style(p4): mejoras de UX - toast clickeable, badges sin cero"
git push origin feature/websocket-notifications
```

---

### 🟡 HORA 7 — Apoyo al merge

P1 está mergeando. Tu trabajo:

- **NO hagas commits** durante esta hora
- Si P1 reporta conflictos en tus archivos, resuélvelos rápido
- Mantente disponible para preguntas

---

### 🟡 HORA 8 — DEMO FINAL 🎓

#### Tu rol en la demo (5-7 minutos)

Cuando P1 te pase la palabra para la demo en vivo, tú operas la aplicación.

**Guion de acciones que debes ejecutar:**

1. **Mostrar el historial cargado** al abrir el dashboard
2. **Esperar un evento en vivo** → señalar el toast y la tarjeta que aparece
3. **Filtrar por tipo** — clic en "Entrada" → "Actividad" → "Todos"
4. **Marcar como leída** — clic en ✓ de una tarjeta, mostrar que cambia de color
5. **Mostrar las stats** — señalar cómo los números y barras cambian en vivo
6. **Mostrar la demo multi-cliente** — P1 abre segunda pestaña, ambas reciben el mismo evento

**Explicación técnica de tu parte (2 min):**

> "El renderizado está completamente desacoplado de los datos. Implementamos el **patrón Observer**: me suscribo al estado global y cada vez que llega un evento, mis funciones se vuelven a ejecutar automáticamente.
>
> Las tarjetas se agrupan por fecha — hoy, ayer, esta semana — y los timestamps se actualizan cada 30 segundos.
>
> Implementé el **patrón Command** para las acciones del usuario: cada clic en un filtro o en marcar como leída ejecuta un comando en el estado, y ese cambio se propaga a todos los componentes suscritos automáticamente."

**Si te preguntan:**

| Pregunta | Respuesta |
| --- | --- |
| ¿Por qué el estado se comparte entre módulos? | "Evita que cada módulo tenga su propia copia de los datos. Una sola fuente de verdad, todos leen de ahí." |
| ¿Qué pasa si el toast llega demasiado rápido? | "Limitamos a 3 toasts simultáneos. Si llegan más, el más viejo se elimina automáticamente." |
| ¿Por qué el delete no borra del backend? | "En el MVP priorizamos la demo. El delete del backend se agrega en la versión 1.1." |
| ¿Cómo funcionan los filtros? | "Cada clic llama a `state.setFilter()`. El estado notifica a todos los suscriptores, y `notifications.js` re-renderiza solo los eventos que coincidan." |

---

## 🎯 CHECKLIST FINAL DE P4

Antes de la demo, verifica:

- [ ] `notifications.js`, `filters.js`, `toast.js`, `stats.js` en `/static/js/`
- [ ] Feed muestra tarjetas al cargar la página
- [ ] Tarjetas tienen animación de entrada
- [ ] Toast aparece y desaparece en 4 segundos
- [ ] Filtros del sidebar funcionan
- [ ] Tabs del header funcionan
- [ ] Clic en ✓ marca como leída con animación
- [ ] Badges del sidebar se actualizan en tiempo real
- [ ] Panel de stats muestra números correctos
- [ ] Barras de progreso se ajustan al porcentaje real
- [ ] Sección "Destacadas" muestra HIGH prioridad sin leer
- [ ] No hay errores rojos en la consola del navegador
- [ ] Tienes tu parte de la demo preparada (5-7 min)

---

## 🔥 TIPS FINALES PARA P4

### En el código

- **Nunca modifiques `state._state` directamente** — solo usa los métodos públicos
- **Usa event delegation** — no pongas `addEventListener` dentro de loops que se ejecutan muchas veces
- **Limpia los intervals** si el módulo se reinicia — evita memory leaks
- **Loguea con prefijo** `[Notifications]`, `[Filters]`, `[Toast]`, `[Stats]`

### Con el equipo

- Si P3 cambia la API del estado, **pide que te avise con tiempo** — tus 4 archivos dependen de esa API
- Si P2 cambia un nombre de clase CSS que usas en JS (como `.notification-card`), tu render se rompe — coordina
- Si P1 cambia un `id` en el HTML, tus `getElementById` van a devolver `null` — verifica siempre en consola

### En la demo

- **Sé el operador, no el explicador** — P1 narra, tú haces clic
- Practica la secuencia: filtrar → esperar evento → marcar leída → mostrar stats
- Si algo no funciona en vivo, di: "Dejemos que llegue el siguiente evento" y espera unos segundos
- Conoce el tiempo entre eventos: **3 a 8 segundos** — no desesperes si tarda

### Comandos útiles en consola para debugging en vivo

```javascript
// Ver estado actual completo
state.getAll()

// Ver filtro activo
state.getFiltered()

// Ver stats por tipo
state.getStatsByType()

// Contar no leídas manualmente
state.getAll().filter(n => !n.read).length

// Forzar un filtro
state.setFilter('ENTRADA')
state.setFilter('ALL')

// Simular toast (si quieres mostrarlo sin esperar evento)
showToast(state.getAll()[0])
```

---

## 💪 RECUERDA

Tus módulos son lo que el usuario **ve, toca y siente**. Un feed lento o con bugs arruina la demo aunque el backend funcione perfecto.

Tú eres la última capa antes del usuario. Hazla brillar. 🚀

¡Mucho éxito en la entrega! 🎛️