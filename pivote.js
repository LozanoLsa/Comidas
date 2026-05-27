// ─────────────────────────────────────────────────────────────
//  pivote.js  —  Lógica de la vista del pivote (pivote.html)
// ─────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

// ── Countdown chip ────────────────────────────────────────────
function updateChip() {
  const chip = $('deadline-chip');
  if (!chip) return;
  const now = new Date();
  const dl  = new Date();
  dl.setHours(CONFIG.deadline.hora, CONFIG.deadline.minuto, 0, 0);

  if (now >= dl) {
    if (CONFIG.testMode) {
      chip.textContent = '🧪 Pruebas';
      chip.className = 'deadline-chip';
    } else {
      chip.textContent = '🔒 Pedidos cerrados';
      chip.className = 'deadline-chip closed';
    }
    return;
  }
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

// ── Platillo del día ──────────────────────────────────────────
function renderDia() {
  const pd = Storage.getPlatilloDelDia();

  if (pd) {
    $('dia-form').style.display  = 'none';
    $('dia-badge').style.display = 'flex';
    $('dia-nombre-txt').textContent = pd.nombre;
  } else {
    $('dia-form').style.display  = 'block';
    $('dia-badge').style.display = 'none';
  }
}

// ── Lista de pedidos ──────────────────────────────────────────
function renderPedidos() {
  const pedidos = Storage.getPedidos();
  const lista   = $('lista-pedidos');

  $('cnt-pedidos').textContent = pedidos.length;

  if (pedidos.length === 0) {
    lista.innerHTML = '<div class="empty-pedidos">Aún no hay pedidos.</div>';
    return;
  }

  lista.innerHTML = pedidos.map((p, i) => {
    const planBTxt = p.planB?.platillo
      ? `Plan B: ${p.planB.platillo.nombre} / ${p.planB.guarnicion?.nombre || '–'}`
      : '';
    return `
      <div class="pedido-card">
        <div class="pedido-num">${i + 1}</div>
        <div class="pedido-info">
          <div class="pedido-nombre">${p.nombre}</div>
          <div class="pedido-platillo">${p.platillo.nombre}</div>
          <div class="pedido-guarns">${p.g1.nombre} + ${p.g2.nombre}</div>
          ${p.sopa === false ? `<div class="pedido-planb" style="color:#ef4444">🍲 Sin sopa</div>` : ''}
          ${p.bebida ? `<div class="pedido-planb">🥤 ${p.bebida.nombre}</div>` : ''}
          ${planBTxt ? `<div class="pedido-planb">${planBTxt}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ── Texto para el RESTAURANTE (lo que se copia) ──────────────
function generarTextoRestaurante() {
  const pedidos = Storage.getPedidos();

  if (pedidos.length === 0) return '— Aún no hay pedidos —';

  const hoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
  const fecha = hoy.charAt(0).toUpperCase() + hoy.slice(1);

  // Agrupar platillos por combinación completa (incluyendo sopa)
  const cuentas = {};
  pedidos.forEach(p => {
    const sinSopa = p.sopa === false ? ' (sin sopa)' : '';
    const clave = `${p.platillo.nombre} + ${p.g1.nombre} + ${p.g2.nombre}${sinSopa}`;
    cuentas[clave] = (cuentas[clave] || 0) + 1;
  });

  // Agrupar bebidas (solo quienes pidieron)
  const bebidas = {};
  pedidos.forEach(p => {
    if (p.bebida) bebidas[p.bebida.nombre] = (bebidas[p.bebida.nombre] || 0) + 1;
  });

  let txt = `Buenas tardes, este sería el pedido de ITS del día de hoy ${fecha}\n\n`;

  Object.entries(cuentas).forEach(([combo, n]) => {
    txt += `${n} ${combo}\n`;
  });

  if (Object.keys(bebidas).length > 0) {
    txt += `\nBebidas:\n`;
    Object.entries(bebidas).forEach(([beb, n]) => {
      txt += `${n} ${beb}\n`;
    });
  }

  txt += `\nMuchas gracias, que tengan excelente día! 🙏`;

  return txt;
}

// ── Texto de REFERENCIA INTERNA (nombres, no se copia) ────────
function generarTextoInterno() {
  const pedidos = Storage.getPedidos();
  if (pedidos.length === 0) return '— Aún no hay pedidos —';

  return pedidos.map((p, i) =>
    `${i + 1}. ${p.nombre}\n   ${p.platillo.nombre} + ${p.g1.nombre} + ${p.g2.nombre}${p.sopa === false ? '\n   🍲 Sin sopa' : ''}${p.bebida ? `\n   🥤 ${p.bebida.nombre}` : ''}`
  ).join('\n');
}

// ── Render ambas vistas ───────────────────────────────────────
function renderComanda() {
  $('comanda-restaurante').textContent = generarTextoRestaurante();
  $('comanda-interna').textContent     = generarTextoInterno();
}

// ── Copiar solo el texto del restaurante ──────────────────────
function copiarComanda() {
  const texto = generarTextoRestaurante();
  const btn   = $('btn-copy');

  if (navigator.clipboard) {
    navigator.clipboard.writeText(texto).then(() => {
      btn.textContent = '✅ ¡Copiado! Pega en WhatsApp';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = '📋 Copiar comanda';
        btn.classList.remove('copied');
      }, 3000);
    });
  } else {
    // Fallback para navegadores sin clipboard API (file://)
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity  = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = '✅ ¡Copiado! Pega en WhatsApp';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '📋 Copiar comanda';
      btn.classList.remove('copied');
    }, 3000);
  }
}

