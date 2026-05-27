// ─────────────────────────────────────────────────────────────
//  storage.js  —  Capa de datos (localStorage por ahora)
//  Cuando conectemos el backend, solo cambia este archivo.
// ─────────────────────────────────────────────────────────────

const Storage = (() => {
  // Fecha LOCAL (no UTC) — evita que la clave cambie a las 6pm en México
  const hoy = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const keys = {
    platillo: () => `qm_platillo_${hoy()}`,
    pedidos:  () => `qm_pedidos_${hoy()}`,
    nombre:   () => `qm_nombre`            // persiste entre días
  };

  return {
    // ── Platillo del día ─────────────────────────────────────
    getPlatilloDelDia() {
      const raw = localStorage.getItem(keys.platillo());
      return raw ? JSON.parse(raw) : null;
    },
    setPlatilloDelDia(nombre) {
      localStorage.setItem(keys.platillo(), JSON.stringify({
        nombre: nombre.trim(),
        ts: Date.now()
      }));
    },
    clearPlatilloDelDia() {
      localStorage.removeItem(keys.platillo());
    },

    // ── Pedidos del día ──────────────────────────────────────
    getPedidos() {
      const raw = localStorage.getItem(keys.pedidos());
      return raw ? JSON.parse(raw) : [];
    },
    savePedido(pedido) {
      const pedidos = this.getPedidos();
      const idx = pedidos.findIndex(
        p => p.nombre.toLowerCase() === pedido.nombre.toLowerCase()
      );
      const entry = { ...pedido, ts: Date.now() };
      if (idx >= 0) pedidos[idx] = entry;
      else pedidos.push(entry);
      localStorage.setItem(keys.pedidos(), JSON.stringify(pedidos));
      return entry;
    },
    deletePedido(nombre) {
      const pedidos = this.getPedidos().filter(
        p => p.nombre.toLowerCase() !== nombre.toLowerCase()
      );
      localStorage.setItem(keys.pedidos(), JSON.stringify(pedidos));
    },
    getMiPedido(nombre) {
      if (!nombre) return null;
      return this.getPedidos().find(
        p => p.nombre.toLowerCase() === nombre.toLowerCase()
      ) || null;
    },

    // ── Nombre guardado (persiste) ───────────────────────────
    getNombre: ()  => localStorage.getItem(keys.nombre()) || '',
    setNombre: (n) => localStorage.setItem(keys.nombre(), n.trim()),
    clearNombre: ()=> localStorage.removeItem(keys.nombre()),

    // ── Lock de dispositivo (1 pedido por dispositivo por día) ──
    // Guarda el nombre con el que este dispositivo ordenó hoy.
    // Independiente del nombre en el input — no se puede burlar.
    getDeviceNombre: () => localStorage.getItem(`qm_device_${hoy()}`) || null,
    setDeviceNombre: (n) => localStorage.setItem(`qm_device_${hoy()}`, n.trim()),
    clearDeviceNombre: () => localStorage.removeItem(`qm_device_${hoy()}`),

    // ── Reset completo (solo para pruebas) ──────────────────
    // Borra TODAS las claves de la app (cualquier fecha),
    // así no quedan datos huérfanos de sesiones anteriores.
    resetDia() {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('qm_')) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    }
  };
})();
