// ══════════════════════════════════════════════════════════════════════════════
//  Tour guiado (onboarding) — Driver.js
// ══════════════════════════════════════════════════════════════════════════════
//  Recorrido manual que se lanza desde el botón "?" de la barra superior. Resalta
//  los puntos clave del flujo y, donde hace falta, cambia de vista (setView) entre
//  pasos. Las anclas son atributos data-tour="..." repartidos por la app.
//
//  Regla de navegación: cada paso que apunta a un elemento DENTRO de una vista
//  necesita que esa vista esté activa. Por eso los pasos "nav-*" hacen el setView
//  hacia adelante (onNextClick) y, al volver, restauran la vista del paso anterior
//  (onPrevClick). Los pasos sin `element` no dependen de la vista.
// ══════════════════════════════════════════════════════════════════════════════

import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const wait = (ms = 380) => new Promise(r => setTimeout(r, ms))

export function startProductTour(setView) {
  const d = driver({
    showProgress: true,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Atrás',
    doneBtnText: 'Listo',
    allowClose: true,
    steps: [
      {
        popover: {
          title: 'Bienvenido a Minos ERP',
          description: 'Te muestro el flujo principal en un minuto: maestros (proveedores y materiales), carga de SOLPED y emisión de órdenes. Avanza con «Siguiente» o sal con Esc.',
        },
      },
      {
        element: '[data-tour="nav-dashboard"]',
        popover: {
          title: 'Dashboard',
          description: 'Panel ejecutivo: indicadores y el acceso a los Documentos Solped procesados.',
        },
      },
      {
        element: '[data-tour="kpi-docs"]',
        popover: {
          title: 'Documentos Solped',
          description: 'Cuántos Excels de SOLPED llevas cargados. Al hacer clic se abre la tabla con su estado previo a la orden de compra.',
        },
      },

      // ── PROVEEDORES ──────────────────────────────────────────────────────────
      {
        element: '[data-tour="nav-proveedores"]',
        popover: {
          title: 'Maestro de Proveedores',
          description: 'Tu lista de proveedores, ahora guardada en la base de datos (no solo en el navegador). Desde aquí los creas, editas y consultas.',
        },
        onNextClick: async () => { setView('proveedores'); await wait(); d.moveNext() },
        onPrevClick: async () => { setView('dashboard'); await wait(); d.movePrev() },
      },
      {
        element: '[data-tour="prov-acciones"]',
        popover: {
          title: 'Crear o importar proveedores',
          description: 'Usa «Nuevo Proveedor» para darlos de alta uno a uno, o «Importar Excel» para cargarlos en lote. ¿No tienes el archivo? Descarga la plantilla con «Plantilla» y rellénala.',
        },
      },

      // ── MATERIALES ───────────────────────────────────────────────────────────
      {
        element: '[data-tour="nav-materiales"]',
        popover: {
          title: 'Maestro de Materiales (nuevo)',
          description: 'El catálogo de materiales: código, descripción, categoría, unidad y fabricante/modelo. Es la base para clasificar por código y rastrear el último proveedor.',
        },
        onNextClick: async () => { setView('materiales'); await wait(); d.moveNext() },
        onPrevClick: async () => { setView('proveedores'); await wait(); d.movePrev() },
      },
      {
        element: '[data-tour="mat-acciones"]',
        popover: {
          title: 'Crear o importar materiales',
          description: 'Igual que proveedores: créalos a mano con «Nuevo Material», cárgalos en lote con «Importar Excel», o usa «Plantilla» para el formato. Además, se agregan solos al cargar SOLPEDs (te lo muestro enseguida).',
        },
      },

      // ── SOLPED ───────────────────────────────────────────────────────────────
      {
        element: '[data-tour="nav-solped"]',
        popover: {
          title: 'Procesamiento SOLPED',
          description: 'El corazón del flujo: cargar el Excel del cliente, clasificar los materiales por categoría y exportar.',
        },
        onNextClick: async () => { setView('solped'); await wait(); d.moveNext() },
        onPrevClick: async () => { setView('materiales'); await wait(); d.movePrev() },
      },
      {
        element: '[data-tour="solped-upload"]',
        popover: {
          title: 'Cargar un Documento Solped',
          description: 'Arrastra aquí el Excel del cliente. Detectamos las columnas solas y clasificamos cada material por categoría.',
        },
      },
      {
        popover: {
          title: 'Alta automática de materiales nuevos',
          description: 'Al cargar una SOLPED, el sistema detecta los códigos que aún no están en el catálogo y te abre una ventana para revisarlos: puedes editar sus datos (descripción, categoría, unidad y fabricante), desmarcar los que no quieras guardar, o pulsar «No volver a proponer» para que no reaparezcan. La SOLPED no trae proveedor, por eso se usa el fabricante como dato de origen.',
        },
      },
      {
        element: '[data-tour="solped-docs"]',
        popover: {
          title: 'Tus documentos guardados',
          description: 'Cada Excel cargado queda aquí. Ábrelo para revisar, corregir categorías o exportarlo y volver a importarlo con tus correcciones.',
        },
      },

      // ── ÓRDENES ──────────────────────────────────────────────────────────────
      {
        element: '[data-tour="nav-ordenes"]',
        popover: {
          title: 'Órdenes de Compra',
          description: 'Aquí armas la orden: datos de tu empresa, del proveedor y las líneas a comprar. Al emitir OCs el ERP autoalimenta el catálogo (categoría por código y «Proveedor último pedido»).',
        },
        onNextClick: async () => { setView('ordenes'); await wait(); d.moveNext() },
        onPrevClick: async () => { setView('solped'); await wait(); d.movePrev() },
      },
      {
        element: '[data-tour="oc-proveedor"]',
        popover: {
          title: 'Autorrellenar el proveedor',
          description: 'Pulsa «Seleccionar proveedor» y elige uno del maestro: el ERP rellena solo su RUC, razón social, dirección, teléfono, contacto y email. Puedes ajustar cualquier dato antes de generar el documento.',
        },
      },

      {
        element: '[data-tour="help-btn"]',
        popover: {
          title: '¿Repetir el tutorial?',
          description: 'Vuelve a abrir esta guía cuando quieras desde este botón.',
        },
      },
    ],
  })

  // Arranca en el Dashboard para que los primeros pasos tengan su elemento visible.
  setView('dashboard')
  setTimeout(() => d.drive(), 80)
}
