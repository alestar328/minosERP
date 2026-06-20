// ══════════════════════════════════════════════════════════════════════════════
//  Excel de Maestros — Proveedores y Materiales
// ══════════════════════════════════════════════════════════════════════════════
//  Define el formato de los dos documentos que el ERP sabe IMPORTAR a la base de
//  datos (Supabase):
//    · proveedores_data.xlsx → tabla `proveedores` (+ M:N `proveedor_categorias`)
//    · materiales_data.xlsx   → tabla `materiales`
//
//  Mismo patrón que `solpedExcel.js`: cabeceras canónicas + lectura tolerante.
//  Es un módulo PURO (solo depende de `xlsx`), de modo que lo usan por igual la
//  app (botones «Plantilla» / «Importar») y el script que genera los mock files
//  (scripts/generar-maestros-mock.mjs).
// ══════════════════════════════════════════════════════════════════════════════

import * as XLSX from 'xlsx'

// ── Cabeceras canónicas (el orden define el de las columnas en el Excel) ────────
export const PROV_COLUMNS = [
  'Razón Social',          // * obligatorio
  'RUC',                   // * 11 dígitos
  'Nombre Comercial',
  'Nombre Contacto',
  'Email Contacto',
  'Teléfono',
  'Dirección',
  'Categorías',            // * una o más, separadas por ;  (nombres exactos)
  'Estado Homologación',   // Pendiente | Condicional | Homologado | Rechazado
  'Notas',
  'Activo',                // Sí / No
]

export const MAT_COLUMNS = [
  'Código',                // * obligatorio (clave única / cruce con SOLPED)
  'Descripción',
  'Categoría',             // nombre exacto de categoría (o vacío)
  'Unidad',                // UN, KG, M, L, …
  'Fabricante',
  'Modelo',
  'Último Precio',
  'Moneda',                // USD | PEN | EUR …
]

const ESTADOS_HOMOLOGACION = ['Pendiente', 'Condicional', 'Homologado', 'Rechazado']

