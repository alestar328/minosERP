---
name: sap-fiori-ux
description: Estándares de UI/UX y navegación SAP Fiori para Minos ERP (React + Vite, estilos inline). Úsalo SIEMPRE que crees o modifiques interfaz en este proyecto — pantallas, navegación, toolbars, tablas, formularios, modales, mensajes, estados vacíos, responsive. Garantiza floorplans consistentes (List Report / Object Page), navegación "atrás" correcta, shell bar global, tokens de diseño y patrones de acción/confirmación coherentes.
---

# SAP Fiori UX para Minos ERP

Minos ERP imita el look & feel de **SAP Fiori (tema Horizon/Quartz)** con React + Vite y **estilos inline** (no hay clases CSS ni librería de componentes). Este skill define los patrones a respetar para que toda la app se sienta como un único producto Fiori coherente.

Aplica estas reglas **antes de dar por terminada** cualquier tarea de UI. Si algo contradice estas guías, ajústalo o explícalo.

## 1. Tokens de diseño (única fuente de verdad)

Usa SIEMPRE el objeto `C` (definido en `src/App.jsx` y `src/Solped.jsx`); nunca hardcodees colores nuevos.

```js
C = {
  bg: '#F5F6F7',      // fondo de página
  card: '#FFFFFF',    // superficies / tarjetas / toolbars
  shell: '#354A5E',   // shell bar (Topbar) y marca lateral
  primary: '#0070F2', // acción principal / enlaces
  brand: '#0854A0',   // acentos de marca
  gold: '#E78C07', warn: '#E78C07',
  text: '#32363A', muted: '#6A6D70',
  border: '#E5E5E5', borderInput: '#BABABA',
  danger: '#BB0000', info: '#0070F2', success: '#188F3A',
}
```

- **Tipografía:** `'Inter, sans-serif'` en todo. Títulos 700, cuerpo 400, labels/acentos 600.
- **Radios:** botones/inputs 8, tarjetas/contenedores 12–14, chips 4–10.
- **Espaciado:** padding de página `10px 24px` (desktop) / `8–10px 14px` (móvil). Gaps 8–16.
- **Bordes:** `1px solid ${C.border}`; estados vacíos con `1px dashed`.
- **Responsive:** todos los componentes reciben `isMobile`; reduce paddings, oculta columnas/labels secundarias y colapsa acciones a iconos cuando `isMobile`.

## 2. Estructura de la app (shell)

- **Shell bar = `Topbar`** (global, fondo `C.shell`): marca, título de la vista activa, y acciones globales (Tutorial "?", vista móvil, notificaciones, usuario, salir). NO metas acciones de página aquí.
- **Navegación principal = `Sidebar`** (desktop) / `BottomNav` (móvil), dirigida por el estado `view` en `App.jsx` (`VIEWS`). Cambiar de módulo se hace aquí; **no** uses el sidebar como forma de "volver atrás" dentro de un módulo.
- Cada vista recibe `isMobile` (y props como `onOpenDocumento` / `focusDocId` cuando aplique).

## 3. Floorplans (los dos patrones que usamos)

### List Report (lista de objetos)
Pantalla de entrada de un módulo. Estructura de arriba a abajo:
1. **Toolbar** (fondo `C.card`, `borderBottom`): a la izquierda **título + contador**; a la derecha **acciones** (filtros/checkboxes y el botón **primario** al extremo derecho). Ej. real: pantalla SOLPED → "Documentos Solped {n}" + checkbox + botón "Subir Excel".
2. **Tabla a ancho completo** con cabecera sticky, acciones por fila (abrir / eliminar) y **estado vacío** explicativo (nunca una pantalla en blanco).
3. Soporta drag & drop cuando hay ingesta de archivos.

### Object Page (detalle de UN objeto)
Se abre al pulsar una fila de la lista. Estructura:
1. **Cabecera de objeto** con **botón Atrás (`ChevronLeft`)** a la izquierda + **título** (id del objeto) y subtítulo (contexto: cliente, archivo…). El botón Atrás devuelve a la List Report **sin** usar el sidebar.
2. Toolbar de acciones del objeto (Exportar, Eliminar, Columnas, etc.).
3. Contenido (tabla de líneas, secciones…).

## 4. Navegación "atrás" — REGLA CRÍTICA (UX)

