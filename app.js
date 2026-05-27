// ─────────────────────────────────────────────────────────────
//  app.js  —  Lógica del formulario de usuario (index.html)
// ─────────────────────────────────────────────────────────────

// ── Estado ────────────────────────────────────────────────────
const state = {
  nombre:    '',
  platillo:  null,
  g1:        null,
  g2:        null,
  bebida:    null,
  planB: { platillo: null, guarnicion: null },
  planBOpen:   false,
  bebidaOpen:  false
};

// ── Helpers ───────────────────────────────────────────────────
const $ = id => document.getElementById(id);

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

function isBeforeOpen() {
  if (CONFIG.testMode) return false; // desactivado en modo pruebas
  const now = new Date();
  return now.getHours() < CONFIG.apertura.hora ||
    (now.getHours() === CONFIG.apertura.hora &&
     now.getMinutes() < CONFIG.apertura.minuto);
}

function isPastDeadline() {
  if (CONFIG.testMode) return false; // ⚠️ desactivado en modo pruebas
  const now = new Date();
  return now.getHours() > CONFIG.deadline.hora ||
    (now.getHours() === CONFIG.deadline.hora &&
     now.getMinutes() >= CONFIG.deadline.minuto);
}

function platillosDelDia() {
  const pd = Storage.getPlatilloDelDia();
  const lista = [...CONFIG.platillos];
  if (pd) lista.push({ id: 'del_dia', nombre: pd.nombre, precio: 120, esDelDia: true });
  return lista;
}

// ── Render botones ────────────────────────────────────────────
function renderBotones(containerId, items, selectedId, onSelect, disabledIds = []) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = '';

  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'option-btn' + (item.id === selectedId ? ' selected' : '');
    btn.dataset.id = item.id;

    if (item.esDelDia) {
      btn.classList.add('option-btn--dia');
      btn.innerHTML = `<span>${item.nombre}</span><span class="dia-badge-tag">⭐ Hoy</span>`;
    } else if (item.nota) {
      btn.innerHTML = `${item.nombre}<span class="nota">${item.nota}</span>`;
    } else {
      btn.textContent = item.nombre;
    }

    if (disabledIds.includes(item.id)) btn.disabled = true;
    btn.addEventListener('click', () => onSelect(item));
    container.appendChild(btn);
  });
}

// ── Render completo del formulario ────────────────────────────
function renderForm() {
  const platillos = platillosDelDia();

  // Platillo principal
  renderBotones('grid-platillos', platillos, state.platillo?.id, item => {
    state.platillo = item;
    if (state.planB.platillo?.id === item.id) state.planB.platillo = null;
    renderForm();
  });

  // Guarnición 1
  renderBotones('grid-g1', CONFIG.guarniciones, state.g1?.id, item => {
    state.g1 = item;
    renderForm();
  });

  // Guarnición 2 — permite repetir la misma que G1
  renderBotones(
    'grid-g2',
    CONFIG.guarniciones,
    state.g2?.id,
    item => { state.g2 = item; renderForm(); }
  );

  // Bebida opcional — clic en la misma quita la selección
  renderBotones('grid-bebida', CONFIG.bebidas, state.bebida?.id, item => {
    state.bebida = (state.bebida?.id === item.id) ? null : item;
    renderForm();
  });

  // Plan B — platillo (excluye el principal ya elegido)
  const opcionesPlanB = [
    ...platillos,
    { id: 'daigual', nombre: '🤷 Da igual / Lo que haya' }
  ];
  renderBotones(
    'grid-planb-platillo',
    opcionesPlanB,
    state.planB.platillo?.id,
    item => { state.planB.platillo = item; renderForm(); },
    state.platillo ? [state.platillo.id] : []
  );

  // Plan B — guarnición de respaldo
  renderBotones(
    'grid-planb-guarnicion',
    [...CONFIG.guarniciones, { id: 'daigual_g', nombre: '🤷 Da igual / Lo que haya' }],
    state.planB.guarnicion?.id,
    item => { state.planB.guarnicion = item; renderForm(); }
  );

  actualizarSubmit();
}

