// ─────────────────────────────────────────────────────────────
//  config.js  —  Menú estático + configuración global
//  Edita este archivo si cambia el menú o el horario
// ─────────────────────────────────────────────────────────────

const CONFIG = {
  restaurante: {
    nombre: "Quiero Más+",
    whatsapp: "528115309305"          // número completo con lada
  },

  apertura:     { hora: 10, minuto:  0 }, // 10:00 AM — abre la ventana
  deadline:     { hora: 12, minuto: 30 }, // 12:30 PM — cierra la ventana
  recordatorio: { hora: 12, minuto: 10 },
  horaEntrega:  "1:45",                  // hora de entrega del restaurante

  // ⚠️ MODO PRUEBAS — cambiar a false en producción
  testMode: true,   // true = ignora el deadline (siempre abierto)

  platillos: [
    { id: "milanesa_res",      nombre: "Milanesa de Res",     precio: 120 },
    { id: "milanesa_pollo",    nombre: "Milanesa de Pollo",   precio: 120 },
    { id: "chiles_carne",      nombre: "Chile Relleno de Carne", precio: 120 },
    { id: "chiles_queso",      nombre: "Chile Relleno de Queso", precio: 120 },
    { id: "enchiladas_suizas", nombre: "Enchiladas Suizas",   precio: 120 },
    { id: "entomatadas",       nombre: "Entomatadas",         precio: 120 },
    { id: "asado_picadillo",   nombre: "Asado / Picadillo",   precio: 120 },
    { id: "pollo_condimentado",   nombre: "Pollo a la Plancha Condimentado",  precio: 120 },
    { id: "pollo_sin_condimento", nombre: "Pollo a la Plancha Sin Condimento", precio: 120 }
  ],

  guarniciones: [
    { id: "arroz",         nombre: "Arroz"                  },
    { id: "frijoles",      nombre: "Frijoles"               },
    { id: "spaguetti",     nombre: "Spaguetti"              },
    { id: "pure",          nombre: "Puré"                   },
    { id: "nopales",       nombre: "Nopales"                },
    { id: "ensalada",      nombre: "Ensalada"               },
    { id: "panela_plancha", nombre: "Queso Panela a la Plancha" }
  ],

  bebidas: [
    { id: "coca_cola",       nombre: "Coca Cola",          precio: 25 },
    { id: "coca_zero",       nombre: "Coca Zero",          precio: 25 },
    { id: "refresco_sabor",  nombre: "Refresco de Sabor",  precio: 25 },
    { id: "desechable_600",  nombre: "Desechable 600ml",   precio: 35 },
    { id: "agua_limon",      nombre: "Agua de Limón",      precio: 25 },
    { id: "agua_jamaica",    nombre: "Agua de Jamaica",    precio: 25 },
    { id: "agua_tamarindo",  nombre: "Agua de Tamarindo",  precio: 25 }
  ]
};
