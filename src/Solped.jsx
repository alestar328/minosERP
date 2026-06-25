import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, RefreshCw, Search, AlertCircle, Pencil, ChevronDown, ChevronRight, ChevronLeft, X, ArrowRight, Table, LayoutGrid, Download, CheckCircle2, Trash2, ClipboardList } from 'lucide-react'
import SolpedAgrupado from './SolpedAgrupado.jsx'
import { listarDocumentos, cargarDocumento, guardarDocumento, actualizarCategoriaItem, categoriaPorCodigo, solpedIdDeItem, eliminarDocumento, generarSeleccion, agregarASeleccion, eliminarSeleccion, quitarItemDeSeleccion, seleccionesDeDocumento } from './solpedRepo.js'
import { codigosExistentes, codigosIgnorados, ignorarCodigos, importarMateriales } from './maestrosRepo.js'
import { exportarDocumentoExcel, esExcelERP, leerCorrecciones } from './solpedExcel.js'

const C = {
  bg: '#F5F6F7', card: '#FFFFFF', shell: '#354A5E',
  primary: '#0070F2', brand: '#0854A0',
  gold: '#E78C07', text: '#32363A', muted: '#6A6D70',
  border: '#E5E5E5', borderInput: '#BABABA',
  danger: '#BB0000', warn: '#E78C07', info: '#0070F2', success: '#188F3A',
}

// ── Category palette with classification rules ────────────────────────────────
export const CATEGORIAS_SOLPED = [
  {
    nombre: 'Servicios', bg: '#85B7EB', fg: '#0C447C',
    reglas: [
      { campo: 'textoBreve', tipo: 'startsWith', valores: ['SERV', 'CALI', 'REP/', 'CONT', 'FAB.'] },
      { campo: 'tipoPos',    tipo: 'equals',     valores: ['F'] },
    ],
  },
  {
    nombre: 'Repuestos', bg: '#F0997B', fg: '#993C1D',
    reglas: [
      { campo: 'textoBreve',    tipo: 'contains',    valores: ['REPUESTO','KIT','RODAMIENTO','SELLO','JUNTA','LINER','PLATO','CARRETE','POLEA','ROTOR','VENTILADOR','MANGUERA','NIPLE'] },
      { campo: 'grupoArticulos', tipo: 'startsWith', valores: ['29','12','15'] },
    ],
  },
  {
    nombre: 'EPP', bg: '#AFA9EC', fg: '#3C3489',
    reglas: [
      { campo: 'textoBreve',    tipo: 'contains',    valores: ['EPP','CASCO','LENTE','GUANTE','CHALECO','BOTAS','ARNÉS','ARNES','LÍNEA DE ANCLAJE','LINEA DE ANCLAJE','RESPIRADOR'] },
      { campo: 'grupoArticulos', tipo: 'startsWith', valores: ['34'] },
    ],
  },
  {
    nombre: 'Eléctrico / E&I', bg: '#5DCAA5', fg: '#085041',
    reglas: [
      { campo: 'textoBreve',    tipo: 'contains',    valores: ['AISLADOR','MOTOR','CONTACTOR','VARIADOR','CABLE','SENSOR','TRANSMISOR','VÁLVULA','VALVULA','DETECTOR','MÓDULO','MODULO','PLC','SWITCH'] },
      { campo: 'grupoArticulos', tipo: 'startsWith', valores: ['26','09'] },
    ],
  },
  {
    nombre: 'Reactivos', bg: '#97C459', fg: '#27500A',
    reglas: [
      { campo: 'textoBreve',    tipo: 'contains',    valores: ['REACTIVO','XANTATO','ESPUMANTE','FLOCULANTE','CAL ','ANTIINCRUSTANTE','QUIMICO','QUÍMICO','ÁCIDO','ACIDO','MCT','MDC'] },
      { campo: 'grupoArticulos', tipo: 'startsWith', valores: ['16'] },
    ],
  },
  {
    nombre: 'Lubricantes', bg: '#EF9F27', fg: '#633806',
    reglas: [
      { campo: 'textoBreve',    tipo: 'contains',    valores: ['LUBRICANTE','GRASA','ACEITE','OIL','GREASE'] },
      { campo: 'grupoArticulos', tipo: 'startsWith', valores: ['17'] },
    ],
  },
  {
    nombre: 'Explosivos', bg: '#F09595', fg: '#791F1F',
    reglas: [
      { campo: 'textoBreve',    tipo: 'contains',    valores: ['EXPLOSIVO','DETONANTE','CORDTEX','ANFO','EMULSIÓN','EMULSION'] },
      { campo: 'grupoArticulos', tipo: 'startsWith', valores: ['11'] },
    ],
  },
  {
    nombre: 'Construcción', bg: '#888780', fg: '#f0efe8',
    reglas: [
      { campo: 'textoBreve', tipo: 'contains', valores: ['TUBERÍA','TUBERIA','HDPE','CONCRETO','CEMENTO','ACERO','ESTRUCTURA','SALA ELÉCTRICA','SALA ELECTRICA'] },
    ],
  },
  {
    nombre: 'Metalmecánica', bg: '#6E8CA0', fg: '#1B3A4B',
    reglas: [
      { campo: 'textoBreve', tipo: 'contains', valores: ['PERNO','TUERCA','ARANDELA','TORNILLO','PLANCHA','PLATINA','ANGULO','ÁNGULO','VIGA','BARRA','EJE','BOCINA','ELECTRODO','SOLDADURA','MAESTRANZA','MECANIZADO','ESPARRAGO','ESPÁRRAGO'] },
    ],
  },
  {
    nombre: 'Ferretería', bg: '#C8A45C', fg: '#5A3D0E',
    reglas: [
      { campo: 'textoBreve', tipo: 'contains', valores: ['FERRETERIA','FERRETERÍA','CLAVO','ALAMBRE','CANDADO','BISAGRA','SILICONA','PEGAMENTO','LIJA','BROCA','DISCO DE CORTE','CINTA AISLANTE','WAIPE','ESCOBA','CADENA','GRILLETE','TEFLON','TEFLÓN'] },
    ],
  },
  {
    nombre: 'Merchandising', bg: '#E08AC0', fg: '#6E1B52',
    reglas: [
      { campo: 'textoBreve', tipo: 'contains', valores: ['MERCHANDISING','POLO','GORRA','LLAVERO','TOMATODO','LAPICERO','AGENDA','SOUVENIR','BANNER','GIGANTOGRAFIA','GIGANTOGRAFÍA','STICKER','TAZA','MUG'] },
    ],
  },
  { nombre: 'Otros', bg: '#D3D1C7', fg: '#444441', reglas: [] },
  // Categoría vacía: SOLPEDs que conceptualmente no tienen categoría (sin clasificar).
  // Es el destino por defecto de clasificarItem cuando ninguna regla coincide.
  { nombre: 'No categoria', bg: '#000000', fg: '#FFFFFF', reglas: [] },
]

// Sinónimos de la celda «Grupo / Familia» → categoría del ERP. Cuando el cliente
// escribe TEXTO en esa columna (no un código numérico), intentamos calzarlo con
// las categorías guardadas. Las claves son nombres EXACTOS de CATEGORIAS_SOLPED.
const SINONIMOS_GRUPO = {
  'Servicios':       ['servicio', 'servicios', 'mantenimiento', 'contrata', 'contratista'],
  'Repuestos':       ['repuesto', 'repuestos', 'spare', 'spares', 'rodamiento', 'sello mecanico', 'componente mecanico'],
  'EPP':             ['epp', 'ppe', 'proteccion personal', 'implemento de seguridad', 'seguridad industrial'],
  'Eléctrico / E&I': ['electrico', 'electrica', 'e i', 'instrumentacion', 'instrumento', 'electronica', 'automatizacion'],
  'Reactivos':       ['reactivo', 'reactivos', 'quimico', 'quimicos', 'insumo quimico', 'reagente', 'reagent'],
  'Lubricantes':     ['lubricante', 'lubricantes', 'lubricacion', 'grasa', 'aceite', 'lubricant'],
  'Explosivos':      ['explosivo', 'explosivos', 'voladura', 'blasting'],
  'Construcción':    ['construccion', 'obra civil', 'civil', 'estructura', 'tuberia'],
  'Metalmecánica':   ['metalmecanica', 'metal mecanica', 'maestranza', 'mecanizado', 'fabricacion metalica'],
  'Ferretería':      ['ferreteria', 'ferreteria industrial', 'hardware'],
  'Merchandising':   ['merchandising', 'publicidad', 'marketing', 'souvenir', 'articulos promocionales'],
  'Otros':           ['varios', 'miscelaneo', 'miscelaneos'],
}

// Mapea el texto de la celda Grupo/Familia a una categoría por nombre o sinónimo.
// Devuelve null si la celda está vacía o es puramente numérica (la resuelven las
// reglas de prefijo) o si no calza con ninguna categoría.
function categoriaPorGrupoTexto(grupo) {
  const g = norm(grupo)
  if (!g || /^[0-9]+$/.test(g)) return null
  for (const cat of CATEGORIAS_SOLPED) {
    if (norm(cat.nombre) === g) return cat.nombre          // nombre de categoría exacto
  }
  for (const [nombre, alias] of Object.entries(SINONIMOS_GRUPO)) {
    if (alias.some(a => g.includes(norm(a)))) return nombre  // sinónimo contenido
  }
  return null
}

/**
 * Classifies a SOLPED item into a category.
 * Pure function — applies rules in declaration order; first match wins.
 * (1) Si la celda Grupo/Familia trae texto, intenta calzarla con las categorías
 *     guardadas del ERP por nombre/sinónimos. (2) Reglas deterministas (prefijo
 *     numérico de grupo + texto de descripción). Fallback "No categoria".
 */
export function clasificarItem(item, categorias = CATEGORIAS_SOLPED) {
  const textoBreve = (item.textoBreve || '').toUpperCase()
  const grupo      = (item.grupoArticulos || '').toString()
  const tipoPos    = (item.tipoPos || '').toString()

  const porGrupo = categoriaPorGrupoTexto(grupo)
  if (porGrupo) return porGrupo

  for (const cat of categorias) {
    if (cat.reglas.length === 0) continue
    for (const regla of cat.reglas) {
      let valor
      if (regla.campo === 'textoBreve')    valor = textoBreve
      else if (regla.campo === 'grupoArticulos') valor = grupo
      else if (regla.campo === 'tipoPos')  valor = tipoPos
      else continue

      if (regla.tipo === 'startsWith' && regla.valores.some(v => valor.startsWith(v.toUpperCase()))) return cat.nombre
      if (regla.tipo === 'contains'   && regla.valores.some(v => valor.includes(v.toUpperCase())))   return cat.nombre
      if (regla.tipo === 'equals'     && regla.valores.some(v => valor === v))                        return cat.nombre
    }
  }
  return 'No categoria'
}

// ── Ingesta determinista: mapeo de columnas heterogéneas (sin IA) ─────────────
// Cada cliente manda su Excel con cabeceras/orden distintos. Mapeamos sus columnas
// a nuestros campos canónicos con: (1) diccionario de sinónimos + distancia de
// edición, y (2) plantillas guardadas por cliente. Todo local y explicable.

// Campos canónicos del sistema. obligatorio ⇒ sin él no se puede importar.
// `label` = el MISMO texto que la cabecera de la columna donde aterriza el dato en
// la tabla del SOLPED (coherencia mapeo ↔ tabla). Donde la columna es derivada o
// combinada se indica entre paréntesis (Texto pedido → Fabricante/Modelo;
// Fecha → Urgencia).
// El ORDEN de esta lista = el orden de las columnas en la tabla del SOLPED
// (izquierda→derecha; los subcampos van justo tras su columna principal).
const CAMPOS = [
  { campo: 'solped',          label: 'SOLPED',               obligatorio: false },
  { campo: 'posicion',        label: 'Posición',             obligatorio: false },
  { campo: 'textoBreve',      label: 'Descripción',          obligatorio: true  },
  { campo: 'codigoMaterial',  label: 'Código',               obligatorio: false },
  { campo: 'textoPedido',     label: 'Fabricante / Modelo',  obligatorio: false },
  { campo: 'grupoArticulos',  label: 'Grupo / familia',      obligatorio: false },
  { campo: 'cantidad',        label: 'Cant.',                obligatorio: false },
  { campo: 'unidad',          label: 'Unidad',               obligatorio: false },
  { campo: 'valorTotal',      label: 'Valor',                obligatorio: false },
  { campo: 'moneda',          label: 'Moneda',               obligatorio: false },
  { campo: 'fechaLiberacion', label: 'Urgencia (fecha)',     obligatorio: false },
  { campo: 'solicitante',     label: 'Solicitante',          obligatorio: false },
  { campo: 'areaNecesidad',   label: 'Área',                 obligatorio: false },
]