// ── Render completo ───────────────────────────────────────────
function renderTodo() {
  renderDia();
  renderPedidos();
  renderComanda();
}

// ── Init ──────────────────────────────────────────────────────
function mostrarDebug() {
  const el = $('debug-panel');
  if (!el) return;
  const todas = Object.keys(localStorage);
  if (todas.length === 0) {
    el.textContent = '✅ localStorage completamente vacío';
    el.style.borderColor = '#22c55e';
    el.style.background  = '#f0fdf4';
    return;
  }
  const lineas = todas.map(k => {
    const val = localStorage.getItem(k);
    const preview = val && val.length > 60 ? val.slice(0, 60) + '…' : val;
    return `  ${k}  =  ${preview}`;
  });
  el.textContent = `📦 ${todas.length} clave(s) en localStorage:\n` + lineas.join('\n');
}

function init() {
  renderTodo();
  mostrarDebug();
  updateChip();
  setInterval(updateChip, 1000);

  // Auto-refresh cada 30 s (simula "tiempo real" en local)
  setInterval(renderTodo, 30000);

  // ── Publicar platillo del día ──
  const inputDia   = $('input-dia');
  const btnPublicar = $('btn-publicar');

  inputDia.addEventListener('input', () => {
    btnPublicar.disabled = inputDia.value.trim().length < 3;
  });
  inputDia.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !btnPublicar.disabled) publicarDia();
  });

  btnPublicar.addEventListener('click', publicarDia);

  function publicarDia() {
    const nombre = inputDia.value.trim();
    if (!nombre) return;
    Storage.setPlatilloDelDia(nombre);
    inputDia.value = '';
    btnPublicar.disabled = true;
    renderTodo();
  }

  // ── Editar platillo del día ──
  $('btn-editar-dia').addEventListener('click', () => {
    const pd = Storage.getPlatilloDelDia();
    Storage.clearPlatilloDelDia();
    $('input-dia').value = pd?.nombre || '';
    $('btn-publicar').disabled = false;
    renderTodo();
    $('input-dia').focus();
  });

  // ── Refresh manual ──
  $('btn-refresh').addEventListener('click', () => {
    renderTodo();
    const btn = $('btn-refresh');
    btn.textContent = '✓ Actualizado';
    setTimeout(() => { btn.textContent = '↻ Actualizar'; }, 1500);
  });

  // ── Copiar comanda ──
  $('btn-copy').addEventListener('click', copiarComanda);

  // ── Reset del día (pruebas) ──────────────────────────────
  $('btn-reset').addEventListener('click', () => {
    // Recolecta primero, luego borra (evita problemas de índice)
    const aBorrar = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k !== null) aBorrar.push(k); // borra TODO para pruebas
    }
    aBorrar.forEach(k => localStorage.removeItem(k));
    // Actualiza UI y debug sin recargar
    mostrarDebug();
    renderTodo();
    $('btn-reset').textContent = '✅ Limpio — recarga la página si quieres empezar de cero';
  });
}

document.addEventListener('DOMContentLoaded', init);
