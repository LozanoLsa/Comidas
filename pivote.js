// ─────────────────────────────────────────────────────────────
//  pivote.js  —  Lógica de la vista del Enlace (pivote.html)
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
          <div class="pedido-planb" style="color:${p.sopa === false ? '#ef4444' : '#16a34a'}">${p.sopa === false ? '🍲 Sin sopa' : '🍲 Con sopa'}</div>
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

  const cuentas = {};
  pedidos.forEach(p => {
    const clave = `${p.platillo.nombre} + ${p.g1.nombre} + ${p.g2.nombre}`;
    cuentas[clave] = (cuentas[clave] || 0) + 1;
  });

  const bebidas = {};
  pedidos.forEach(p => {
    if (p.bebida) bebidas[p.bebida.nombre] = (bebidas[p.bebida.nombre] || 0) + 1;
  });

  const conSopaCount = pedidos.filter(p => p.sopa !== false).length;

  let txt = `Buenas tardes 🍽️ Pedido ITS — ${fecha}\n\n`;

  Object.entries(cuentas).forEach(([combo, n]) => {
    txt += `${n} ${combo}\n`;
  });

  txt += '\n';

  if (Object.keys(bebidas).length > 0) {
    const bebTxt = Object.entries(bebidas).map(([beb, n]) => `${n} ${beb}`).join(', ');
    txt += `🔺 Bebidas: ${bebTxt}\n`;
  }

  txt += `🔺 Sopas: ${conSopaCount}\n`;
  txt += `🔺 Hora: ${CONFIG.horaEntrega || '1:45'}\n`;
  txt += `\nMuchas gracias, que tengan excelente día! 🙏`;

  return txt;
}

// ── Texto de REFERENCIA INTERNA ───────────────────────────────
function generarTextoInterno() {
  const pedidos = Storage.getPedidos();
  if (pedidos.length === 0) return '— Aún no hay pedidos —';

  return pedidos.map((p, i) =>
    `${i + 1}. ${p.nombre}\n   ${p.platillo.nombre} + ${p.g1.nombre} + ${p.g2.nombre}\n   ${p.sopa === false ? '🍲 Sin sopa' : '🍲 Con sopa'}${p.bebida ? `\n   🥤 ${p.bebida.nombre}` : ''}`
  ).join('\n');
}

// ── Render ambas vistas ───────────────────────────────────────
function renderComanda() {
  $('comanda-restaurante').textContent = generarTextoRestaurante();
  $('comanda-interna').textContent     = generarTextoInterno();
}

function renderTodo() {
  renderDia();
  renderPedidos();
  renderComanda();
}

