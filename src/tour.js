// ══════════════════════════════════════════════════════════════════════════════
//  Tour guiado (onboarding) — Driver.js
// ══════════════════════════════════════════════════════════════════════════════
//  Recorrido manual que se lanza desde el botón "?" de la barra superior. Resalta
//  los puntos clave del flujo y, donde hace falta, cambia de vista (setView) entre
//  pasos. Las anclas son atributos data-tour="..." repartidos por la app.
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
          description: 'Te muestro el flujo principal en un minuto. Avanza con «Siguiente» o sal con Esc.',
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
      {
        element: '[data-tour="nav-solped"]',
        popover: {
          title: 'Procesamiento SOLPED',
          description: 'El corazón del flujo: cargar el Excel del cliente, clasificar los materiales y exportar.',
        },
        onNextClick: async () => { setView('solped'); await wait(); d.moveNext() },
        onPrevClick: async () => { setView('dashboard'); await wait(); d.movePrev() },
      },
      {
        element: '[data-tour="solped-upload"]',
        popover: {
          title: 'Cargar un Documento Solped',
          description: 'Arrastra aquí el Excel del cliente. Detectamos las columnas solas y clasificamos cada material por categoría.',
        },
      },
      {
        element: '[data-tour="solped-docs"]',
        popover: {
          title: 'Tus documentos guardados',
          description: 'Cada Excel cargado queda aquí. Ábrelo para revisar, corregir categorías o exportarlo y volver a importarlo con tus correcciones.',
        },
      },
      {
        element: '[data-tour="nav-proveedores"]',
        popover: {
          title: 'Proveedores y Órdenes de Compra',
          description: 'Al emitir Órdenes de Compra el ERP autoalimenta el catálogo de materiales: categoría por código y la columna «Proveedor último pedido».',
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