// Sinónimos de cabecera por campo (ya normalizados: minúsculas, sin tildes).
const ALIAS = {
  textoBreve:      ['descripcion', 'descripcion del material', 'texto breve', 'detalle', 'denominacion', 'material', 'glosa', 'item descripcion', 'description', 'material description', 'desc'],
  textoPedido:     ['texto pedido de compra en material', 'texto pedido de compra', 'texto de pedido de compra', 'texto pedido compra', 'texto pedido', 'po material text', 'purchase order material text', 'caracteristicas del material', 'especificacion tecnica', 'especificacion del material'],
  grupoArticulos:  ['grupo articulos', 'grupo de articulos', 'familia', 'grupo', 'rubro', 'clase', 'commodity group', 'commodity', 'material group', 'grupo material', 'linea'],
  codigoMaterial:  ['codigo', 'codigo material', 'cod material', 'cod sap', 'codigo sap', 'sku', 'nro parte', 'numero de parte', 'part number', 'material code', 'codigo de material'],
  cantidad:        ['cantidad', 'cant', 'qty', 'quantity', 'volumen', 'cantidad solicitada'],
  unidad:          ['unidad', 'um', 'u m', 'uom', 'unidad de medida', 'medida', 'unit'],
  valorTotal:      ['valor total', 'valor', 'importe', 'monto', 'net value', 'precio total', 'valor neto', 'importe total', 'total'],
  moneda:          ['moneda', 'divisa', 'currency', 'mon'],
  solped:          ['solped', 'n solped', 'numero solped', 'orden de compra', 'oc', 'orden', 'pedido', 'purchase order', 'po', 'requisition'],
  posicion:        ['posicion', 'pos', 'item', 'linea', 'line', 'line item', 'renglon'],
  solicitante:     ['solicitante', 'requested by', 'solicitado por', 'usuario', 'requester', 'pedido por'],
  areaNecesidad:   ['area', 'area necesidad', 'area de necesidad', 'centro', 'planta', 'ubicacion', 'destino', 'cost center', 'centro de costo'],
  fechaLiberacion: ['fecha', 'fecha liberacion', 'fecha de liberacion', 'need date', 'fecha requerida', 'fecha necesidad', 'fecha entrega'],
}

const UMBRAL = 0.78
const HOY_REF = new Date() // fecha de referencia para la urgencia (hoy)

const norm = s => (s ?? '').toString().toLowerCase()
  .normalize('NFD').replace(/\p{Diacritic}/gu, '')   // quita tildes
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

// Distancia de Levenshtein normalizada (1 = idénticas). 100% determinista.
function similitud(a, b) {
  if (!a || !b) return 0
  if (a === b) return 1
  const m = a.length, n = b.length
  const prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    let diag = prev[0]; prev[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return 1 - prev[n] / Math.max(m, n)
}

// Qué tan bien una cabecera coincide con los alias de un campo (0..1).
function scoreCampo(headerNorm, campo) {
  if (!headerNorm) return 0
  let best = 0
  for (const a of ALIAS[campo] || []) {
    if (headerNorm === a) return 1
    if (headerNorm.includes(a) || a.includes(headerNorm)) best = Math.max(best, 0.9)
    best = Math.max(best, similitud(headerNorm, a))
  }
  return best
}

// La cabecera real puede no ser la fila 0 (logos/títulos). Elegimos, entre las
// primeras 15 filas, la que más columnas reconoce contra el diccionario.
function detectarCabecera(rows) {
  let mejor = { idx: 0, hits: -1 }
  const lim = Math.min(15, rows.length)
  for (let i = 0; i < lim; i++) {
    const celdas = (rows[i] || []).map(norm).filter(Boolean)
    if (celdas.length < 2) continue
    const hits = celdas.filter(c => CAMPOS.some(({ campo }) => scoreCampo(c, campo) >= UMBRAL)).length
    if (hits > mejor.hits) mejor = { idx: i, hits }
  }
  return mejor.idx
}

// Auto-asigna cada campo a la mejor columna por encima del umbral (sin repetir
// columna; los conflictos se resuelven por mayor score).
function autoMapear(headerRow) {
  const headers = headerRow.map(norm)
  const cands = []
  CAMPOS.forEach(({ campo }) => headers.forEach((h, idx) => {
    const score = scoreCampo(h, campo)
    if (score >= UMBRAL) cands.push({ campo, idx, score })
  }))
  cands.sort((a, b) => b.score - a.score)
  const mapping = {}, usados = new Set()
  for (const { campo, idx } of cands) {
    if (mapping[campo] !== undefined || usados.has(idx)) continue
    mapping[campo] = idx; usados.add(idx)
  }
  return mapping
}

// ── Normalización de valores ──────────────────────────────────────────────────
const UM_ALIAS = { UND: 'UN', UNIDAD: 'UN', UNID: 'UN', EA: 'UN', PZA: 'UN', PZ: 'UN', PCS: 'UN', PC: 'UN', KILOS: 'KG', KILO: 'KG', KGS: 'KG', LT: 'L', LTS: 'L', LITRO: 'L', LITROS: 'L', GLN: 'GL', MTS: 'M', METRO: 'M', METROS: 'M', ROL: 'TRO' }
const normUnidad = v => { const u = (v ?? '').toString().trim().toUpperCase(); return UM_ALIAS[u] || u }
const normMoneda = v => { const m = (v ?? '').toString().trim().toUpperCase(); if (['USD', 'US$', '$', 'DOLARES', 'DOLAR', 'DÓLARES'].includes(m)) return 'USD'; if (['PEN', 'S/', 'SOLES', 'SOL', 'S/.'].includes(m)) return 'PEN'; return m || 'USD' }

// Números con formato PE/ES ("1.234,56") o US ("1,234.56").
function parseNum(v) {
  if (typeof v === 'number') return v
  let s = (v ?? '').toString().trim().replace(/[^\d.,-]/g, '')
  if (!s) return 0
  const c = s.includes(','), d = s.includes('.')
  if (c && d) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  else if (c) s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '')
  return Number(s) || 0
}

function diasDesdeFecha(str) {
  const m = (str ?? '').toString().trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (!m) return 0
  const y = m[3].length === 2 ? '20' + m[3] : m[3]
  const dt = new Date(Number(y), Number(m[2]) - 1, Number(m[1]))
  if (isNaN(dt)) return 0
  const diff = Math.round((HOY_REF - dt) / 86400000)
  return diff > 0 ? diff : 0
}

// ── Tokenización fabricante / modelo ──────────────────────────────────────────
// El cliente describe el material en una sola celda con pares «ETIQUETA: valor»,
// p.ej.: "FABRICANTE: ENVERTEC NUMERO DE PARTE: 3105 ESTANDAR: ... MATERIAL: ...".
// Extraemos FABRICANTE y MODELO (o N° de parte) recortando el valor de cada
// etiqueta hasta la siguiente etiqueta conocida o un ';'. 100% determinista; más
// adelante, con catálogo de proveedores/fabricantes, esto se resolverá automático.
const LABELS_PEDIDO = [
  'FABRICANTE', 'MARCA',
  'MODELO',
  'NUMERO DE PARTE', 'NÚMERO DE PARTE', 'NRO DE PARTE', 'N° DE PARTE', 'NUMERO PARTE', 'PART NUMBER', 'P/N',
  'ESTANDAR', 'ESTÁNDAR', 'NORMA',
  'MATERIAL', 'DIMENSIONES', 'LONGITUD', 'ALTURA', 'DIAMETRO', 'DIÁMETRO', 'PESO', 'COLOR', 'CAPACIDAD',
  'ROSCAS DE SUJECCION', 'ROSCAS',
  'TENSION NOMINAL', 'TENSIÓN NOMINAL', 'TENSION MAXIMA', 'TENSIÓN MÁXIMA', 'TENSION', 'TENSIÓN',
  'UTILIZACION', 'UTILIZACIÓN', 'USO',
]
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const STOP_PEDIDO = LABELS_PEDIDO.map(escRe).join('|')

// Devuelve el valor de la primera `claves` encontrada dentro del texto (o '').
function valorEtiqueta(texto, claves) {
  const T = (texto ?? '').toString()
  if (!T) return ''
  for (const clave of claves) {
    const re = new RegExp(`(?:^|[\\s;,])${escRe(clave)}\\s*[:\\-]\\s*(.+?)\\s*(?=(?:${STOP_PEDIDO})\\s*[:\\-]|;|$)`, 'i')
    const m = T.match(re)
    if (m && m[1].trim()) return m[1].trim()
  }
  return ''
}

// Tokeniza fabricante y modelo del «Texto pedido de compra». MODELO prevalece
// sobre N° de parte cuando ambos están presentes.
export function tokenizarFabricanteModelo(texto) {
  return {
    fabricante: valorEtiqueta(texto, ['FABRICANTE', 'MARCA']),
    modelo:     valorEtiqueta(texto, ['MODELO', 'NUMERO DE PARTE', 'NÚMERO DE PARTE', 'NRO DE PARTE', 'N° DE PARTE', 'NUMERO PARTE', 'PART NUMBER', 'P/N']),
  }
}

// Construye los items finales: aplica el mapeo, normaliza y clasifica.
function construirItems(rows, headerIdx, mapping) {
  const get = (row, campo) => mapping[campo] !== undefined ? row[mapping[campo]] : ''
  const items = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || []
    const desc = (get(row, 'textoBreve') ?? '').toString().trim()
    if (!desc) continue // fila sin descripción ⇒ vacía/separadora, se ignora
    const textoPedido = (get(row, 'textoPedido') ?? '').toString().trim()
    const { fabricante, modelo } = tokenizarFabricanteModelo(textoPedido)
    const item = {
      id:              crypto.randomUUID(),
      solped:          (get(row, 'solped') ?? '').toString().trim() || `—`,
      posicion:        (get(row, 'posicion') ?? '').toString().trim() || String(items.length + 1),
      codigoMaterial:  (get(row, 'codigoMaterial') ?? '').toString().trim(),
      textoBreve:      desc,
      textoPedido,
      fabricante,
      modelo,
      especificacion:  '',
      cantidad:        parseNum(get(row, 'cantidad')),
      unidad:          normUnidad(get(row, 'unidad')),
      tipoPos:         '',
      solicitante:     (get(row, 'solicitante') ?? '').toString().trim(),
      valorTotal:      parseNum(get(row, 'valorTotal')),
      moneda:          normMoneda(get(row, 'moneda')),
      fechaLiberacion: (get(row, 'fechaLiberacion') ?? '').toString().trim(),
      diasDesde:       diasDesdeFecha(get(row, 'fechaLiberacion')),
      grupoPlanif:     '',
      areaNecesidad:   (get(row, 'areaNecesidad') ?? '').toString().trim(),
      grupoArticulos:  (get(row, 'grupoArticulos') ?? '').toString().trim(),
      categoriaManual: false,
    }
    item.categoria = clasificarItem(item)
    items.push(item)
  }
  return items
}

// «Huella» del formato = cabeceras normalizadas y ordenadas. Reconoce al cliente.
const huellaCabecera = headerRow => headerRow.map(norm).filter(Boolean).sort().join('|')

// Número del Documento Solped: el N° de SOLPED más frecuente entre sus filas
// (un documento = una solped). Si las filas no lo traen, usa el nombre del archivo.
function numeroSolpedDe(items, fileName) {
  const freq = new Map()
  for (const it of items) {
    const n = (it.solped || '').trim()
    if (n && n !== '—') freq.set(n, (freq.get(n) || 0) + 1)
  }
  let best = null, bestC = 0
  for (const [n, c] of freq) if (c > bestC) { best = n; bestC = c }
  return best || (fileName || 'SOLPED').replace(/\.[^.]+$/, '').slice(0, 60)
}

const MAP_KEY = 'minprocure_solped_plantillas'
const cargarPlantillas = () => { try { return JSON.parse(localStorage.getItem(MAP_KEY)) || [] } catch { return [] } }
const guardarPlantilla = p => {
  const all = cargarPlantillas().filter(x => x.huella !== p.huella)
  try { localStorage.setItem(MAP_KEY, JSON.stringify([p, ...all].slice(0, 50))) } catch { /* almacenamiento no disponible */ }
}
const eliminarPlantilla = huella => {
  const all = cargarPlantillas().filter(x => x.huella !== huella)
  try { localStorage.setItem(MAP_KEY, JSON.stringify(all)) } catch { /* almacenamiento no disponible */ }
}