// ── Panel de estado de sincronización ─────────────────────────
function updateSyncStatus() {
  const panel = $('debug-panel');
  if (!panel) return;

  const now  = new Date();
  const hh   = now.getHours();
  const mm   = String(now.getMinutes()).padStart(2, '0');
  const ss   = String(now.getSeconds()).padStart(2, '0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12  = hh % 12 || 12;
  const hora = `${h12}:${mm}:${ss} ${ampm}`;

  const pedidos = Storage.getPedidos();
  const pd      = Storage.getPlatilloDelDia();

  const pedidosTxt  = pedidos.length === 1 ? '1 pedido' : `${pedidos.length} pedidos`;
  const platilloTxt = pd ? `🍲 ${pd.nombre}` : '📭 Sin platillo publicado';

  panel.textContent = `🔄 Última sync: ${hora}  ·  ${pedidosTxt}  ·  ${platilloTxt}`;
  panel.style.display = 'block';
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

// ── Init ──────────────────────────────────────────────────────
async function init() {
  updateChip();
  setInterval(updateChip, 1000);

  // ── Carga inicial desde el servidor ──
  try {
    await Storage.sync();
    updateSyncStatus();
  } catch (err) {
    console.error('Error al sincronizar:', err);
    alert('⚠️ No se pudo conectar al servidor. Revisa tu conexión.');
  }

  renderTodo();

  // Refresco automático cada 30 s
  setInterval(async () => {
    try {
      await Storage.sync();
      renderTodo();
      updateSyncStatus();
    } catch (_) { /* silencioso */ }
  }, 30000);

  // ── Publicar platillo del día ──
  const inputDia    = $('input-dia');
  const btnPublicar = $('btn-publicar');

  inputDia.addEventListener('input', () => {
    btnPublicar.disabled = inputDia.value.trim().length < 3;
  });
  inputDia.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !btnPublicar.disabled) publicarDia();
  });

  btnPublicar.addEventListener('click', publicarDia);

  async function publicarDia() {
    const nombre = inputDia.value.trim();
    if (!nombre) return;
    btnPublicar.disabled = true;
    btnPublicar.textContent = '⏳ Guardando…';
    try {
      await Storage.setPlatilloDelDia(nombre);
      inputDia.value = '';
      renderTodo();
    } catch (err) {
      alert('❌ No se pudo publicar el platillo. Intenta de nuevo.');
      console.error(err);
    } finally {
      btnPublicar.disabled = true;
      btnPublicar.textContent = '✅ Publicar';
    }
  }

  // ── Editar platillo del día ──
  $('btn-editar-dia').addEventListener('click', () => {
    // Mostrar panel de confirmación en vez de actuar directo
    $('editar-confirm').style.display = 'block';
    $('btn-editar-dia').style.display = 'none';
  });

  $('btn-cancelar-editar').addEventListener('click', () => {
    $('editar-confirm').style.display = 'none';
    $('btn-editar-dia').style.display = '';
  });

  // Solo corregir el platillo — mantiene los pedidos existentes
  $('btn-solo-editar').addEventListener('click', async () => {
    const pd = Storage.getPlatilloDelDia();
    $('btn-solo-editar').disabled = true;
    $('btn-solo-editar').textContent = '⏳ Un momento…';
    try {
      await Storage.clearPlatilloDelDia();
    } catch (err) {
      alert('❌ No se pudo editar. Intenta de nuevo.');
      $('btn-solo-editar').disabled = false;
      $('btn-solo-editar').textContent = '✏️ Solo corregir el platillo';
      return;
    }
    $('editar-confirm').style.display = 'none';
    $('btn-editar-dia').style.display = '';
    $('input-dia').value = pd?.nombre || '';
    $('btn-publicar').disabled = false;
    renderTodo();
    $('input-dia').focus();
    $('btn-solo-editar').disabled = false;
    $('btn-solo-editar').textContent = '✏️ Solo corregir el platillo';
  });

  // Reiniciar día completo — borra platillo + todos los pedidos
  $('btn-reiniciar-dia').addEventListener('click', async () => {
    $('btn-reiniciar-dia').disabled = true;
    $('btn-reiniciar-dia').textContent = '⏳ Limpiando…';
    try {
      await Storage.clearAll();
    } catch (err) {
      alert('❌ No se pudo reiniciar. Intenta de nuevo.');
      $('btn-reiniciar-dia').disabled = false;
      $('btn-reiniciar-dia').textContent = '🔄 Reiniciar día completo';
      return;
    }
    $('editar-confirm').style.display = 'none';
    $('btn-editar-dia').style.display = '';
    $('input-dia').value = '';
    $('btn-publicar').disabled = true;
    renderTodo();
    $('input-dia').focus();
    $('btn-reiniciar-dia').disabled = false;
    $('btn-reiniciar-dia').textContent = '🔄 Reiniciar día completo';
  });

  // ── Refresh manual ──
  $('btn-refresh').addEventListener('click', async () => {
    const btn = $('btn-refresh');
    btn.textContent = '⏳ Actualizando…';
    btn.disabled = true;
    try {
      await Storage.sync();
      renderTodo();
      updateSyncStatus();
      btn.textContent = '✓ Actualizado';
    } catch (_) {
      btn.textContent = '❌ Sin conexión';
    }
    setTimeout(() => {
      btn.textContent = '↻ Actualizar';
      btn.disabled = false;
    }, 1500);
  });

  // ── Copiar comanda ──
  $('btn-copy').addEventListener('click', copiarComanda);
}

document.addEventListener('DOMContentLoaded', init);