// ── Botón submit ──────────────────────────────────────────────
function actualizarSubmit() {
  const btn = $('btn-submit');
  const listo = state.nombre.trim() && state.platillo && state.g1 && state.g2;

  if (listo) {
    btn.disabled = false;
    btn.classList.add('ready');
    btn.textContent = '¡Enviar mi pedido! ✅';
  } else {
    btn.disabled = true;
    btn.classList.remove('ready');
    const faltan = [];
    if (!state.nombre.trim()) faltan.push('nombre');
    if (!state.platillo)      faltan.push('platillo');
    if (!state.g1)            faltan.push('guarnición 1');
    if (!state.g2)            faltan.push('guarnición 2');
    btn.textContent = `Falta: ${faltan.join(' · ')}`;
  }
}

// ── Card de resumen ───────────────────────────────────────────
function buildOrderCard(pedido, containerId) {
  const c = $(containerId);
  if (!c) return;

  const planBTxt = pedido.planB?.platillo
    ? `${pedido.planB.platillo.nombre} / ${pedido.planB.guarnicion?.nombre || '–'}`
    : null;

  c.innerHTML = `
    <div class="order-row">
      <span class="order-row-icon">👤</span>
      <span class="order-row-val">${pedido.nombre}</span>
    </div>
    <hr class="order-divider">
    <div class="order-row">
      <span class="order-row-icon">🍽️</span>
      <span class="order-row-label">Platillo</span>
      <span class="order-row-val">${pedido.platillo.nombre}</span>
    </div>
    <div class="order-row">
      <span class="order-row-icon">🥘</span>
      <span class="order-row-label">Guarniciones</span>
      <span class="order-row-val">${pedido.g1.nombre} + ${pedido.g2.nombre}</span>
    </div>
    ${pedido.bebida ? `
    <hr class="order-divider">
    <div class="order-row">
      <span class="order-row-icon">🥤</span>
      <span class="order-row-label">Bebida</span>
      <span class="order-row-val">${pedido.bebida.nombre}</span>
    </div>` : ''}
    ${planBTxt ? `
    <hr class="order-divider">
    <div class="order-row">
      <span class="order-row-icon">🔄</span>
      <span class="order-row-label">Plan B</span>
      <span class="order-row-planb">${planBTxt}</span>
    </div>` : ''}
  `;
}

// ── Submit ────────────────────────────────────────────────────
function submitPedido() {
  const pedido = {
    nombre:   state.nombre.trim(),
    platillo: state.platillo,
    g1:       state.g1,
    g2:       state.g2,
    bebida:   state.bebida || null,
    planB:    state.planB,
    tardio:   isPastDeadline()
  };

  Storage.savePedido(pedido);
  Storage.setNombre(pedido.nombre);
  Storage.setDeviceNombre(pedido.nombre); // 🔒 lock del dispositivo

  const yaExistia = Storage.getMiPedido(pedido.nombre);
  $('confirm-titulo').textContent = yaExistia ? '✏️ Pedido actualizado' : '✅ ¡Pedido enviado!';
  buildOrderCard(pedido, 'confirm-card');
  showScreen('screen-confirm');
}

// ── Countdown ─────────────────────────────────────────────────
function updateChip() {
  const chip = $('deadline-chip');
  if (!chip) return;

  if (isBeforeOpen()) {
    chip.textContent = '🌅 Abre 10:00 AM';
    chip.className = 'deadline-chip';
    return;
  }

  if (isPastDeadline()) {
    chip.textContent = CONFIG.testMode ? '🧪 Pruebas' : '🔒 Cerrado';
    chip.className = 'deadline-chip' + (CONFIG.testMode ? '' : ' closed');
    return;
  }

  const now = new Date();
  const dl  = new Date();
  dl.setHours(CONFIG.deadline.hora, CONFIG.deadline.minuto, 0, 0);
  const diff = dl - now;
  const hh   = Math.floor(diff / 3600000);
  const mm   = Math.floor((diff % 3600000) / 60000);
  const ss   = Math.floor((diff % 60000) / 1000);
  const pad  = n => String(n).padStart(2, '0');
  const txt  = `${pad(hh)}:${pad(mm)}:${pad(ss)}`;

  if (diff <= 15 * 60000) {
    chip.className = 'deadline-chip urgent';
    chip.textContent = `⚠️ ${txt}`;
  } else {
    chip.className = 'deadline-chip';
    chip.textContent = `⏰ ${txt}`;
  }
}