// ── Normalización de cabeceras: minúsculas, sin acentos, sin signos ─────────────
const norm = s => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const truthy = v => /^(s[ií]|si|yes|true|x|1|activo)$/i.test(String(v ?? '').trim())
// Separador de categorías: ';' (documentado), '|' o salto de línea. NO se usa '/'
// ni ',' porque hay nombres de categoría que los contienen (p.ej. "Eléctrico / E&I").
const splitCats = v => String(v ?? '').split(/[;|\n]/).map(s => s.trim()).filter(Boolean)
const numOrNull = v => {
  const n = parseFloat(String(v ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

// Localiza la fila de cabecera (la que más columnas canónicas reconoce) y devuelve
// { headerIdx, colIndex } donde colIndex mapea cabecera canónica → índice de columna.
function localizarCabecera(rows, columnas) {
  const objetivo = columnas.map(norm)
  let best = { idx: -1, hits: 0, map: {} }
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const celdas = (rows[i] || []).map(norm)
    const map = {}
    let hits = 0
    objetivo.forEach((o, c) => {
      const idx = celdas.findIndex(cell => cell === o)
      if (idx >= 0) { map[columnas[c]] = idx; hits++ }
    })
    if (hits > best.hits) best = { idx: i, hits, map }
  }
  return { headerIdx: best.idx, colIndex: best.map, hits: best.hits }
}

const cell = (row, idx) => idx == null ? '' : String(row[idx] ?? '').trim()

// ══════════════════════════════════════════════════════════════════════════════
//  GENERACIÓN de plantillas / mock
// ══════════════════════════════════════════════════════════════════════════════

// Construye un workbook con cabecera + filas. `filas` son objetos { cabecera: valor }.
function workbookDeFilas(columnas, filas, hojaNombre) {
  const aoa = [columnas, ...filas.map(f => columnas.map(c => f[c] ?? ''))]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = columnas.map(c => ({ wch: Math.max(12, Math.min(40, c.length + 6)) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, hojaNombre)
  return wb
}

export function workbookProveedores(filas = []) {
  return workbookDeFilas(PROV_COLUMNS, filas, 'Proveedores')
}
export function workbookMateriales(filas = []) {
  return workbookDeFilas(MAT_COLUMNS, filas, 'Materiales')
}

// Descarga una plantilla vacía (solo cabeceras) — usada por el botón «Plantilla».
export function descargarPlantillaProveedores() {
  XLSX.writeFile(workbookProveedores([]), 'proveedores_data.xlsx')
}
export function descargarPlantillaMateriales() {
  XLSX.writeFile(workbookMateriales([]), 'materiales_data.xlsx')
}

// ══════════════════════════════════════════════════════════════════════════════
//  PARSEO de un Excel cargado → objetos válidos + lista de errores por fila
// ══════════════════════════════════════════════════════════════════════════════

const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

// Proveedores. `categoriasValidas` = nombres exactos aceptados (de la BD).
export function parseProveedores(rows, categoriasValidas = []) {
  const validas = new Set(categoriasValidas)
  const { headerIdx, colIndex, hits } = localizarCabecera(rows, PROV_COLUMNS)
  if (headerIdx < 0 || hits < 2) {
    return { ok: [], errores: [{ fila: 0, msg: 'No se reconocieron las columnas del Excel de proveedores. Usa la plantilla.' }] }
  }
  const ok = [], errores = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || []
    if (!row.some(c => String(c ?? '').trim())) continue   // fila vacía
    const filaNum = i + 1
    const razonSocial = cell(row, colIndex['Razón Social'])
    const ruc         = cell(row, colIndex['RUC']).replace(/\D/g, '')
    const email       = cell(row, colIndex['Email Contacto'])
    const cats        = splitCats(cell(row, colIndex['Categorías']))
    const estadoRaw   = cell(row, colIndex['Estado Homologación'])

    const errs = []
    if (!razonSocial)               errs.push('Razón Social vacía')
    if (!/^\d{11}$/.test(ruc))      errs.push('RUC debe tener 11 dígitos')
    if (email && !emailOk(email))   errs.push('Email con formato inválido')
    const catsInvalidas = cats.filter(c => !validas.has(c))
    if (cats.length === 0)          errs.push('Sin categorías')
    else if (catsInvalidas.length)  errs.push('Categorías no reconocidas: ' + catsInvalidas.join(', '))
    if (errs.length) { errores.push({ fila: filaNum, msg: errs.join('; ') }); continue }

    const estado = ESTADOS_HOMOLOGACION.find(e => norm(e) === norm(estadoRaw)) || 'Pendiente'
    ok.push({
      razonSocial,
      ruc,
      nombreComercial:   cell(row, colIndex['Nombre Comercial']),
      contactoNombre:    cell(row, colIndex['Nombre Contacto']),
      contactoEmail:     email,
      contactoTelefono:  cell(row, colIndex['Teléfono']),
      direccion:         cell(row, colIndex['Dirección']),
      categorias:        cats.filter(c => validas.has(c)),
      estadoHomologacion: estado,
      notas:             cell(row, colIndex['Notas']),
      activo:            colIndex['Activo'] == null ? true : truthy(cell(row, colIndex['Activo']) || 'Sí'),
    })
  }
  return { ok, errores }
}

// Materiales. `categoriasValidas` opcional: una categoría no reconocida se ignora
// (queda sin clasificar), no invalida la fila.
export function parseMateriales(rows, categoriasValidas = []) {
  const validas = new Set(categoriasValidas)
  const { headerIdx, colIndex, hits } = localizarCabecera(rows, MAT_COLUMNS)
  if (headerIdx < 0 || hits < 1) {
    return { ok: [], errores: [{ fila: 0, msg: 'No se reconocieron las columnas del Excel de materiales. Usa la plantilla.' }] }
  }
  const ok = [], errores = [], vistos = new Set()
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || []
    if (!row.some(c => String(c ?? '').trim())) continue
    const filaNum = i + 1
    const codigo = cell(row, colIndex['Código'])
    if (!codigo) { errores.push({ fila: filaNum, msg: 'Código vacío' }); continue }
    const clave = codigo.toUpperCase()
    if (vistos.has(clave)) { errores.push({ fila: filaNum, msg: `Código duplicado en el archivo: ${codigo}` }); continue }
    vistos.add(clave)

    const catRaw   = cell(row, colIndex['Categoría'])
    const categoria = catRaw && validas.has(catRaw) ? catRaw : null
    const monedaRaw = cell(row, colIndex['Moneda']).toUpperCase().slice(0, 3)
    ok.push({
      codigo,
      descripcion:  cell(row, colIndex['Descripción']),
      categoria,                                   // nombre o null
      unidad:       cell(row, colIndex['Unidad']),
      fabricante:   cell(row, colIndex['Fabricante']),
      modelo:       cell(row, colIndex['Modelo']),
      ultimoPrecio: numOrNull(cell(row, colIndex['Último Precio'])),
      ultimaMoneda: monedaRaw || 'USD',
    })
  }
  return { ok, errores }
}

// ── Lectura de un File del navegador → filas crudas (array de arrays) ────────────
export function leerArchivoComoRows(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        resolve(XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }))
      } catch (err) { reject(err) }
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsArrayBuffer(file)
  })
}
