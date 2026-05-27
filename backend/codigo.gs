// ═══════════════════════════════════════════════════════════════
//  codigo.gs  —  Backend ITS Pedidos · Google Apps Script
//  Pega TODO este archivo en tu proyecto de Apps Script
// ═══════════════════════════════════════════════════════════════

// Zona horaria: se toma de la hoja para garantizar consistencia absoluta
function getTZ() {
  return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
}

// Nombres de las hojas dentro del Google Sheet
const HOJA_PEDIDOS = 'pedidos';
const HOJA_DIA     = 'platillo_dia';

// ── Utilidades ─────────────────────────────────────────────────

/** Devuelve la fecha local de hoy como "yyyy-MM-dd" */
function getFecha() {
  return Utilities.formatDate(new Date(), getTZ(), 'yyyy-MM-dd');
}

/**
 * Convierte un valor de celda a string "yyyy-MM-dd".
 * Google Sheets auto-convierte "2026-05-27" a objeto Date con número de serie.
 * Usamos la zona horaria DE LA MISMA HOJA para garantizar que coincida.
 */
function toFechaStr(val) {
  if (!val && val !== 0) return '';
  // Apps Script: los Date de getValues() no pasan instanceof Date
  // pero sí tienen el método getTime — usamos duck typing
  if (typeof val === 'object' && typeof val.getTime === 'function') {
    return Utilities.formatDate(val, getTZ(), 'yyyy-MM-dd');
  }
  return String(val);
}

/** Obtiene (o crea) una hoja por nombre y agrega encabezados si está vacía */
function getHoja(nombre) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   hoja  = ss.getSheetByName(nombre);
  if (!hoja) hoja = ss.insertSheet(nombre);

  // Crear encabezados solo si la hoja está completamente vacía
  if (hoja.getLastRow() === 0) {
    if (nombre === HOJA_PEDIDOS) {
      hoja.appendRow([
        'fecha','nombre',
        'platillo_id','platillo_nombre',
        'g1_id','g1_nombre',
        'g2_id','g2_nombre',
        'bebida_id','bebida_nombre',
        'sopa',
        'planb_platillo_id','planb_platillo_nombre',
        'planb_guarnicion_id','planb_guarnicion_nombre',
        'tardio','ts'
      ]);
      // Formatear encabezados
      hoja.getRange(1, 1, 1, 17).setFontWeight('bold').setBackground('#C41E3A').setFontColor('#ffffff');
    } else if (nombre === HOJA_DIA) {
      hoja.appendRow(['fecha','nombre','ts']);
      hoja.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#C41E3A').setFontColor('#ffffff');
    }
  }
  return hoja;
}

/** Respuesta JSON estándar */
function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Puntos de entrada HTTP ─────────────────────────────────────

function doGet(e) {
  const action = e.parameter.action;
  const fecha  = getFecha();
  try {
    if (action === 'getPedidos')        return json({ ok: true, data: leerPedidos(fecha) });
    if (action === 'getPlatilloDelDia') return json({ ok: true, data: leerPlatilloDelDia(fecha) });
    if (action === 'ping')              return json({ ok: true, data: 'pong' });
    return json({ ok: false, error: 'Accion no reconocida: ' + action });
  } catch (err) {
    return json({ ok: false, error: err.toString() });
  }
}

function doPost(e) {
  const fecha = getFecha();
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action;
    if (action === 'savePedido')          { guardarPedido(fecha, data.pedido);      return json({ ok: true }); }
    if (action === 'deletePedido')        { borrarPedido(fecha, data.nombre);       return json({ ok: true }); }
    if (action === 'setPlatilloDelDia')   { guardarPlatilloDia(fecha, data.nombre); return json({ ok: true }); }
    if (action === 'clearPlatilloDelDia') { borrarPlatilloDia(fecha);               return json({ ok: true }); }
    if (action === 'clearAll')            { borrarTodoDia(fecha);                   return json({ ok: true }); }
    return json({ ok: false, error: 'Accion no reconocida: ' + action });
  } catch (err) {
    return json({ ok: false, error: err.toString() });
  }
}

// ── Pedidos ────────────────────────────────────────────────────