**Toda Object Page (detalle abierto desde una lista) DEBE ofrecer una navegación Atrás/Up explícita** — un botón `ChevronLeft` en la cabecera de objeto — que devuelva a la lista de origen. El usuario **nunca** debería tener que ir a otra entrada del menú lateral para volver a la lista que estaba viendo.

- El botón Atrás resetea el estado de detalle y vuelve a la lista (ej.: `reset()` en `Solped.jsx` vuelve a la tabla de Documentos Solped).
- Si se llegó al detalle por enlace cruzado (p. ej. desde el Dashboard vía `onOpenDocumento`/`focusDocId`), Atrás vuelve a la lista del módulo; limpia cualquier "foco" pendiente (`navTo` limpia `solpedFocus`).
- En flujos de varios niveles, considera **breadcrumbs**; con un nivel, basta el `ChevronLeft` + título.

## 5. Acciones y botones

- **Una sola acción primaria por toolbar** (`background: C.primary`, texto blanco), al extremo derecho. El resto son secundarias (`background: C.card`, borde, texto `C.muted`/`C.brand`).
- Acciones **destructivas** en `C.danger` y **siempre con confirmación** (modal — ver §7). Nunca borres sin confirmar.
- En móvil, los botones secundarios colapsan a solo icono (`{isMobile ? '' : 'Etiqueta'}`).
- Estados de carga: botón con spinner `RefreshCw` (animación `spin`) + `disabled` + `opacity .7`.

## 6. Tablas

- Ancho completo, `borderCollapse`, cabecera **sticky** (`position: sticky; top: 0`) con fondo `C.card`.
- Celdas clave (id) en `C.primary`/600; si llevan a un detalle, hazlas **enlaces** (cursor pointer + subrayado) y navega al Object Page.
- Acciones por fila a la derecha (iconos: abrir `ArrowRight`, eliminar `Trash2`).
- **Estado vacío** obligatorio: icono tenue + título + ayuda breve.
- Oculta columnas secundarias en móvil.

## 7. Modales (diálogos)

Patrón consistente (ver `DetailDialog` en App.jsx y los modales de `Solped.jsx`):
- Overlay `rgba(50,54,58,0.5)`, `zIndex` alto, click fuera = cerrar; el contenido para la propagación (`stopPropagation`).
- Caja `C.card`, radio 12, `box-shadow` 0 12px 40px; en móvil ocupa pantalla completa.
- **Header**: título 700 + subtítulo `C.muted` + botón `X` para cerrar.
- **Footer**: acciones alineadas a la derecha; cancelar (secundario) + confirmar (primario o `danger`).

## 8. Mensajería (feedback)

- **Éxito**: banner verde efímero (icono `CheckCircle2`, fondo `${C.success}15`), auto-oculta a ~4s (patrón `flashAviso`).
- **Error**: banner rojo (`AlertCircle`, fondo `${C.danger}12`) bajo el toolbar; texto claro y accionable.
- Evita `alert()`/`confirm()` del navegador: usa banners y modales propios.

## 9. Checklist antes de terminar UI

- [ ] ¿Usa solo tokens de `C` y `Inter`? ¿Nada hardcodeado nuevo?
- [ ] ¿Es claramente una **List Report** o una **Object Page**? ¿Sigue su estructura?
- [ ] Si es detalle: ¿tiene **botón Atrás** que vuelve a la lista sin usar el sidebar?
- [ ] ¿Una sola acción primaria, a la derecha del toolbar?
- [ ] ¿Las acciones destructivas confirman con modal?
- [ ] ¿Tablas con cabecera sticky, acciones por fila y **estado vacío**?
- [ ] ¿Feedback de éxito/error con banners (no `alert`)?
- [ ] ¿Responsive (`isMobile`): paddings, columnas ocultas, botones a icono?
- [ ] ¿`npx vite build` pasa?

## Referencias de patrones en el código
- Shell: `Topbar`, `Sidebar`, `BottomNav`, `VIEWS`, `navTo` en `src/App.jsx`.
- List Report + Object Page + modales + banners + estado vacío: `src/Solped.jsx`.
- Drill-down/diálogo de detalle y enlace a Object Page: `DetailDialog` + columna `N°DOCSOL` (`onOpenDocumento`) en `src/App.jsx`.