// ── MOCK desactivado para pruebas con Excel reales (borrar más adelante) ──────
// Excels de ejemplo «desordenados» y datos de muestra; el socio prueba cargando
// sus propios .xlsx. Conservamos los literales comentados como referencia.
// const DEMO_CLIENTE_A = [
//   ['ORDEN DE COMPRA — CÍA. MINERA CERRO VERDE', '', '', '', '', '', '', '', '', ''],
//   ['Generado el 02/06/2025 · Unidad Cerro Verde', '', '', '', '', '', '', '', '', ''],
//   ['Item', 'Cód. SAP', 'Descripción del Material', 'Cant.', 'U.M.', 'Familia', 'Precio Total', 'Mon.', 'Solicitante', 'Centro'],
//   ['10', 'M-2341', 'RODAMIENTO SKF 23040 CC/W33 C3', '4', 'UND', '29001', '4,800.00', 'USD', 'JLOPEZ', 'Planta Concentradora'],
//   ['20', 'X-0001', 'ANFO PESADO 94/6 PARA VOLADURA SUBTERRANEA', '120', 'TM', '11001', '98,400.00', 'USD', 'PGUERRERO', 'Mina'],
//   ['30', 'S-0234', 'CASCO MINERO 3M H700 BLANCO TIPO I', '50', 'UND', '34005', '1,750.00', 'USD', 'HSALAS', 'Seguridad'],
//   ['40', 'Q-0045', 'XANTATO ISOPROPILICO AEROPHINE 3418A', '2000', 'KG', '16020', '9,800.00', 'USD', 'PCASAS', 'Procesamiento'],
//   ['50', 'L-0012', 'GRASA MOLYKOTE BR2 PLUS 180KG', '5', 'BLD', '17001', '2,250.00', 'USD', 'JLOPEZ', 'Planta'],
// ]
// const DEMO_CLIENTE_B = [
//   ['Line', 'Part Number', 'Qty', 'UOM', 'Material Description', 'Commodity Group', 'Net Value', 'Currency', 'Requested By', 'Need Date'],
//   ['1', 'E-0099', '2', 'EA', 'VARIADOR DE FRECUENCIA ABB ACS880 55KW', '26010', '18600', 'USD', 'FSORIA', '10/03/2025'],
//   ['2', 'R-0055', '6', 'KIT', 'KIT SELLO MECANICO BOMBA WARMAN 6/4 AH', '15020', '12150', 'PEN', 'JLOPEZ', '25/04/2025'],
//   ['3', 'C-0078', '30', 'ROL', 'TUBERIA HDPE DN200 PN10 x 6m', '28003', '6750', 'USD', 'MQUISPE', '18/04/2025'],
//   ['4', '', '1', 'GL', 'SERV MANTTO PREVENTIVO BOMBA WARMAN 6/4', '', '12500', 'USD', 'RMENDOZA', '15/03/2025'],
//   ['5', 'E-0204', '12', 'UN', 'CABLE NYY 3x16mm2 0.6/1KV', '26002', '3480', 'USD', 'FSORIA', '12/04/2025'],
// ]

// ── Sample data ───────────────────────────────────────────────────────────────
// const RAW_SAMPLES = [
//   { solped:'10050131', posicion:'10', codigoMaterial:'M-2341',  textoBreve:'RODAMIENTO SKF 23040 CC/W33 C3',                  especificacion:'',                                              cantidad:4,    unidad:'UN',  tipoPos:'L', solicitante:'JLOPEZ',    valorTotal:4800,  moneda:'USD', fechaLiberacion:'01/04/2025', diasDesde:75,  grupoPlanif:'Mantenimiento', areaNecesidad:'Planta Concentradora', grupoArticulos:'29001', grupoCompras:'GC01' },
//   { solped:'10050132', posicion:'10', codigoMaterial:'',        textoBreve:'SERV MANTTO PREVENTIVO BOMBA WARMAN 6/4',          especificacion:'Servicio de mantenimiento preventivo trimestral', cantidad:1,    unidad:'GL',  tipoPos:'F', solicitante:'RMENDOZA', valorTotal:12500, moneda:'USD', fechaLiberacion:'15/03/2025', diasDesde:92,  grupoPlanif:'Servicios',     areaNecesidad:'Mina',                 grupoArticulos:'',      grupoCompras:'GC02' },
//   { solped:'10050133', posicion:'10', codigoMaterial:'Q-0045',  textoBreve:'XANTATO ISOPROPILICO AEROPHINE 3418A',             especificacion:'',                                              cantidad:2000, unidad:'KG',  tipoPos:'L', solicitante:'PCASAS',    valorTotal:9800,  moneda:'USD', fechaLiberacion:'20/04/2025', diasDesde:28,  grupoPlanif:'Reactivos',     areaNecesidad:'Procesamiento Mineral',grupoArticulos:'16020', grupoCompras:'GC03' },
//   { solped:'10050134', posicion:'10', codigoMaterial:'E-0099',  textoBreve:'VARIADOR DE FRECUENCIA ABB ACS880 55KW',           especificacion:'',                                              cantidad:2,    unidad:'UN',  tipoPos:'L', solicitante:'FSORIA',    valorTotal:18600, moneda:'USD', fechaLiberacion:'10/03/2025', diasDesde:97,  grupoPlanif:'Eléctrico',     areaNecesidad:'Infraestructura',       grupoArticulos:'26010', grupoCompras:'GC01' },
//   { solped:'10050135', posicion:'10', codigoMaterial:'L-0012',  textoBreve:'GRASA MOLYKOTE BR2 PLUS 180KG',                   especificacion:'',                                              cantidad:5,    unidad:'BL',  tipoPos:'L', solicitante:'JLOPEZ',    valorTotal:2250,  moneda:'USD', fechaLiberacion:'05/05/2025', diasDesde:12,  grupoPlanif:'Lubricación',   areaNecesidad:'Planta Concentradora', grupoArticulos:'17001', grupoCompras:'GC01' },
//   { solped:'10050136', posicion:'10', codigoMaterial:'S-0234',  textoBreve:'CASCO MINERO 3M H700 BLANCO TIPO I CLASE E',      especificacion:'',                                              cantidad:50,   unidad:'UN',  tipoPos:'L', solicitante:'HSALAS',    valorTotal:1750,  moneda:'USD', fechaLiberacion:'22/04/2025', diasDesde:36,  grupoPlanif:'Seguridad',     areaNecesidad:'Seguridad y Salud',    grupoArticulos:'34005', grupoCompras:'GC04' },
//   { solped:'10050137', posicion:'10', codigoMaterial:'X-0001',  textoBreve:'ANFO PESADO 94/6 PARA VOLADURA SUBTERRANEA',       especificacion:'Suministro de ANFO pesado campaña Q2 2025',     cantidad:120,  unidad:'TM',  tipoPos:'L', solicitante:'PGUERRERO', valorTotal:98400, moneda:'USD', fechaLiberacion:'01/03/2025', diasDesde:106, grupoPlanif:'Explosivos',    areaNecesidad:'Mina',                 grupoArticulos:'11001', grupoCompras:'GC05' },
//   { solped:'10050138', posicion:'10', codigoMaterial:'C-0078',  textoBreve:'TUBERIA HDPE DN200 PN10 x 6m',                    especificacion:'',                                              cantidad:30,   unidad:'TRO', tipoPos:'L', solicitante:'MQUISPE',   valorTotal:6750,  moneda:'USD', fechaLiberacion:'18/04/2025', diasDesde:40,  grupoPlanif:'Construcción',  areaNecesidad:'Infraestructura',       grupoArticulos:'28003', grupoCompras:'GC01' },
//   { solped:'10050139', posicion:'10', codigoMaterial:'R-0055',  textoBreve:'KIT SELLO MECANICO BOMBA WARMAN 6/4 AH',           especificacion:'',                                              cantidad:6,    unidad:'KIT', tipoPos:'L', solicitante:'JLOPEZ',    valorTotal:12150, moneda:'PEN', fechaLiberacion:'25/04/2025', diasDesde:33,  grupoPlanif:'Mantenimiento', areaNecesidad:'Planta Concentradora', grupoArticulos:'15020', grupoCompras:'GC01' },
//   { solped:'10050140', posicion:'10', codigoMaterial:'',        textoBreve:'CALI INSTRUMENTOS DE MEDICION PLANTA PROCESO',     especificacion:'Calibración de instrumentos plan anual 2025',   cantidad:1,    unidad:'SV',  tipoPos:'F', solicitante:'FSORIA',    valorTotal:8200,  moneda:'USD', fechaLiberacion:'12/04/2025', diasDesde:46,  grupoPlanif:'Servicios',     areaNecesidad:'Procesamiento Mineral',grupoArticulos:'',      grupoCompras:'GC02' },
// ]

// ── Utilities ─────────────────────────────────────────────────────────────────
const TC_PEN_USD  = 3.75
const toUSD       = (val, mon) => mon === 'PEN' ? val / TC_PEN_USD : val
const fmtMoney    = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
const catInfo     = n => CATEGORIAS_SOLPED.find(c => c.nombre === n) ?? CATEGORIAS_SOLPED.at(-1)
const urgColor    = d => d <= 30 ? C.primary : d <= 60 ? C.warn : C.danger
const urgLabel    = d => d <= 30 ? 'Normal'  : d <= 60 ? 'Atención' : 'Urgente'

