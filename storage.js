// ─────────────────────────────────────────────────────────────
//  storage.js  —  Capa de datos · Google Sheets via Apps Script
// ─────────────────────────────────────────────────────────────

// ⚠️  REEMPLAZA esta URL con la de tu Web App después de desplegar
const API_URL = 'https://script.google.com/macros/s/AKfycbzyj_VRcHKaiM3_Pp_aDZwHfOYFgXK6uLkZlf5R00XESL3mhAsi-bH4AuPxShJvmBQN/exec';

// ── Caché local (lecturas síncronas; se actualiza en cada sync) ─
const _cache = {
  pedidos:       [],
  platilloDelDia: null
};

// ── Comunicación con Apps Script ───────────────────────────────

async function apiGet(action) {
  const res  = await fetch(`${API_URL}?action=${action}`, { redirect: 'follow' });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error en API GET ' + action);
  return data.data;
}

async function apiPost(body) {
  const res  = await fetch(API_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'text/plain' },   // evita preflight CORS
    body:    JSON.stringify(body),
    redirect: 'follow'
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error en API POST ' + body.action);
  return data.data;
}

// ── Helper de fecha local (mismo criterio que antes) ───────────
function _hoy() {
  const d    = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ── API pública ────────────────────────────────────────────────
const Storage = {

  // ── Sincroniza el caché con el servidor ──────────────────────
  // Llama esto al iniciar la app y cada 30 s para ver cambios.
  async sync() {
    const [pedidos, platilloDelDia] = await Promise.all([
      apiGet('getPedidos'),
      apiGet('getPlatilloDelDia')
    ]);
    _cache.pedidos        = pedidos;
    _cache.platilloDelDia = platilloDelDia;
  },

  // ── Platillo del día ─────────────────────────────────────────
  // Lectura síncrona (desde caché)
  getPlatilloDelDia() {
    return _cache.platilloDelDia;
  },
  // Escritura asíncrona
  async setPlatilloDelDia(nombre) {
    await apiPost({ action: 'setPlatilloDelDia', nombre: nombre.trim() });
    _cache.platilloDelDia = { nombre: nombre.trim() };
  },
  async clearPlatilloDelDia() {
    await apiPost({ action: 'clearPlatilloDelDia' });
    _cache.platilloDelDia = null;
  },

  // ── Pedidos del día ──────────────────────────────────────────
  // Lectura síncrona (desde caché)
  getPedidos() {
    return _cache.pedidos;
  },
  getMiPedido(nombre) {
    if (!nombre) return null;
    return _cache.pedidos.find(
      p => p.nombre.toLowerCase() === nombre.toLowerCase()
    ) || null;
  },
  // Escritura asíncrona
  async savePedido(pedido) {
    await apiPost({ action: 'savePedido', pedido });
    // Actualiza caché localmente sin volver a llamar al servidor
    const idx = _cache.pedidos.findIndex(
      p => p.nombre.toLowerCase() === pedido.nombre.toLowerCase()
    );
    const entry = { ...pedido, ts: Date.now() };
    if (idx >= 0) _cache.pedidos[idx] = entry;
    else          _cache.pedidos.push(entry);
    return entry;
  },
  async deletePedido(nombre) {
    await apiPost({ action: 'deletePedido', nombre });
    _cache.pedidos = _cache.pedidos.filter(
      p => p.nombre.toLowerCase() !== nombre.toLowerCase()
    );
  },

  // ── Nombre guardado (localStorage — preferencia del dispositivo) ─
  getNombre:    ()  => localStorage.getItem('qm_nombre') || '',
  setNombre:    (n) => localStorage.setItem('qm_nombre', n.trim()),
  clearNombre:  ()  => localStorage.removeItem('qm_nombre'),

  // ── Lock de dispositivo (localStorage — 1 pedido por día) ────
  getDeviceNombre:   ()  => localStorage.getItem(`qm_device_${_hoy()}`) || null,
  setDeviceNombre:   (n) => localStorage.setItem(`qm_device_${_hoy()}`, n.trim()),
  clearDeviceNombre: ()  => localStorage.removeItem(`qm_device_${_hoy()}`),

  // ── Reset completo (solo para pruebas) ───────────────────────
  async clearAll() {
    await apiPost({ action: 'clearAll' });
    _cache.pedidos        = [];
    _cache.platilloDelDia = null;
    // Limpia también el lock local del día
    localStorage.removeItem(`qm_device_${_hoy()}`);
  }
};