function leerPedidos(fecha) {
  const hoja  = getHoja(HOJA_PEDIDOS);
  const filas = hoja.getDataRange().getValues();
  const pedidos = [];

  for (let i = 1; i < filas.length; i++) {
    const f = filas[i];
    if (toFechaStr(f[0]) !== fecha) continue;

    pedidos.push({
      nombre:   String(f[1]),
      platillo: { id: String(f[2]), nombre: String(f[3]) },
      g1:       { id: String(f[4]), nombre: String(f[5]) },
      g2:       { id: String(f[6]), nombre: String(f[7]) },
      bebida:   f[8] ? { id: String(f[8]), nombre: String(f[9]) } : null,
      sopa:     f[10] !== false && f[10] !== 'false' && f[10] !== 0,
      planB: {
        platillo:   f[11] ? { id: String(f[11]), nombre: String(f[12]) } : null,
        guarnicion: f[13] ? { id: String(f[13]), nombre: String(f[14]) } : null
      },
      tardio: f[15] === true || f[15] === 'true'
    });
  }
  return pedidos;
}

function guardarPedido(fecha, pedido) {
  // Lock para evitar duplicados si dos personas mandan al mismo tiempo
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const hoja  = getHoja(HOJA_PEDIDOS);
    const filas = hoja.getDataRange().getValues();
    const fila  = [
      fecha,
      pedido.nombre,
      pedido.platillo.id,    pedido.platillo.nombre,
      pedido.g1.id,          pedido.g1.nombre,
      pedido.g2.id,          pedido.g2.nombre,
      pedido.bebida ? pedido.bebida.id     : '',
      pedido.bebida ? pedido.bebida.nombre : '',
      pedido.sopa,
      pedido.planB && pedido.planB.platillo   ? pedido.planB.platillo.id     : '',
      pedido.planB && pedido.planB.platillo   ? pedido.planB.platillo.nombre : '',
      pedido.planB && pedido.planB.guarnicion ? pedido.planB.guarnicion.id     : '',
      pedido.planB && pedido.planB.guarnicion ? pedido.planB.guarnicion.nombre : '',
      pedido.tardio || false,
      new Date().toISOString()
    ];

    // Buscar si ya existe un pedido del mismo nombre hoy → actualizar
    for (let i = 1; i < filas.length; i++) {
      if (toFechaStr(filas[i][0]) === fecha &&
          String(filas[i][1]).toLowerCase() === String(pedido.nombre).toLowerCase()) {
        hoja.getRange(i + 1, 1, 1, fila.length).setValues([fila]);
        return;
      }
    }
    // No existe → agregar nueva fila
    hoja.appendRow(fila);
  } finally {
    lock.releaseLock();
  }
}

function borrarPedido(fecha, nombre) {
  const hoja  = getHoja(HOJA_PEDIDOS);
  const filas = hoja.getDataRange().getValues();
  for (let i = filas.length - 1; i >= 1; i--) {
    if (toFechaStr(filas[i][0]) === fecha &&
        String(filas[i][1]).toLowerCase() === String(nombre).toLowerCase()) {
      hoja.deleteRow(i + 1);
      return;
    }
  }
}

// ── Platillo del día ───────────────────────────────────────────

function leerPlatilloDelDia(fecha) {
  const hoja  = getHoja(HOJA_DIA);
  const filas = hoja.getDataRange().getValues();
  for (let i = 1; i < filas.length; i++) {
    if (toFechaStr(filas[i][0]) === fecha) return { nombre: String(filas[i][1]) };
  }
  return null;
}

function guardarPlatilloDia(fecha, nombre) {
  const hoja  = getHoja(HOJA_DIA);
  const filas = hoja.getDataRange().getValues();
  const fila  = [fecha, nombre.trim(), new Date().toISOString()];
  for (let i = 1; i < filas.length; i++) {
    if (toFechaStr(filas[i][0]) === fecha) {
      hoja.getRange(i + 1, 1, 1, 3).setValues([fila]);
      return;
    }
  }
  hoja.appendRow(fila);
}

function borrarPlatilloDia(fecha) {
  const hoja  = getHoja(HOJA_DIA);
  const filas = hoja.getDataRange().getValues();
  for (let i = filas.length - 1; i >= 1; i--) {
    if (toFechaStr(filas[i][0]) === fecha) { hoja.deleteRow(i + 1); return; }
  }
}

// ── Reset del día (solo para pruebas) ─────────────────────────

function borrarTodoDia(fecha) {
  const hojaPed = getHoja(HOJA_PEDIDOS);
  const filasPed = hojaPed.getDataRange().getValues();
  for (let i = filasPed.length - 1; i >= 1; i--) {
    if (toFechaStr(filasPed[i][0]) === fecha) hojaPed.deleteRow(i + 1);
  }
  borrarPlatilloDia(fecha);
}
