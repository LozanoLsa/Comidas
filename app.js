// ─────────────────────────────────────────────────────────────
//  app.js  —  Lógica del formulario de usuario (pedidos.html)
// ─────────────────────────────────────────────────────────────

// ── Estado ────────────────────────────────────────────────────
const state = {
  nombre:    '',
  platillo:  null,
  g1:        null,
  g2:        null,
  bebida:    null,
  sopa:      true,   // true = con sopa (default), false = sin sopa
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
  if (CONFIG.testMode) return false;
  const now = new Date();
  return now.getHours() < CONFIG.apertura.hora ||
    (now.getHours() === CONFIG.apertura.hora &&
     now.getMinutes() < CONFIG.apertura.minuto);
}

function isPastDeadline() {
  if (CONFIG.testMode) return false;
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

  renderBotones('grid-platillos', platillos, state.platillo?.id, item => {
    state.platillo = item;
    if (state.planB.platillo?.id === item.id) state.planB.platillo = null;
    renderForm();
  });

  renderBotones('grid-g1', CONFIG.guarniciones, state.g1?.id, item => {
    state.g1 = item;
    renderForm();
  });

  renderBotones(
    'grid-g2',
    CONFIG.guarniciones,
    state.g2?.id,
    item => { state.g2 = item; renderForm(); }
  );

  renderBotones('grid-bebida', CONFIG.bebidas, state.bebida?.id, item => {
    state.bebida = (state.bebida?.id === item.id) ? null : item;
    renderForm();
  });

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
    ${pedido.sopa === false ? `
    <hr class="order-divider">
    <div class="order-row">
      <span class="order-row-icon">🍲</span>
      <span class="order-row-label">Sopa</span>
      <span class="order-row-val" style="color:#ef4444">Sin sopa ❌</span>
    </div>` : ''}
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
async function submitPedido() {
  const btn = $('btn-submit');
  btn.disabled = true;
  btn.textContent = '⏳ Enviando…';

  const yaExistia = !!Storage.getMiPedido(state.nombre.trim());

  const pedido = {
    nombre:   state.nombre.trim(),
    platillo: state.platillo,
    g1:       state.g1,
    g2:       state.g2,
    bebida:   state.bebida || null,
    sopa:     state.sopa,
    planB:    state.planB,
    tardio:   isPastDeadline()
  };

  try {
    await Storage.savePedido(pedido);
    Storage.setNombre(pedido.nombre);
    Storage.setDeviceNombre(pedido.nombre); // 🔒 lock del dispositivo

    $('confirm-titulo').textContent = yaExistia ? '✏️ Pedido actualizado' : '✅ ¡Pedido enviado!';
    buildOrderCard(pedido, 'confirm-card');
    showScreen('screen-confirm');
  } catch (err) {
    btn.disabled = false;
    actualizarSubmit();
    alert('❌ No se pudo guardar el pedido.\nRevisa tu conexión e intenta de nuevo.');
    console.error(err);
  }
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

  state.nombre = pedido.nombre;
  Storage.setNombre(pedido.nombre);

  $('btn-otra-persona').style.display = dispositivoLocked ? 'none' : '';

  showScreen('screen-ya-pediste');

  $('btn-cambiar').onclick = async () => {
    $('btn-cambiar').disabled = true;
    $('btn-cambiar').textContent = '⏳ Un momento…';
    try {
      await Storage.deletePedido(pedido.nombre);
    } catch (err) {
      $('btn-cambiar').disabled = false;
      $('btn-cambiar').textContent = '✏️ Cambiar mi pedido';
      alert('❌ No se pudo cancelar el pedido. Intenta de nuevo.');
      return;
    }
    state.platillo = null;
    state.g1 = null;
    state.g2 = null;
    state.planB = { platillo: null, guarnicion: null };
    state.nombre = pedido.nombre;
    $('input-nombre').value = pedido.nombre;
    $('btn-cambiar').disabled = false;
    $('btn-cambiar').textContent = '✏️ Cambiar mi pedido';
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
async function init() {
  // Nombre guardado en este dispositivo
  const nombreGuardado = Storage.getNombre();
  if (nombreGuardado) {
    state.nombre = nombreGuardado;
    $('input-nombre').value = nombreGuardado;
  }

  // Listeners de UI
  $('input-nombre').addEventListener('input', e => {
    state.nombre = e.target.value;
    actualizarSubmit();
  });

  $('check-sopa').addEventListener('change', e => {
    state.sopa = !e.target.checked;
  });

  $('bebida-header').addEventListener('click', () => {
    state.bebidaOpen = !state.bebidaOpen;
    $('bebida-body').classList.toggle('open', state.bebidaOpen);
    $('bebida-chevron').classList.toggle('open', state.bebidaOpen);
  });

  $('plan-b-header').addEventListener('click', () => {
    state.planBOpen = !state.planBOpen;
    $('plan-b-body').classList.toggle('open', state.planBOpen);
    $('plan-b-chevron').classList.toggle('open', state.planBOpen);
  });

  $('btn-submit').addEventListener('click', submitPedido);

  updateChip();
  setInterval(updateChip, 1000);

  // ── Carga inicial desde el servidor ──
  try {
    await Storage.sync();
  } catch (err) {
    showScreen('screen-error');
    console.error('Error al conectar con el servidor:', err);
    return;
  }

  routeScreen(nombreGuardado);

  // Refresco automático cada 30 s — actualiza caché y re-evalúa pantalla
  setInterval(async () => {
    try {
      await Storage.sync();
      // Si estamos en "sin menú" y ahora ya hay menú, avanzar
      const pantallaActiva = document.querySelector('.screen.active');
      if (pantallaActiva?.id === 'screen-no-menu' && Storage.getPlatilloDelDia()) {
        routeScreen(Storage.getNombre());
      }
    } catch (_) { /* silencioso — no interrumpir al usuario */ }
  }, 30000);
}

function routeScreen(nombre) {
  if (isBeforeOpen()) { showScreen('screen-before-open'); return; }
  if (isPastDeadline()) { showScreen('screen-closed'); return; }
  if (!Storage.getPlatilloDelDia()) { showScreen('screen-no-menu'); return; }

  const deviceNombre = Storage.getDeviceNombre();
  if (deviceNombre) {
    const pedidoDevice = Storage.getMiPedido(deviceNombre);
    if (pedidoDevice) { mostrarYaPediste(pedidoDevice, true); return; }
  }

  const pedidoExistente = Storage.getMiPedido(nombre);
  if (pedidoExistente) { mostrarYaPediste(pedidoExistente, false); return; }

  showScreen('screen-form');
  renderForm();
}

document.addEventListener('DOMContentLoaded', init);