// ── Inline category editor ────────────────────────────────────────────────────
// Uses position:fixed so the dropdown doesn't get clipped by the scrollable table.
function CatBadge({ item, onEdit }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top: 0, left: 0 })
  const btnRef  = useRef(null)
  const dropRef = useRef(null)
  const cat = catInfo(item.categoria)

  const handleClick = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const close = e => {
      if (dropRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <>
      <button ref={btnRef} onClick={handleClick}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px 2px 7px', borderRadius: 3, background: cat.bg, color: cat.fg, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {item.categoria}
        {item.categoriaManual && <Pencil size={8} style={{ opacity: 0.75 }} />}
        <ChevronDown size={9} style={{ opacity: 0.65 }} />
      </button>

      {open && (
        <div ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 6, minWidth: 168, boxShadow: '0 8px 28px rgba(0,0,0,0.55)' }}>
          {CATEGORIAS_SOLPED.map(c => (
            <button key={c.nombre} onClick={() => { onEdit(item.id, c.nombre); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px', borderRadius: 4, background: item.categoria === c.nombre ? `${c.bg}30` : 'transparent', border: 'none', cursor: 'pointer' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: c.bg, flexShrink: 0 }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text }}>{c.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// ── Menú de cambio masivo de categoría ────────────────────────────────────────
// Usa position:fixed (igual que CatBadge) para no quedar recortado por el toolbar.
function BulkCatMenu({ count, onPick }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top: 0, left: 0 })
  const btnRef  = useRef(null)
  const dropRef = useRef(null)

  const handleClick = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const close = e => {
      if (dropRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <>
      <button ref={btnRef} onClick={handleClick}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, background: C.primary, color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        <Pencil size={12} /> Cambiar categoría
        <ChevronDown size={11} style={{ opacity: 0.8 }} />
      </button>

      {open && (
        <div ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 6, minWidth: 188, boxShadow: '0 8px 28px rgba(0,0,0,0.55)' }}>
          <div style={{ padding: '4px 10px 6px', fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mover {count} ítem{count !== 1 ? 's' : ''} a…
          </div>
          {CATEGORIAS_SOLPED.map(c => (
            <button key={c.nombre} onClick={() => { onPick(c.nombre); setOpen(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px', borderRadius: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: c.bg, flexShrink: 0 }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text }}>{c.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// ── Menú «Generar orden»: nueva COD.SELECT.SOLPED o agregar a una existente ─────
function GenerarOrdenMenu({ generando, selecciones, onNueva, onAgregar }) {
  const [open, setOpen] = useState(false)
  const [pos,  setPos]  = useState({ top: 0, left: 0 })
  const btnRef  = useRef(null)
  const dropRef = useRef(null)

  const handleClick = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setOpen(v => !v)
  }
  useEffect(() => {
    if (!open) return
    const close = e => {
      if (dropRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <>
      <button ref={btnRef} onClick={handleClick} disabled={generando}
        title="Agrupa las filas seleccionadas en una COD.SELECT.SOLPED (nueva o existente)"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, background: generando ? C.border : C.brand, color: '#fff', border: 'none', cursor: generando ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
        {generando
          ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generando…</>
          : <><ClipboardList size={12} /> Generar orden <ChevronDown size={11} style={{ opacity: 0.8 }} /></>}
      </button>

      {open && (
        <div ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 6, minWidth: 232, maxWidth: 300, boxShadow: '0 8px 28px rgba(0,0,0,0.35)' }}>
          <button onClick={() => { onNueva(); setOpen(false) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <ClipboardList size={13} style={{ color: C.brand, flexShrink: 0 }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text, fontWeight: 600 }}>Nueva COD.SELECT.SOLPED</span>
          </button>
          {selecciones.length > 0 && (
            <>
              <div style={{ borderTop: `1px solid ${C.border}`, margin: '6px 0' }} />
              <div style={{ padding: '2px 10px 6px', fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Agregar a una existente
              </div>
              <div style={{ maxHeight: 220, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {selecciones.map(s => (
                  <button key={s.id} onClick={() => { onAgregar(s); setOpen(false) }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', padding: '6px 10px', borderRadius: 4, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.brand, fontWeight: 700 }}>{s.codigo}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted }}>
                      {s.items.length} ítem{s.items.length !== 1 ? 's' : ''}{s.etiqueta ? ` · ${s.etiqueta}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

// ── Vista «Tratadas»: agrupaciones COD.SELECT.SOLPED del documento + eliminar ───
function TratadasView({ selecciones, isMobile, onEliminar, onQuitarItem }) {
  const [confirmId, setConfirmId] = useState(null)

  if (!selecciones.length) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <CheckCircle2 size={30} style={{ color: C.border, marginBottom: 10 }} />
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Aún no hay agrupaciones</div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          Selecciona filas en «Tabla» y pulsa «Generar orden» para crear una COD.SELECT.SOLPED. Aquí verás cada agrupación con sus ítems y podrás eliminarla (sus líneas volverán a «sin tratar»).
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '12px 4px' : 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {selecciones.map(s => (
        <div key={s.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', background: C.card }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: `${C.brand}0a`, borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: C.brand }}>{s.codigo}</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>
              {s.items.length} ítem{s.items.length !== 1 ? 's' : ''}{s.etiqueta ? ` · ${s.etiqueta}` : ''}{s.createdAt ? ` · ${fmtFechaCarga(s.createdAt)}` : ''}
            </span>
            <div style={{ marginLeft: 'auto' }}>
              {confirmId === s.id ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.danger }}>¿Eliminar?</span>
                  <button onClick={() => { onEliminar(s); setConfirmId(null) }}
                    style={{ padding: '4px 10px', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, background: C.danger, color: '#fff', border: 'none', cursor: 'pointer' }}>Sí, eliminar</button>
                  <button onClick={() => setConfirmId(null)}
                    style={{ padding: '4px 10px', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: 11, background: C.card, color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer' }}>Cancelar</button>
                </span>
              ) : (
                <button onClick={() => setConfirmId(s.id)} title="Eliminar esta agrupación COD.SELECT.SOLPED"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: 11, background: C.card, color: C.danger, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
                  <Trash2 size={12} /> {isMobile ? '' : 'Eliminar'}
                </button>
              )}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
            <tbody>
              {s.items.map((it, i) => (
                <tr key={it.id} style={{ borderTop: i ? `1px solid ${C.border}40` : 'none' }}>
                  <td style={{ padding: '7px 14px', color: C.text }}>
                    <div style={{ fontWeight: 500 }}>{it.descripcion || '—'}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>
                      {[it.codigo, it.fabricante, it.modelo].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '7px 14px', textAlign: 'right', whiteSpace: 'nowrap', color: C.text }}>
                    {(Number(it.cantidad) || 0).toLocaleString('es-PE')} <span style={{ fontSize: 10, color: C.muted }}>{it.unidad}</span>
                  </td>
                  <td style={{ padding: '7px 12px 7px 0', textAlign: 'right', width: 36 }}>
                    <button onClick={() => onQuitarItem(s, it)} title="Quitar este ítem de la agrupación (vuelve a «sin tratar»)"
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 5, borderRadius: 6, background: 'transparent', color: C.danger, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
                      <X size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

// ── Summary card (dashboard por categoría desactivado a pedido) ───────────────
// Reactivar junto con el bloque que lo renderiza en la vista de tabla y el `summary`.
// function SummaryCard({ nombre, count, valorUSD, active, onClick }) {
//   const info = catInfo(nombre)
//   return (
//     <button onClick={onClick}
//       style={{ padding: '9px 13px', borderRadius: 8, background: active ? `${info.bg}25` : C.card, border: `1px solid ${active ? info.bg : C.border}`, cursor: 'pointer', textAlign: 'left', minWidth: 110, transition: 'border-color 0.1s, background 0.1s' }}>
//       <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
//         <span style={{ width: 8, height: 8, borderRadius: 2, background: info.bg, flexShrink: 0 }} />
//         <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, color: active ? info.bg : C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{nombre}</span>
//       </div>
//       <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 22, color: C.text, lineHeight: 1 }}>{count}</div>
//       <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, marginTop: 3 }}>US$ {fmtMoney(valorUSD)}</div>
//     </button>
//   )
// }

// ── Modal de confirmación de mapeo ────────────────────────────────────────────
function MapeoModal({ data, isMobile, onConfirm, onCancel }) {
  const { rows, headerIdx, headerRow, fileName } = data
  const [mapping, setMapping] = useState(data.mapping)
  const [cliente, setCliente] = useState(data.cliente || '')
  const ejemplo = rows[headerIdx + 1] || []
  const nCols  = headerRow.length
  const nDatos = rows.length - headerIdx - 1

  const setCampo = (campo, val) => setMapping(m => ({ ...m, [campo]: val === '' ? undefined : Number(val) }))
  const colTexto = idx => {
    const h = (headerRow[idx] ?? '').toString().trim() || `(col ${idx + 1})`
    const s = (ejemplo[idx] ?? '').toString().trim()
    return s ? `${h} — ej: ${s.length > 22 ? s.slice(0, 22) + '…' : s}` : h
  }
  const falta = CAMPOS.some(c => c.obligatorio && mapping[c.campo] === undefined)

  const overlay = isMobile
    ? { position: 'fixed', inset: 0, zIndex: 90, background: C.bg, display: 'flex', flexDirection: 'column', overflow: 'auto' }
    : { position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(50,54,58,0.55)', padding: 20 }
  const box = isMobile
    ? { background: C.card, display: 'flex', flexDirection: 'column', flex: 1 }
    : { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 'min(580px, 94vw)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.22)' }

  return (
    <div style={overlay} onClick={isMobile ? undefined : onCancel}>
      <div style={box} onClick={e => e.stopPropagation()}>
        <div style={{ padding: isMobile ? '16px 16px 12px' : '20px 24px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 16, color: C.text }}>Confirmar mapeo de columnas</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, marginTop: 3 }}>
              {fileName ? `${fileName} · ` : ''}cabecera detectada en la fila {headerIdx + 1} · {nDatos} fila{nDatos !== 1 ? 's' : ''} de datos
            </div>
            {data.cliente && (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.brand, marginTop: 5, background: `${C.brand}10`, border: `1px solid ${C.brand}30`, borderRadius: 6, padding: '5px 9px', display: 'inline-block' }}>
                Formato reconocido de <b>{data.cliente}</b> — revisa o ajusta el mapeo y guarda para actualizarlo.
              </div>
            )}
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} style={{ color: C.muted }} /></button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '14px 16px' : '16px 24px' }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, marginBottom: 14 }}>
            Asociamos cada columna del cliente a nuestros campos por similitud de nombres. Revisa y corrige si hace falta.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CAMPOS.map(c => (
              <div key={c.campo} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '190px 1fr', gap: 10, alignItems: 'center' }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ArrowRight size={12} style={{ color: mapping[c.campo] !== undefined ? C.success : C.border, flexShrink: 0 }} />
                  {c.label}{c.obligatorio && <span style={{ color: C.danger }}> *</span>}
                </div>
                <select value={mapping[c.campo] ?? ''} onChange={e => setCampo(c.campo, e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: C.bg, border: `1px solid ${c.obligatorio && mapping[c.campo] === undefined ? C.danger : C.border}`, color: C.text, outline: 'none' }}>
                  <option value="">— sin asignar —</option>
                  {Array.from({ length: nCols }, (_, idx) => <option key={idx} value={idx}>{colTexto(idx)}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>Nombre del cliente (para recordar este formato y aplicarlo automático la próxima vez)</label>
            <input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Ej: Cía. Minera Cerro Verde"
              style={{ width: '100%', marginTop: 5, padding: '8px 12px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: C.bg, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }} />
          </div>
        </div>

        <div style={{ padding: isMobile ? '12px 16px 20px' : '14px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 12, alignItems: 'center' }}>
          {falta && <span style={{ marginRight: 'auto', fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.danger }}>Falta asignar la descripción (*)</span>}
          <button onClick={onCancel} style={{ padding: '9px 18px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer' }}>Cancelar</button>
          <button disabled={falta} onClick={() => onConfirm(mapping, cliente)}
            style={{ padding: '9px 20px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, background: falta ? C.border : C.primary, color: falta ? C.muted : '#fff', border: 'none', cursor: falta ? 'not-allowed' : 'pointer' }}>
            Importar y clasificar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Lista de Documentos Solped ya cargados ────────────────────────────────────
const ESTADO_DOC = {
  'Pendiente':  { bg: '#E78C0722', fg: '#9A5B02' },
  'En proceso': { bg: '#0070F222', fg: '#0854A0' },
  'Procesada':  { bg: '#188F3A22', fg: '#0F6E2C' },
  'Rechazada':  { bg: '#BB000022', fg: '#8A0000' },
}
const fmtFechaCarga = iso => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d) ? '—' : d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}
// Fecha ISO 'yyyy-mm-dd' → 'dd/mm/yy' (subtítulo compacto de la última compra).
const isoCorta = iso => {
  if (!iso) return ''
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y.slice(2)}` : ''
}

function DocumentosLista({ docs, loading, onOpen, onDelete, isMobile }) {
  const [q, setQ] = useState('')
  if (loading) return (
    <div style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, textAlign: 'center' }}>
      Cargando documentos…
    </div>
  )
  if (!docs.length) return (
    <div data-tour="solped-docs" style={{ width: '100%', background: C.card, border: `1px dashed ${C.border}`, borderRadius: 14, padding: '32px 18px', textAlign: 'center' }}>
      <FileSpreadsheet size={22} style={{ color: C.muted, opacity: 0.6 }} />
      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: C.text, marginTop: 6 }}>Aún no hay Documentos Solped</div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginTop: 2 }}>Carga un Excel arriba y aparecerá aquí para abrirlo, revisarlo o exportarlo.</div>
    </div>
  )
  const lc = s => (s || '').toString().toLowerCase()
  const term = lc(q).trim()
  const filtrados = !term ? docs : docs.filter(d =>
    lc(d.numero).includes(term) ||
    lc(d.cliente).includes(term) ||
    lc(d.archivo).includes(term) ||
    (d.numeros || []).some(n => lc(n).includes(term))
  )
  return (
    <div data-tour="solped-docs" style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <FileSpreadsheet size={16} style={{ color: C.brand }} />
        <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13, color: C.text }}>Documentos Solped cargados</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>
          ({term ? `${filtrados.length} de ${docs.length}` : docs.length})
        </span>
        <div style={{ position: 'relative', marginLeft: 'auto', flex: isMobile ? '1 1 100%' : '0 1 280px' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por N° SOLPED, cliente o archivo…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '7px 30px 7px 30px', borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text, outline: 'none' }} />
          {q && (
            <button onClick={() => setQ('')} title="Limpiar búsqueda"
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', padding: 3, border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer' }}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      {filtrados.length === 0 ? (
        <div style={{ padding: '28px 18px', textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted }}>
          Ningún documento coincide con «{q}».
        </div>
      ) : isMobile ? (
        <div style={{ maxHeight: 420, overflow: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtrados.map(d => {
            const est = ESTADO_DOC[d.estado] || { bg: C.border, fg: C.muted }
            const Campo = ({ label, value, color }) => (
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: color || C.text, marginTop: 2 }}>{value}</div>
              </div>
            )
            return (
              <div key={d.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.card, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Cabecera: N° SOLPED + estado */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>N° SOLPED</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15, color: C.text, marginTop: 1 }}>{d.numero}</div>
                    {(d.numeros?.length || 0) > 1 && (
                      <div title={d.numeros.join(', ')} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.brand, fontWeight: 600, marginTop: 1 }}>
                        +{d.numeros.length - 1} N° SOLPED
                      </div>
                    )}
                    {d.archivo && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.archivo}</div>}
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 10, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, background: est.bg, color: est.fg, whiteSpace: 'nowrap', flexShrink: 0 }}>{d.estado}</span>
                </div>

                {/* Datos con labels internas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                  <Campo label="Cliente" value={d.cliente || '—'} />
                  <Campo label="Cargado" value={fmtFechaCarga(d.fechaCarga)} color={C.muted} />
                  <Campo label="Posiciones" value={d.totalPosiciones} />
                  <Campo label="Clasificación"
                    value={d.sinClasificar > 0 ? `${d.pctClasificado}% · ${d.sinClasificar} sin clasif.` : `${d.pctClasificado}%`}
                    color={d.sinClasificar ? C.warn : C.success} />
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                  <button onClick={() => onDelete(d)} title="Eliminar documento"
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, background: C.card, color: C.danger, border: `1px solid ${C.border}`, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600 }}>
                    <Trash2 size={14} /> Eliminar
                  </button>
                  <button onClick={() => onOpen(d.id)}
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 14px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, background: C.primary, color: '#fff', border: 'none', cursor: 'pointer' }}>
                    Abrir <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
      <div style={{ maxHeight: 320, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.bg, color: C.muted, textAlign: 'left' }}>
              <th style={{ padding: '8px 14px', fontWeight: 600, fontSize: 11 }}>N° SOLPED</th>
              {!isMobile && <th style={{ padding: '8px 14px', fontWeight: 600, fontSize: 11 }}>Cliente</th>}
              {!isMobile && <th style={{ padding: '8px 14px', fontWeight: 600, fontSize: 11 }}>Cargado</th>}
              <th style={{ padding: '8px 14px', fontWeight: 600, fontSize: 11, textAlign: 'center' }}>Posic.</th>
              <th style={{ padding: '8px 14px', fontWeight: 600, fontSize: 11, textAlign: 'center' }}>Clasific.</th>
              <th style={{ padding: '8px 14px', fontWeight: 600, fontSize: 11 }}>Estado</th>
              <th style={{ padding: '8px 14px' }} />
            </tr>
          </thead>
          <tbody>
            {filtrados.map(d => {
              const est = ESTADO_DOC[d.estado] || { bg: C.border, fg: C.muted }
              return (
                <tr key={d.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '9px 14px', fontWeight: 600, color: C.text }}>
                    {d.numero}
                    {(d.numeros?.length || 0) > 1 && (
                      <div title={`N° SOLPED en el documento:\n${d.numeros.join('\n')}`}
                        style={{ fontSize: 10, color: C.brand, fontWeight: 600, cursor: 'help' }}>
                        +{d.numeros.length - 1} N° SOLPED
                      </div>
                    )}
                    {d.archivo && <div style={{ fontSize: 10, color: C.muted, fontWeight: 400 }}>{d.archivo}</div>}
                  </td>
                  {!isMobile && <td style={{ padding: '9px 14px', color: C.text }}>{d.cliente}</td>}
                  {!isMobile && <td style={{ padding: '9px 14px', color: C.muted }}>{fmtFechaCarga(d.fechaCarga)}</td>}
                  <td style={{ padding: '9px 14px', textAlign: 'center', color: C.text }}>{d.totalPosiciones}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'center', color: d.sinClasificar ? C.warn : C.success, fontWeight: 600 }}>
                    {d.pctClasificado}%
                    {d.sinClasificar > 0 && <div style={{ fontSize: 10, color: C.warn, fontWeight: 400 }}>{d.sinClasificar} sin clasif.</div>}
                  </td>
                  <td style={{ padding: '9px 14px' }}>
                    <span style={{ padding: '2px 9px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: est.bg, color: est.fg }}>{d.estado}</span>
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => onDelete(d)} title="Eliminar documento"
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '5px 8px', borderRadius: 7, background: C.card, color: C.danger, border: `1px solid ${C.border}`, cursor: 'pointer', marginRight: 6 }}>
                      <Trash2 size={13} />
                    </button>
                    <button onClick={() => onOpen(d.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, background: C.primary, color: '#fff', border: 'none', cursor: 'pointer' }}>
                      Abrir <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}

// ── Modal: materiales nuevos detectados al cargar una SOLPED ──────────────────
// Lista los códigos que aún no existen en el catálogo `materiales`. El usuario
// edita los datos, desmarca los que no quiere y confirma el alta. La SOLPED no
// trae proveedor: el dato relevante de origen es el FABRICANTE (cuando viene).
function MaterialesNuevosModal({ items, isMobile, saving, onClose, onConfirm, onIgnoreAll }) {
  const [rows, setRows] = useState(() => items.map(it => ({ ...it, incluir: true })))
  const set = (i, k, v) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, [k]: v } : r))
  const toggle = i => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, incluir: !r.incluir } : r))
  const incluidos = rows.filter(r => r.incluir)
  // Confirmar: agrega los marcados y recuerda (ignora) los desmarcados.
  const confirmar = () => onConfirm(
    incluidos.map(({ incluir, ...rest }) => rest),
    rows.filter(r => !r.incluir).map(r => (r.codigo || '').trim()).filter(Boolean),
  )

  const catOpts = CATEGORIAS_SOLPED.map(c => c.nombre).filter(n => n !== 'No categoria')
  const fld = { fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text, background: C.card, border: `1px solid ${C.borderInput}`, borderRadius: 6, padding: '6px 8px', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl = { fontFamily: 'Inter, sans-serif', fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 3, display: 'block' }

  const campos = (r, i) => (
    <>
      <div>
        <span style={lbl}>Código</span>
        <input value={r.codigo} onChange={e => set(i, 'codigo', e.target.value)} style={fld} />
      </div>
      <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 2' }}>
        <span style={lbl}>Descripción</span>
        <input value={r.descripcion} onChange={e => set(i, 'descripcion', e.target.value)} style={fld} />
      </div>
      <div>
        <span style={lbl}>Categoría</span>
        <select value={r.categoria} onChange={e => set(i, 'categoria', e.target.value)} style={{ ...fld, cursor: 'pointer' }}>
          <option value="">— Sin clasificar —</option>
          {catOpts.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <span style={lbl}>Unidad</span>
        <input value={r.unidad} onChange={e => set(i, 'unidad', e.target.value)} style={fld} placeholder="UN, KG…" />
      </div>
      <div>
        <span style={lbl}>Fabricante</span>
        <input value={r.fabricante} onChange={e => set(i, 'fabricante', e.target.value)} style={fld} />
      </div>
      <div>
        <span style={lbl}>Modelo</span>
        <input value={r.modelo} onChange={e => set(i, 'modelo', e.target.value)} style={fld} />
      </div>
    </>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(50,54,58,0.5)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: isMobile ? 0 : 12, width: isMobile ? '100%' : 'min(880px, 96vw)', maxHeight: isMobile ? '100%' : '90vh', boxShadow: '0 12px 40px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: isMobile ? '16px 16px 12px' : '20px 24px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${C.info}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ClipboardList size={18} style={{ color: C.info }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15, color: C.text }}>Materiales nuevos detectados</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
              {items.length} código{items.length !== 1 ? 's' : ''} de esta SOLPED no está{items.length !== 1 ? 'n' : ''} en el catálogo. Edita lo que quieras y desmarca los que no debas guardar. La SOLPED no trae proveedor; se usa el <b style={{ color: C.text }}>fabricante</b> como dato de origen.
            </div>
          </div>
          <button onClick={onClose} title="Cerrar (volver a preguntar luego)" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><X size={18} style={{ color: C.muted }} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 14 : '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ border: `1px solid ${r.incluir ? C.border : `${C.border}`}`, borderRadius: 10, padding: isMobile ? 12 : 14, background: r.incluir ? C.card : C.bg, opacity: r.incluir ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                  <input type="checkbox" checked={r.incluir} onChange={() => toggle(i)} style={{ width: 16, height: 16, accentColor: C.primary, cursor: 'pointer' }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: r.incluir ? C.primary : C.muted }}>
                    {r.incluir ? 'Se agregará' : 'Omitido'}
                  </span>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10 }}>
                {campos(r, i)}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: isMobile ? '12px 16px' : '14px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted }}>{incluidos.length} de {rows.length} seleccionado{incluidos.length !== 1 ? 's' : ''}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={onIgnoreAll} disabled={saving} title="No proponer estos códigos en futuras cargas"
              style={{ padding: '9px 16px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: C.card, color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>No volver a proponer</button>
            <button onClick={confirmar} disabled={saving || incluidos.length === 0}
              style={{ padding: '9px 20px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, background: C.primary, color: '#fff', border: 'none', cursor: incluidos.length ? 'pointer' : 'not-allowed', opacity: (saving || incluidos.length === 0) ? 0.6 : 1 }}>
              {saving ? 'Guardando…' : `Agregar ${incluidos.length} al catálogo`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main SOLPED component ─────────────────────────────────────────────────────
// ── Columnas de la tabla SOLPED (desktop) ───────────────────────────────────────
// El orden es el de la tabla. `w` = ancho inicial (px), `min` = ancho mínimo al
// redimensionar (tipo Excel, solo desktop). `mobile` = visible en la vista móvil.
const COLS_SOLPED = [
  { key: 'check',  label: '',                  w: 38,  min: 38,  mobile: true,  resize: false, align: 'center' },
  { key: 'solped', label: 'SOLPED',            w: 112, min: 70,  mobile: false },
  { key: 'desc',   label: 'Descripción',       w: 300, min: 140, mobile: true  },
  { key: 'fab',    label: 'Fabricante',        w: 120, min: 70,  mobile: false, title: 'Fabricante tokenizado del «Texto pedido de compra»' },
  { key: 'modelo', label: 'Modelo / N° parte', w: 130, min: 70,  mobile: false, title: 'Modelo / N° de parte tokenizado del «Texto pedido de compra»' },
  { key: 'cat',    label: 'Categoría',         w: 148, min: 90,  mobile: true  },
  { key: 'cant',   label: 'Cant.',             w: 90,  min: 56,  mobile: true  },
  { key: 'valor',  label: 'Valor',             w: 118, min: 70,  mobile: false },
  { key: 'urg',    label: 'Urgencia',          w: 90,  min: 56,  mobile: true  },
  { key: 'solic',  label: 'Solicitante',       w: 108, min: 70,  mobile: false },
  { key: 'area',   label: 'Área',              w: 130, min: 70,  mobile: false },
  { key: 'prov',   label: 'Prov. últ. pedido', w: 150, min: 80,  mobile: false, title: 'Último proveedor al que se compró este material (lo calcula el ERP por código)' },
]
const COLW_LS_KEY = 'minprocure_solped_colw'

export default function Solped({ isMobile = false, focusDocId = null }) {
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [filename,  setFilename]  = useState(null)
  const [search,    setSearch]    = useState('')
  const [filtroCats,setFiltroCats]= useState([])
  const [filtroUrg, setFiltroUrg] = useState('todos')
  const [selected,  setSelected]  = useState(new Set())
  const [mapeo,     setMapeo]     = useState(null)   // confirmación de mapeo pendiente
  const [vista,     setVista]     = useState('tabla') // 'tabla' | 'agrupado'
  const [documentos,  setDocumentos]  = useState([])   // Documentos Solped persistidos
  const [docsLoading, setDocsLoading] = useState(true)
  const [docActivo,   setDocActivo]   = useState(null) // id de la solped abierta
  const [saving,      setSaving]      = useState(false)
  const [aviso,       setAviso]       = useState(null) // confirmación efímera (verde)
  const [confirmarEliminar, setConfirmarEliminar] = useState(null) // { id, numero } a borrar
  const [forzarMapeo, setForzarMapeo] = useState(true)   // mostrar el popup aunque el formato esté guardado (por defecto activo)
  const [plantillas,  setPlantillas]  = useState([])     // formatos de columnas recordados
  const [verConfig,   setVerConfig]   = useState(false)  // modal de config. de columnas del documento abierto
  const [filtrosOpen, setFiltrosOpen] = useState(false)  // móvil: panel «Filtros y resumen» plegable
  const [generando,   setGenerando]   = useState(false)  // generando COD.SELECT.SOLPED
  const [matNuevos,   setMatNuevos]   = useState(null)   // materiales nuevos por confirmar (modal)
  const [guardandoMat, setGuardandoMat] = useState(false)
  const [selecciones, setSelecciones] = useState([])     // agrupaciones COD.SELECT.SOLPED del doc abierto

  // Anchos de columna (desktop): redimensionables tipo Excel y persistidos.
  const [colW, setColW] = useState(() => {
    const def = COLS_SOLPED.map(c => c.w)
    try {
      const saved = JSON.parse(localStorage.getItem(COLW_LS_KEY) || 'null')
      if (Array.isArray(saved) && saved.length === def.length)
        return saved.map((w, i) => Math.max(COLS_SOLPED[i].min, Number(w) || def[i]))
    } catch { /* sin anchos guardados */ }
    return def
  })
  // Arrastre del borde derecho de una cabecera para cambiar el ancho.
  const startResize = (idx, e) => {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX, startW = colW[idx], min = COLS_SOLPED[idx].min
    const onMove = ev => {
      const next = Math.max(min, startW + (ev.clientX - startX))
      setColW(prev => { const n = [...prev]; n[idx] = next; return n })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''; document.body.style.userSelect = ''
      setColW(prev => { try { localStorage.setItem(COLW_LS_KEY, JSON.stringify(prev)) } catch { /* sin persistencia */ } return prev })
    }
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const loaded = items.length > 0
  const fileInputRef = useRef(null)

  const refrescarPlantillas = () => setPlantillas(cargarPlantillas())

  const flashAviso = msg => { setAviso(msg); setTimeout(() => setAviso(a => a === msg ? null : a), 4000) }

  // Refresca la lista de Documentos Solped desde Supabase.
  const refrescarDocumentos = () =>
    listarDocumentos().then(setDocumentos).catch(e => setError(e.message)).finally(() => setDocsLoading(false))

  // Refresca las agrupaciones COD.SELECT.SOLPED del documento abierto (líneas "tratadas").
  const refrescarSelecciones = (id = docActivo) => {
    if (!id) { setSelecciones([]); return Promise.resolve() }
    return seleccionesDeDocumento(id).then(setSelecciones).catch(e => setError(e.message))
  }

  useEffect(() => { refrescarDocumentos() }, [])
  useEffect(() => { refrescarPlantillas() }, [])

  // Abre el documento solicitado desde el dashboard (enlace del N°DOCSOL).
  useEffect(() => {
    if (focusDocId?.id) abrirDocumento(focusDocId.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDocId?.n])

  // Aplica un mapeo (auto o confirmado), persiste el documento y lo abre.
  const aplicarMapeo = async (rows, headerIdx, mapping, fileName, cliente) => {
    const parsed = construirItems(rows, headerIdx, mapping)
    if (parsed.length === 0) { setError('No se encontraron filas con descripción de material.'); setMapeo(null); return }
    if (cliente?.trim()) { guardarPlantilla({ cliente: cliente.trim(), huella: huellaCabecera(rows[headerIdx]), mapping, headers: rows[headerIdx], fecha: new Date().toISOString().slice(0, 10) }); refrescarPlantillas() }
    setMapeo(null)
    // Herencia por catálogo: si el código ya existe en `materiales`, su categoría
    // (compras reales) prevalece sobre la clasificación por reglas/sinónimos.
    try {
      const catMap = await categoriaPorCodigo(parsed.map(p => p.codigoMaterial))
      for (const it of parsed) {
        const known = catMap.get((it.codigoMaterial || '').trim())
        if (known) it.categoria = known
      }
    } catch { /* catálogo no disponible: seguimos con la clasificación por reglas */ }
    const numero      = numeroSolpedDe(parsed, fileName)
    const solicitante = parsed.find(p => p.solicitante)?.solicitante || ''
    setSaving(true); setError(null)
    try {
      const id  = await guardarDocumento({ cliente: cliente || '', numero, archivo: fileName, solicitante, items: parsed })
      const doc = await cargarDocumento(id)   // recarga con ids reales de BD + reconciliación aplicada
      setItems(doc.items); setFilename(fileName); setDocActivo(id)
      setSelected(new Set()); setFiltroCats([]); setFiltroUrg('todos'); setSearch('')
      refrescarDocumentos(); refrescarSelecciones(id)
      await detectarMaterialesNuevos(parsed)   // propone alta de códigos aún no catalogados
    } catch (e) {
      setError('No se pudo guardar el documento: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // Detecta los códigos de la SOLPED que NO existen en el catálogo `materiales` y,
  // si hay alguno, abre el modal para que el usuario revise/edite/confirme su alta.
  const detectarMaterialesNuevos = async parsed => {
    try {
      const conCodigo = parsed.filter(p => (p.codigoMaterial || '').trim())
      if (!conCodigo.length) return
      const codigos = conCodigo.map(p => p.codigoMaterial)
      // Excluye lo ya catalogado y lo que el usuario marcó "no proponer".
      const [existentes, ignorados] = await Promise.all([codigosExistentes(codigos), codigosIgnorados(codigos)])
      const vistos = new Set()
      const nuevos = []
      for (const p of conCodigo) {
        const cod = p.codigoMaterial.trim()
        if (existentes.has(cod) || ignorados.has(cod) || vistos.has(cod.toUpperCase())) continue
        vistos.add(cod.toUpperCase())
        nuevos.push({
          codigo:      cod,
          descripcion: p.textoBreve || '',
          categoria:   (p.categoria && p.categoria !== 'No categoria') ? p.categoria : '',
          unidad:      p.unidad || '',
          fabricante:  p.fabricante || '',
          modelo:      p.modelo || '',
        })
      }
      if (nuevos.length) setMatNuevos(nuevos)
    } catch { /* catálogo no disponible: no bloquea la carga de la SOLPED */ }
  }

  // Da de alta los materiales confirmados (editados) y RECUERDA los desmarcados
  // (omitidos) para no volver a proponerlos en futuras recargas.
  const guardarMaterialesNuevos = async (incluidos, omitidos = []) => {
    setGuardandoMat(true); setError(null)
    try {
      const res = incluidos.length ? await importarMateriales(incluidos) : { creados: 0, actualizados: 0, errores: [] }
      if (omitidos.length) await ignorarCodigos(omitidos)
      setMatNuevos(null)
      const extra = res.actualizados ? `, ${res.actualizados} actualizado${res.actualizados !== 1 ? 's' : ''}` : ''
      const omit = omitidos.length ? ` · ${omitidos.length} no se volverá${omitidos.length !== 1 ? 'n' : ''} a proponer` : ''
      flashAviso(`${res.creados} material${res.creados !== 1 ? 'es' : ''} agregado${res.creados !== 1 ? 's' : ''} al catálogo${extra}${omit}.`)
      if (res.errores?.length) setError(`${res.errores.length} material(es) no se pudieron guardar.`)
    } catch (e) {
      setError('No se pudieron guardar los materiales: ' + e.message)
    } finally {
      setGuardandoMat(false)
    }
  }

  // "No volver a proponer": recuerda TODOS los códigos detectados y cierra.
  const ignorarTodosMateriales = async () => {
    const codigos = (matNuevos || []).map(m => m.codigo)
    setGuardandoMat(true); setError(null)
    try {
      await ignorarCodigos(codigos)
      setMatNuevos(null)
      flashAviso(`${codigos.length} material${codigos.length !== 1 ? 'es' : ''} no se volverá${codigos.length !== 1 ? 'n' : ''} a proponer.`)
    } catch (e) {
      setError('No se pudo guardar la preferencia: ' + e.message)
    } finally {
      setGuardandoMat(false)
    }
  }

  // Abre un Documento Solped ya persistido.
  const abrirDocumento = async id => {
    setSaving(true); setError(null)
    try {
      const doc = await cargarDocumento(id)
      setItems(doc.items); setFilename(doc.archivo || doc.numero); setDocActivo(id)
      setSelected(new Set()); setFiltroCats([]); setFiltroUrg('todos'); setSearch('')
      setVista('tabla'); refrescarSelecciones(id)
    } catch (e) {
      setError('No se pudo abrir el documento: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // Importa un Excel generado por el ERP: aplica las correcciones de categoría.
  const importarCorrecciones = async rows => {
    const correcciones = leerCorrecciones(rows, CATEGORIAS_SOLPED.map(c => c.nombre))
    if (!correcciones.length) {
      setError('El Excel del ERP no traía correcciones válidas en la columna "Categoría corregida".')
      return
    }
    setSaving(true); setError(null)
    try {
      for (const { id, categoria } of correcciones) await actualizarCategoriaItem(id, categoria)
      const targetId = docActivo || await solpedIdDeItem(correcciones[0].id)
      if (targetId) {
        const doc = await cargarDocumento(targetId)
        setItems(doc.items); setFilename(doc.archivo || doc.numero); setDocActivo(targetId)
        setSelected(new Set()); setFiltroCats([]); setFiltroUrg('todos'); setSearch('')
        refrescarSelecciones(targetId)
      }
      refrescarDocumentos()
      flashAviso(`${correcciones.length} corrección${correcciones.length !== 1 ? 'es' : ''} aplicada${correcciones.length !== 1 ? 's' : ''} desde el Excel.`)
    } catch (e) {
      setError('No se pudieron aplicar las correcciones: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // Elimina definitivamente el Documento Solped (tras confirmación).
  const ejecutarEliminar = async () => {
    const doc = confirmarEliminar
    if (!doc) return
    setConfirmarEliminar(null)
    setSaving(true); setError(null)
    try {
      await eliminarDocumento(doc.id)
      if (docActivo === doc.id) {   // estaba abierto → volver a la lista
        setItems([]); setFilename(null); setDocActivo(null); setSelecciones([]); setVista('tabla')
        setSelected(new Set()); setFiltroCats([]); setFiltroUrg('todos'); setSearch('')
      }
      refrescarDocumentos()
      flashAviso(`Documento ${doc.numero || ''} eliminado.`)
    } catch (e) {
      setError('No se pudo eliminar el documento: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // Exporta el documento abierto a Excel (procesado, con columna para corregir).
  const exportarExcel = () => {
    const meta = documentos.find(d => d.id === docActivo)
    exportarDocumentoExcel({ numero: meta?.numero || items[0]?.solped || filename, archivo: filename, items })
    flashAviso('Excel generado. Corrige la columna "Categoría corregida" y vuelve a cargarlo aquí.')
  }

  // Punto de entrada común: filas crudas → detecta cabecera → plantilla o modal.
  const ingestarRows = (rawRows, fileName) => {
    // El rango usado de la hoja (!ref) suele venir inflado con filas/celdas vacías
    // de formato. Las descartamos para que el conteo y la ingesta reflejen las
    // filas reales (no "datos inventados") antes de detectar cabecera.
    const rows = (rawRows || []).filter(r => (r || []).some(c => String(c ?? '').trim() !== ''))
    if (rows.length < 2) { setError('El archivo no tiene filas suficientes.'); return }
    if (esExcelERP(rows)) { importarCorrecciones(rows); return }  // round-trip: Excel del ERP
    const headerIdx = detectarCabecera(rows)
    const headerRow = rows[headerIdx] || []
    const plantilla = cargarPlantillas().find(p => p.huella === huellaCabecera(headerRow))
    // Formato conocido ⇒ automático, salvo que el usuario pida revisar el mapeo.
    if (plantilla && !forzarMapeo) { aplicarMapeo(rows, headerIdx, plantilla.mapping, fileName, plantilla.cliente); return }
    // Nuevo o forzado ⇒ abrir el popup, precargado con la plantilla si existe.
    setMapeo({ rows, headerIdx, headerRow, mapping: plantilla?.mapping || autoMapear(headerRow), fileName, cliente: plantilla?.cliente || '' })
  }

  const processFile = file => {
    setLoading(true); setError(null)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        if (!sheet) throw new Error('El archivo no contiene hojas de cálculo.')
        ingestarRows(XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }), file.name)
      } catch (err) {
        setError(err.message ?? 'Error desconocido.')
      } finally {
        setLoading(false)
      }
    }
    reader.onerror = () => { setError('No se pudo leer el archivo.'); setLoading(false) }
    reader.readAsArrayBuffer(file)
  }

  const reset = () => {
    setItems([]); setFilename(null); setError(null); setMapeo(null); setDocActivo(null); setSelecciones([]); setVista('tabla')
    setSelected(new Set()); setFiltroCats([]); setFiltroUrg('todos'); setSearch('')
    refrescarDocumentos()
  }

  const editCategoria = (id, newCat) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, categoria: newCat, categoriaManual: true } : it))
    // Persistir la corrección si el item viene de BD (documento abierto/guardado).
    if (docActivo) actualizarCategoriaItem(id, newCat).then(refrescarDocumentos).catch(e => setError(e.message))
  }

  // Cambio masivo de categoría: aplica `newCat` a todas las filas seleccionadas.
  const editCategoriaMasiva = newCat => {
    const ids = filtrada.filter(it => selected.has(it.id)).map(it => it.id)
    if (!ids.length) return
    const idSet = new Set(ids)
    setItems(prev => prev.map(it => idSet.has(it.id) ? { ...it, categoria: newCat, categoriaManual: true } : it))
    if (docActivo) {
      Promise.all(ids.map(id => actualizarCategoriaItem(id, newCat)))
        .then(refrescarDocumentos).catch(e => setError(e.message))
    }
    setSelected(new Set())
    flashAviso(`${ids.length} ítem${ids.length !== 1 ? 's' : ''} movido${ids.length !== 1 ? 's' : ''} a «${newCat}».`)
  }

  // Ids de las filas seleccionadas (solo de las "sin tratar" visibles).
  const idsSeleccionados = () => filtrada.filter(it => selected.has(it.id)).map(it => it.id)

  // «Generar orden» → NUEVA agrupación COD.SELECT.SOLPED con las filas marcadas.
  const generarOrden = async () => {
    const ids = idsSeleccionados()
    if (!ids.length) return
    if (!docActivo) { setError('Abre o guarda el documento antes de generar una orden.'); return }
    setGenerando(true); setError(null)
    try {
      const meta = documentos.find(d => d.id === docActivo)
      const { codigo, nItems } = await generarSeleccion({
        etiqueta:  meta?.numero || filename || '',
        clienteId: meta?.clienteId || null,
        itemIds:   ids,
      })
      setSelected(new Set())
      flashAviso(`Selección creada: ${codigo} (${nItems} ítem${nItems !== 1 ? 's' : ''}). Ver pestaña «Tratadas».`)
      await refrescarSelecciones()
    } catch (e) {
      setError('No se pudo generar la orden: ' + e.message)
    } finally {
      setGenerando(false)
    }
  }

  // Agrega las filas marcadas a una agrupación COD.SELECT.SOLPED existente.
  const agregarAOrden = async sel => {
    const ids = idsSeleccionados()
    if (!ids.length || !sel) return
    setGenerando(true); setError(null)
    try {
      const n = await agregarASeleccion(sel.id, ids)
      setSelected(new Set())
      flashAviso(n ? `${n} ítem${n !== 1 ? 's' : ''} agregado${n !== 1 ? 's' : ''} a ${sel.codigo}.` : `Esas líneas ya estaban en ${sel.codigo}.`)
      await refrescarSelecciones()
    } catch (e) {
      setError('No se pudo agregar a la agrupación: ' + e.message)
    } finally {
      setGenerando(false)
    }
  }

  // Elimina una agrupación COD.SELECT.SOLPED (sus líneas vuelven a «sin tratar»).
  const eliminarOrden = async sel => {
    setError(null)
    try {
      await eliminarSeleccion(sel.id)
      flashAviso(`Agrupación ${sel.codigo} eliminada.`)
      await refrescarSelecciones()
    } catch (e) {
      setError('No se pudo eliminar la agrupación: ' + e.message)
    }
  }

  // Quita un ítem de una agrupación (vuelve a «sin tratar»). Si era el último,
  // elimina la agrupación entera para no dejarla vacía.
  const quitarItemOrden = async (sel, item) => {
    setError(null)
    try {
      if ((sel.items || []).length <= 1) {
        await eliminarSeleccion(sel.id)
        flashAviso(`Agrupación ${sel.codigo} eliminada (se quitó su último ítem).`)
      } else {
        await quitarItemDeSeleccion(sel.id, item.id)
        flashAviso(`Ítem quitado de ${sel.codigo}.`)
      }
      await refrescarSelecciones()
    } catch (e) {
      setError('No se pudo quitar el ítem: ' + e.message)
    }
  }

  // ── Tratadas vs sin tratar ──────────────────────────────────────────────────
  // Las líneas que ya están en una agrupación COD.SELECT.SOLPED ("tratadas") se
  // sacan de la tabla principal y de la vista Agrupar; viven en la pestaña «Tratadas».
  const treatedIds = new Set(selecciones.flatMap(s => (s.items || []).map(i => i.id)))
  const sinTratar  = items.filter(it => !treatedIds.has(it.id))

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtrada = sinTratar.filter(it => {
    const q = search.toLowerCase()
    const mSearch = !q || it.textoBreve.toLowerCase().includes(q) || it.solped.includes(q) || it.solicitante.toLowerCase().includes(q)
    const mCat    = filtroCats.length === 0 || filtroCats.includes(it.categoria)
    const mUrg    = filtroUrg === 'todos' ||
      (filtroUrg === 'urgente'  && it.diasDesde > 60) ||
      (filtroUrg === 'atencion' && it.diasDesde > 30 && it.diasDesde <= 60) ||
      (filtroUrg === 'normal'   && it.diasDesde <= 30)
    return mSearch && mCat && mUrg
  })

  // ── Summary by category (dashboard de tarjetas desactivado a pedido) ────────
  // Reactivar junto con el bloque de SummaryCard en la vista de tabla.
  // const summary = CATEGORIAS_SOLPED
  //   .map(cat => ({
  //     nombre:   cat.nombre,
  //     count:    items.filter(it => it.categoria === cat.nombre).length,
  //     valorUSD: items.filter(it => it.categoria === cat.nombre).reduce((s, it) => s + toUSD(it.valorTotal, it.moneda), 0),
  //   }))
  //   .filter(s => s.count > 0)

  const totalUSD = items.reduce((s, it) => s + toUSD(it.valorTotal, it.moneda), 0)

  // ── Selection ─────────────────────────────────────────────────────────────
  const allSelected  = filtrada.length > 0 && filtrada.every(it => selected.has(it.id))
  const someSelected = filtrada.some(it => selected.has(it.id))

  const toggleAll = () => setSelected(prev => {
    const n = new Set(prev)
    if (allSelected) filtrada.forEach(it => n.delete(it.id))
    else filtrada.forEach(it => n.add(it.id))
    return n
  })
  const toggleOne = id => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const toggleCatFilter = cat =>
    setFiltroCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])

  const hasFilters = filtroCats.length > 0 || filtroUrg !== 'todos' || search

  const modalMapeo = mapeo && (
    <MapeoModal data={mapeo} isMobile={isMobile}
      onCancel={() => setMapeo(null)}
      onConfirm={(mapping, cliente) => aplicarMapeo(mapeo.rows, mapeo.headerIdx, mapping, mapeo.fileName, cliente)} />
  )

  const modalMaterialesNuevos = matNuevos && (
    <MaterialesNuevosModal items={matNuevos} isMobile={isMobile} saving={guardandoMat}
      onClose={() => setMatNuevos(null)}
      onIgnoreAll={ignorarTodosMateriales}
      onConfirm={guardarMaterialesNuevos} />
  )

  const avisoBanner = aviso && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 8, background: `${C.success}15`, border: `1px solid ${C.success}40`, maxWidth: 760, width: '100%', fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.success }}>
      <CheckCircle2 size={15} style={{ flexShrink: 0 }} /> {aviso}
    </div>
  )

  const modalConfirmar = confirmarEliminar && (
    <div onClick={() => setConfirmarEliminar(null)}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(50,54,58,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 'min(420px, 94vw)', boxShadow: '0 12px 40px rgba(0,0,0,0.22)', padding: 22 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${C.danger}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trash2 size={18} style={{ color: C.danger }} />
          </div>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15, color: C.text }}>Eliminar Documento Solped</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
              Se eliminará <b style={{ color: C.text }}>{confirmarEliminar.numero || 'el documento'}</b> y todas sus posiciones. Esta acción no se puede deshacer.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={() => setConfirmarEliminar(null)}
            style={{ padding: '8px 16px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: C.card, color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={ejecutarEliminar}
            style={{ padding: '8px 16px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, background: C.danger, color: '#fff', border: 'none', cursor: 'pointer' }}>Eliminar</button>
        </div>
      </div>
    </div>
  )

  const clienteActivo  = documentos.find(d => d.id === docActivo)?.cliente || ''
  const formatosCliente = plantillas.filter(p => (p.cliente || '').trim().toLowerCase() === clienteActivo.trim().toLowerCase() && clienteActivo)

  const modalConfig = verConfig && (
    <div onClick={() => setVerConfig(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(50,54,58,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 'min(540px, 94vw)', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.22)' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 16, color: C.text }}>Configuración de columnas</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, marginTop: 3 }}>Cliente: <b style={{ color: C.text }}>{clienteActivo || '—'}</b></div>
          </div>
          <button onClick={() => setVerConfig(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={18} style={{ color: C.muted }} /></button>
        </div>
        <div style={{ padding: '14px 22px 20px' }}>
          {formatosCliente.length === 0 ? (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
              No hay un formato de columnas guardado para este cliente. Se guardará la próxima vez que cargues un Excel suyo y confirmes el mapeo con su nombre.
            </div>
          ) : formatosCliente.map(p => (
            <div key={p.huella} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>Guardado {p.fecha || ''}</div>
                <button onClick={() => { eliminarPlantilla(p.huella); refrescarPlantillas() }} title="Olvidar este formato"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 7, background: C.card, color: C.danger, border: `1px solid ${C.border}`, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11 }}>
                  <Trash2 size={12} /> Olvidar formato
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {CAMPOS.filter(c => p.mapping?.[c.campo] !== undefined).map(c => {
                  const idx = p.mapping[c.campo]
                  const header = (p.headers?.[idx] ?? '').toString().trim()
                  return (
                    <div key={c.campo} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontFamily: 'Inter, sans-serif', fontSize: 12, borderBottom: `1px solid ${C.border}40`, padding: '3px 0' }}>
                      <span style={{ color: C.muted }}>{c.label}{c.obligatorio ? ' *' : ''}</span>
                      <span style={{ color: C.text, fontWeight: 600, textAlign: 'right' }}>{header || `Columna ${idx + 1}`}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
            Para reconfigurar: marca «Configurar columnas manualmente» en la pantalla de carga y vuelve a subir el Excel de este cliente.
          </div>
        </div>
      </div>
    </div>
  )

  if (!loaded) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden' }}>
      {modalMapeo}
      {modalMaterialesNuevos}
      {modalConfirmar}

      {/* ── Toolbar (SAP list report) ─────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '8px 14px' : '10px 24px', borderBottom: `1px solid ${C.border}`, background: C.card, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: C.text }}>
          Documentos Solped
          <span style={{ fontWeight: 400, fontSize: 12, color: C.muted, marginLeft: 8 }}>{documentos.length}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.text, whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={forzarMapeo} onChange={e => setForzarMapeo(e.target.checked)} style={{ accentColor: C.primary, cursor: 'pointer' }} />
            Configurar columnas manualmente
          </label>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]); e.target.value = '' }} />
          <button data-tour="solped-upload" onClick={() => fileInputRef.current?.click()} disabled={loading || saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, background: C.primary, color: '#fff', border: 'none', cursor: (loading || saving) ? 'default' : 'pointer', opacity: (loading || saving) ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            {(loading || saving)
              ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Procesando…</>
              : <><Upload size={13} /> Subir Excel</>}
          </button>
        </div>
      </div>

      {/* ── Banner de error ───────────────────────────────────────────────── */}
      {error && !saving && (
        <div style={{ margin: isMobile ? '10px 14px 0' : '12px 24px 0', display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 8, background: `${C.danger}12`, border: `1px solid ${C.danger}40` }}>
          <AlertCircle size={15} style={{ color: C.danger, flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text }}>{error}</div>
        </div>
      )}

      {/* ── Contenido: tabla de documentos (también acepta arrastrar y soltar) ─ */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) processFile(f) }}
        style={{ flex: 1, overflow: 'auto', padding: isMobile ? '12px 14px' : '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {avisoBanner}
        <DocumentosLista docs={documentos} loading={docsLoading} onOpen={abrirDocumento} onDelete={setConfirmarEliminar} isMobile={isMobile} />
        <div style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, textAlign: 'center' }}>
          Arrastra un Excel aquí o usa «Subir Excel». ¿Corregiste un Excel exportado por el ERP? Vuelve a cargarlo y se aplicarán las correcciones.
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: C.bg }}>
      {modalMapeo}
      {modalMaterialesNuevos}
      {modalConfirmar}
      {modalConfig}

      {/* ── Cabecera de Object Page: botón Atrás + título ─────────────────── */}
      <div style={{ padding: isMobile ? '8px 14px' : '9px 24px', borderBottom: `1px solid ${C.border}`, background: C.card, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={reset} title="Volver a Documentos Solped"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: C.card, color: C.brand, border: `1px solid ${C.border}`, cursor: 'pointer', flexShrink: 0 }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            SOLPED {documentos.find(d => d.id === docActivo)?.numero || items[0]?.solped || ''}
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[clienteActivo, filename].filter(Boolean).join(' · ') || 'Documento Solped'}
          </div>
        </div>
      </div>

      {aviso && <div style={{ padding: isMobile ? '8px 14px 0' : '8px 24px 0' }}>{avisoBanner}</div>}

      {/* ── Summary cards + controles (escritorio) ───────────────────────── */}
      {!isMobile && (<>
      {/* ── Summary cards ────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '10px 14px' : '10px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : 'visible', alignItems: 'center', paddingBottom: isMobile ? 10 : undefined }}>
        {/* Dashboard de tarjetas resumen por categoría (count + valor) desactivado a pedido.
            El filtrado por categoría sigue disponible en los chips «Categoría:» de abajo.
        {summary.map(s => (
          <SummaryCard key={s.nombre} nombre={s.nombre} count={s.count} valorUSD={s.valorUSD}
            active={filtroCats.includes(s.nombre)} onClick={() => toggleCatFilter(s.nombre)} />
        ))}
        */}
        <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>
            {filename && <>{filename} · </>}{items.length} ítems
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, color: C.text, marginTop: 2 }}>
            US$ {fmtMoney(totalUSD)}
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted }}>valor total</div>
        </div>
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '10px 14px' : '10px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: isMobile ? 1 : 'none' }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={isMobile ? 'Buscar...' : 'Buscar descripción, N° SOLPED, solicitante...'}
              style={{ paddingLeft: 28, paddingRight: 12, paddingTop: 7, paddingBottom: 7, borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: C.card, border: `1px solid ${C.border}`, color: C.text, outline: 'none', width: isMobile ? '100%' : 320 }} />
          </div>
          {!isMobile && [
            ['todos',    'Todos'],
            ['urgente',  '⚡ Urgente >60d'],
            ['atencion', '⚠ Atención 31–60d'],
            ['normal',   '✓ Normal ≤30d'],
          ].map(([val, lbl]) => (
            <button key={val} onClick={() => setFiltroUrg(val)}
              style={{ padding: '6px 12px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 11, background: filtroUrg === val ? `${C.primary}20` : C.card, color: filtroUrg === val ? C.primary : C.muted, border: `1px solid ${filtroUrg === val ? C.primary : C.border}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {lbl}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {selected.size > 0 && (
              <>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.primary, fontWeight: 600 }}>
                  {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
                </span>
                <BulkCatMenu count={selected.size} onPick={editCategoriaMasiva} />
                <GenerarOrdenMenu generando={generando} selecciones={selecciones} onNueva={generarOrden} onAgregar={agregarAOrden} />
              </>
            )}
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>
              {filtrada.length} de {sinTratar.length} ítems
            </span>
            {/* Toggle Sin tratar (Tabla / Agrupar) / Tratadas */}
            <div style={{ display: 'flex', borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              {[['tabla', Table, isMobile ? '' : 'Tabla'], ['agrupado', LayoutGrid, isMobile ? '' : 'Agrupar y asignar'], ['tratadas', CheckCircle2, `${isMobile ? '' : 'Tratadas '}(${selecciones.length})`]].map(([val, Icon, lbl]) => {
                const on = vista === val
                return (
                  <button key={val} onClick={() => setVista(val)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: on ? 600 : 400, background: on ? C.primary : C.card, color: on ? '#fff' : C.muted, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <Icon size={13} />{lbl}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setVerConfig(true)} title="Ver la configuración de columnas de este cliente"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 11, background: C.card, color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <Table size={11} /> {isMobile ? '' : 'Columnas'}
            </button>
            <button onClick={exportarExcel} title="Genera el Excel procesado con una columna para corregir categorías"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 11, background: C.card, color: C.brand, border: `1px solid ${C.border}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <Download size={11} /> {isMobile ? '' : 'Exportar Excel'}
            </button>
            <button onClick={() => setConfirmarEliminar({ id: docActivo, numero: documentos.find(d => d.id === docActivo)?.numero || items[0]?.solped })}
              title="Eliminar este documento" disabled={!docActivo}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 11, background: C.card, color: docActivo ? C.danger : C.muted, border: `1px solid ${C.border}`, cursor: docActivo ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
              <Trash2 size={11} /> {isMobile ? '' : 'Eliminar'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginRight: 2 }}>Categoría:</span>
          {CATEGORIAS_SOLPED.map(cat => {
            // «No categoria» siempre disponible (para filtrar y reasignar en masa);
            // el resto de chips solo si hay ítems en esa categoría.
            if (cat.nombre !== 'No categoria' && !sinTratar.some(it => it.categoria === cat.nombre)) return null
            const active = filtroCats.includes(cat.nombre)
            return (
              <button key={cat.nombre} onClick={() => toggleCatFilter(cat.nombre)}
                style={{ padding: '3px 10px', borderRadius: 4, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: active ? 600 : 400, background: active ? cat.bg : `${cat.bg}22`, color: active ? cat.fg : cat.bg, border: `1px solid ${active ? cat.bg : cat.bg + '60'}`, cursor: 'pointer' }}>
                {cat.nombre}
              </button>
            )
          })}
          {hasFilters && (
            <button onClick={() => { setFiltroCats([]); setFiltroUrg('todos'); setSearch('') }}
              style={{ padding: '3px 10px', borderRadius: 4, fontFamily: 'Inter, sans-serif', fontSize: 11, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
              × Limpiar filtros
            </button>
          )}
        </div>
      </div>
      </>)}

      {/* ── Panel «Filtros y resumen» plegable (móvil) ───────────────────── */}
      {isMobile && (
        <div style={{ borderBottom: `1px solid ${C.border}`, background: C.card }}>
          {/* Barra siempre visible: resumen compacto + toggle de plegado */}
          <button onClick={() => setFiltrosOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            {filtrosOpen ? <ChevronDown size={16} style={{ color: C.muted, flexShrink: 0 }} /> : <ChevronRight size={16} style={{ color: C.muted, flexShrink: 0 }} />}
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: C.text, whiteSpace: 'nowrap' }}>Filtros y resumen</span>
            {hasFilters && <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.primary, flexShrink: 0 }} title="Filtros activos" />}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>{filtrada.length}/{items.length} ít.</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 12, color: C.primary, whiteSpace: 'nowrap' }}>US$ {fmtMoney(totalUSD)}</span>
            </div>
          </button>

          {filtrosOpen && (
            <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Buscar */}
              <div style={{ position: 'relative' }}>
                <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                  style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 28, paddingRight: 12, paddingTop: 7, paddingBottom: 7, borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: C.bg, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }} />
              </div>

              {/* Toggle Tabla / Agrupar + acciones (icono) */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'flex', borderRadius: 8, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                  {[['tabla', Table, 'Tabla'], ['agrupado', LayoutGrid, 'Agrupar y asignar'], ['tratadas', CheckCircle2, `Tratadas (${selecciones.length})`]].map(([val, Icon, ttl]) => {
                    const on = vista === val
                    return (
                      <button key={val} onClick={() => setVista(val)} title={ttl}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', background: on ? C.primary : C.card, color: on ? '#fff' : C.muted, border: 'none', cursor: 'pointer' }}>
                        <Icon size={14} />{val === 'tratadas' && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: on ? 600 : 400 }}>{selecciones.length}</span>}
                      </button>
                    )
                  })}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button onClick={() => setVerConfig(true)} title="Columnas"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', borderRadius: 8, background: C.card, color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
                    <Table size={13} />
                  </button>
                  <button onClick={exportarExcel} title="Exportar Excel"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', borderRadius: 8, background: C.card, color: C.brand, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
                    <Download size={13} />
                  </button>
                  <button onClick={() => setConfirmarEliminar({ id: docActivo, numero: documentos.find(d => d.id === docActivo)?.numero || items[0]?.solped })}
                    title="Eliminar" disabled={!docActivo}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', borderRadius: 8, background: C.card, color: docActivo ? C.danger : C.muted, border: `1px solid ${C.border}`, cursor: docActivo ? 'pointer' : 'not-allowed' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {selected.size > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.primary, fontWeight: 600 }}>
                    {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
                  </span>
                  <BulkCatMenu count={selected.size} onPick={editCategoriaMasiva} />
                  <GenerarOrdenMenu generando={generando} selecciones={selecciones} onNueva={generarOrden} onAgregar={agregarAOrden} />
                </div>
              )}

              {/* Tarjetas resumen por categoría: omitidas en móvil — duplicaban el
                 filtrado por categoría que ya hacen los chips de abajo. */}

              {/* Chips de categoría */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginRight: 2 }}>Categoría:</span>
                {CATEGORIAS_SOLPED.map(cat => {
                  // «No categoria» siempre disponible (para filtrar y reasignar en masa);
            // el resto de chips solo si hay ítems en esa categoría.
            if (cat.nombre !== 'No categoria' && !sinTratar.some(it => it.categoria === cat.nombre)) return null
                  const active = filtroCats.includes(cat.nombre)
                  return (
                    <button key={cat.nombre} onClick={() => toggleCatFilter(cat.nombre)}
                      style={{ padding: '3px 10px', borderRadius: 4, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: active ? 600 : 400, background: active ? cat.bg : `${cat.bg}22`, color: active ? cat.fg : cat.bg, border: `1px solid ${active ? cat.bg : cat.bg + '60'}`, cursor: 'pointer' }}>
                      {cat.nombre}
                    </button>
                  )
                })}
              </div>

              {/* Filtros de urgencia */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                {[['todos', 'Todos'], ['urgente', '⚡ >60d'], ['atencion', '⚠ 31–60d'], ['normal', '✓ ≤30d']].map(([val, lbl]) => (
                  <button key={val} onClick={() => setFiltroUrg(val)}
                    style={{ padding: '4px 10px', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: 11, background: filtroUrg === val ? `${C.primary}20` : C.card, color: filtroUrg === val ? C.primary : C.muted, border: `1px solid ${filtroUrg === val ? C.primary : C.border}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {lbl}
                  </button>
                ))}
              </div>

              {hasFilters && (
                <button onClick={() => { setFiltroCats([]); setFiltroUrg('todos'); setSearch('') }}
                  style={{ alignSelf: 'flex-start', padding: '4px 10px', borderRadius: 4, fontFamily: 'Inter, sans-serif', fontSize: 11, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
                  × Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Vista «Tratadas» (agrupaciones COD.SELECT.SOLPED del documento) ─── */}
      {vista === 'tratadas' ? (
        <TratadasView selecciones={selecciones} isMobile={isMobile} onEliminar={eliminarOrden} onQuitarItem={quitarItemOrden} />
      ) : vista === 'agrupado' ? (
        <SolpedAgrupado items={filtrada} isMobile={isMobile} onEditCategoria={editCategoria} />
      ) : (
      /* ── Table ────────────────────────────────────────────────────────── */
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: isMobile ? '100%' : colW.reduce((a, b) => a + b, 0), minWidth: isMobile ? 380 : colW.reduce((a, b) => a + b, 0), borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12, tableLayout: isMobile ? 'auto' : 'fixed' }}>
          {!isMobile && (
            <colgroup>
              {COLS_SOLPED.map((c, i) => <col key={c.key} style={{ width: colW[i] }} />)}
            </colgroup>
          )}
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: C.card, boxShadow: `0 1px 0 ${C.border}` }}>
            <tr>
              {COLS_SOLPED.filter(c => isMobile ? c.mobile : true).map(c => {
                const i = COLS_SOLPED.indexOf(c)
                return (
                  <th key={c.key} title={c.title}
                    style={{ padding: c.key === 'check' ? '10px 0 10px 12px' : '10px 8px 10px 0', textAlign: c.align || 'left', fontWeight: 500, fontSize: 11, color: C.muted, letterSpacing: '0.05em', whiteSpace: 'nowrap', position: 'relative' }}>
                    {c.key === 'check' ? (
                      <input type="checkbox"
                        ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                        checked={allSelected} onChange={toggleAll}
                        style={{ cursor: 'pointer', accentColor: C.primary }} />
                    ) : c.label}
                    {!isMobile && c.resize !== false && (
                      <span onMouseDown={e => startResize(i, e)} title="Arrastra para redimensionar"
                        style={{ position: 'absolute', top: 0, right: -1, height: '100%', width: 9, cursor: 'col-resize', userSelect: 'none', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <span style={{ width: 2, height: '55%', background: C.border }} />
                      </span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {filtrada.length === 0 ? (
              <tr>
                <td colSpan={isMobile ? 5 : 12} style={{ padding: 48, textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted }}>
                  Sin resultados para los filtros aplicados.
                </td>
              </tr>
            ) : filtrada.map(it => (
              <tr key={it.id}
                style={{ borderBottom: `1px solid ${C.border}30`, background: selected.has(it.id) ? `${C.primary}08` : 'transparent', verticalAlign: 'middle' }}>
                <td style={{ padding: '7px 0 7px 12px', textAlign: 'center', width: 34 }}>
                  <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggleOne(it.id)}
                    style={{ cursor: 'pointer', accentColor: C.primary }} />
                </td>

                {!isMobile && (
                  <td style={{ padding: '7px 8px 7px 0' }}>
                    <div style={{ fontWeight: 600, color: C.primary }}>{it.solped}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>pos. {it.posicion}</div>
                  </td>
                )}

                <td style={{ padding: '7px 8px 7px 0', overflow: 'hidden', maxWidth: isMobile ? 160 : undefined }}>
                  {isMobile && it.solped && (
                    <div style={{ fontSize: 10, color: C.primary, marginBottom: 2 }}>{it.solped} · pos.{it.posicion}</div>
                  )}
                  <div title={it.textoBreve}
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.text, fontWeight: isMobile ? 500 : 400 }}>
                    {it.textoBreve || <span style={{ color: C.muted }}>—</span>}
                  </div>
                  {it.codigoMaterial && (
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{it.codigoMaterial}</div>
                  )}
                  {isMobile && (
                    <div style={{ fontSize: 10, color: C.text, marginTop: 2, fontWeight: 500 }}>{it.moneda} {fmtMoney(it.valorTotal)}</div>
                  )}
                </td>

                {!isMobile && (
                  <td style={{ padding: '7px 8px 7px 0', overflow: 'hidden' }}
                      title={it.fabricante || it.textoPedido || 'Sin fabricante en el «Texto pedido de compra»'}>
                    <div style={{ color: it.fabricante ? C.text : C.muted, fontWeight: it.fabricante ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.fabricante || '—'}
                    </div>
                  </td>
                )}

                {!isMobile && (
                  <td style={{ padding: '7px 8px 7px 0', overflow: 'hidden' }}
                      title={it.modelo || it.textoPedido || 'Sin modelo / N° de parte en el «Texto pedido de compra»'}>
                    <div style={{ color: it.modelo ? C.text : C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.modelo || '—'}
                    </div>
                  </td>
                )}

                <td style={{ padding: '7px 8px 7px 0' }}>
                  <CatBadge item={it} onEdit={editCategoria} />
                </td>

                <td style={{ padding: '7px 8px 7px 0', color: C.text, whiteSpace: 'nowrap' }}>
                  <div>{it.cantidad.toLocaleString('es-PE')}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{it.unidad}</div>
                </td>

                {!isMobile && (
                  <td style={{ padding: '7px 8px 7px 0', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 600, color: C.text }}>{it.moneda} {fmtMoney(it.valorTotal)}</div>
                    {it.moneda === 'PEN' && (
                      <div style={{ fontSize: 10, color: C.muted }}>≈ US$ {fmtMoney(toUSD(it.valorTotal, it.moneda))}</div>
                    )}
                  </td>
                )}

                <td style={{ padding: '7px 8px 7px 0' }}>
                  <div style={{ fontWeight: 600, color: urgColor(it.diasDesde) }}>{it.diasDesde}d</div>
                  <div style={{ fontSize: 10, color: urgColor(it.diasDesde) }}>{urgLabel(it.diasDesde)}</div>
                </td>

                {!isMobile && (
                  <td style={{ padding: '7px 8px 7px 0', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.solicitante || '—'}
                  </td>
                )}

                {!isMobile && (
                  <td style={{ padding: '7px 8px 7px 0', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }} title={it.areaNecesidad}>
                    {it.areaNecesidad || '—'}
                  </td>
                )}

                {!isMobile && (
                  <td style={{ padding: '7px 0 7px 0', overflow: 'hidden', whiteSpace: 'nowrap' }} title={it.proveedorUltimo || (it.codigoMaterial ? 'Sin compras previas de este material' : 'Sin código de material')}>
                    {it.proveedorUltimo ? (
                      <>
                        <div style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.proveedorUltimo}</div>
                        {it.proveedorUltimoFecha && <div style={{ fontSize: 10, color: C.muted }}>{isoCorta(it.proveedorUltimoFecha)}</div>}
                      </>
                    ) : (
                      <span style={{ color: C.muted }}>—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}