// ── Pantalla "ya pediste" ─────────────────────────────────────
function mostrarYaPediste(pedido, dispositivoLocked = false) {
  buildOrderCard(pedido, 'mi-pedido-card');

  // Prellenar nombre correcto aunque el input tenga otro
  state.nombre = pedido.nombre;
  Storage.setNombre(pedido.nombre);

  // "No soy yo" solo aparece si el dispositivo NO ha enviado pedido aún
  $('btn-otra-persona').style.display = dispositivoLocked ? 'none' : '';

  showScreen('screen-ya-pediste');

  $('btn-cambiar').onclick = () => {
    // Borra el pedido anterior pero mantiene el lock: solo puede re-ordenar con el mismo nombre
    Storage.deletePedido(pedido.nombre);
    state.platillo = null;
    state.g1 = null;
    state.g2 = null;
    state.planB = { platillo: null, guarnicion: null };
    state.nombre = pedido.nombre;
    $('input-nombre').value = pedido.nombre;
    showScreen('screen-form');
    renderForm();
  };

  $('btn-otra-persona').onclick = () => {
    Storage.clearNombre();
    state.nombre = '';
    $('input-nombre').value = '';
    showScreen('screen-form');
    renderForm();
  };
}

// ── Init ──────────────────────────────────────────────────────
function init() {
  // Nombre guardado
  const nombreGuardado = Storage.getNombre();
  if (nombreGuardado) {
    state.nombre = nombreGuardado;
    $('input-nombre').value = nombreGuardado;
  }

  // Nombre → listener
  $('input-nombre').addEventListener('input', e => {
    state.nombre = e.target.value;
    actualizarSubmit();
  });

  // Bebida toggle
  $('bebida-header').addEventListener('click', () => {
    state.bebidaOpen = !state.bebidaOpen;
    $('bebida-body').classList.toggle('open', state.bebidaOpen);
    $('bebida-chevron').classList.toggle('open', state.bebidaOpen);
  });

  // Plan B toggle
  $('plan-b-header').addEventListener('click', () => {
    state.planBOpen = !state.planBOpen;
    $('plan-b-body').classList.toggle('open', state.planBOpen);
    $('plan-b-chevron').classList.toggle('open', state.planBOpen);
  });

  // Submit
  $('btn-submit').addEventListener('click', submitPedido);

  // Countdown
  updateChip();
  setInterval(updateChip, 1000);

  // ── Lógica de pantallas ──
  routeScreen(nombreGuardado);

  // Si no hay menú del día, recheck cada 30 s
  if (!Storage.getPlatilloDelDia()) {
    const interval = setInterval(() => {
      if (Storage.getPlatilloDelDia()) {
        clearInterval(interval);
        routeScreen(Storage.getNombre());
      }
    }, 30000);
  }
}

function routeScreen(nombre) {
  // 1. Antes de apertura
  if (isBeforeOpen()) {
    showScreen('screen-before-open');
    return;
  }

  // 2. Cerrado
  if (isPastDeadline()) {
    showScreen('screen-closed');
    return;
  }

  // 3. Sin menú del día
  if (!Storage.getPlatilloDelDia()) {
    showScreen('screen-no-menu');
    return;
  }

  // 3. Este dispositivo ya ordenó hoy → mostrar su pedido, sin opción de ser "otra persona"
  const deviceNombre = Storage.getDeviceNombre();
  if (deviceNombre) {
    const pedidoDevice = Storage.getMiPedido(deviceNombre);
    if (pedidoDevice) {
      mostrarYaPediste(pedidoDevice, true); // true = ya ordenó, ocultar "No soy yo"
      return;
    }
  }

  // 4. Tiene nombre guardado con pedido (sin lock de dispositivo aún)
  const pedidoExistente = Storage.getMiPedido(nombre);
  if (pedidoExistente) {
    mostrarYaPediste(pedidoExistente, false);
    return;
  }

  // 5. Formulario libre
  showScreen('screen-form');
  renderForm();
}

document.addEventListener('DOMContentLoaded', init);
