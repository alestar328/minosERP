// ══════════════════════════════════════════════════════════════════════════════
//  Capa de datos: Documentos Solped ↔ Supabase
// ══════════════════════════════════════════════════════════════════════════════
//  Un "Documento Solped" = un Excel cargado = UNA solped (numero + cliente),
//  persistida en `solpeds` (cabecera + metadatos de carga) y `solped_items`.
//
//  Re-cargar el mismo (cliente, numero) NO duplica: se reconcilian los items por
//  `posicion` (upsert). Las posiciones que ya no vienen se marcan `activo=false`
//  (conservadas, no borradas). Las clasificaciones manuales (categoria_manual) se
//  preservan ante una recarga automática.
// ══════════════════════════════════════════════════════════════════════════════

import { supabase } from './supabaseClient.js'

// ── Mapa categoría nombre ↔ id (cacheado; las categorías son estables) ──────────
let _catMaps = null
async function getCatMaps() {
  if (_catMaps) return _catMaps
  const { data, error } = await supabase.from('categorias').select('id, nombre')
  if (error) throw error
  const byName = new Map(), byId = new Map()
  for (const c of data) { byName.set(c.nombre, c.id); byId.set(c.id, c.nombre) }
  _catMaps = { byName, byId }
  return _catMaps
}
// 'No categoria' y cualquier nombre desconocido ⇒ null (sin clasificar en BD).
const catIdFromName = (m, nombre) => m.byName.get(nombre) ?? null
const catNameFromId = (m, id) => (id && m.byId.get(id)) || 'No categoria'

// ── Helpers de fecha (la UI usa dd/mm/yyyy; la BD usa date ISO) ─────────────────
function toISODate(s) {
  if (!s) return null
  const str = String(s).trim()
  const m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) {
    let [, d, mo, y] = m
    if (y.length === 2) y = '20' + y
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)
  return null
}
function isoToDisplay(iso) {
  if (!iso) return ''
  const [y, mo, d] = String(iso).slice(0, 10).split('-')
  return d && mo && y ? `${d}/${mo}/${y}` : ''
}
function diasSince(iso) {
  if (!iso) return 0
  const dt = new Date(iso)
  if (isNaN(dt)) return 0
  const diff = Math.round((Date.now() - dt.getTime()) / 86400000)
  return diff > 0 ? diff : 0
}
const posNum = p => { const n = parseInt(String(p).replace(/\D/g, ''), 10); return isNaN(n) ? 0 : n }

// ── Mapeo item BD → forma en memoria que consume la UI ──────────────────────────
function dbItemToUI(i, maps, solped) {
  return {
    id:              i.id,                       // id real de BD (permite persistir ediciones)
    solped:          solped.numero || '—',
    posicion:        i.posicion || '',
    codigoMaterial:  i.codigo_material || '',
    textoBreve:      i.texto_breve || '',
    especificacion:  i.especificacion || '',
    cantidad:        Number(i.cantidad) || 0,
    unidad:          i.unidad || '',
    tipoPos:         i.tipo_pos || '',
    solicitante:     solped.solicitante || '',
    valorTotal:      Number(i.valor_total) || 0,
    moneda:          (i.moneda || 'USD').trim(),
    fechaLiberacion: isoToDisplay(i.fecha_liberacion),
    diasDesde:       diasSince(i.fecha_liberacion),
    grupoPlanif:     i.grupo_planif || '',
    areaNecesidad:   i.area_necesidad || '',
    grupoArticulos:  i.grupo_articulos || '',
    categoria:       catNameFromId(maps, i.categoria_id),
    categoriaManual: i.categoria_manual,
  }
}

// ── Mapeo item UI → fila de BD ──────────────────────────────────────────────────
function uiItemToDb(it, maps, solpedId) {
  return {
    solped_id:        solpedId,
    posicion:         String(it.posicion ?? ''),
    codigo_material:  it.codigoMaterial || null,
    texto_breve:      it.textoBreve || '(sin descripción)',
    especificacion:   it.especificacion || null,
    cantidad:         it.cantidad ?? null,
    unidad:           it.unidad || null,
    tipo_pos:         (it.tipoPos === 'L' || it.tipoPos === 'F') ? it.tipoPos : null,
    valor_total:      it.valorTotal ?? null,
    moneda:           (it.moneda || 'USD').slice(0, 3),
    grupo_articulos:  it.grupoArticulos || null,
    grupo_planif:     it.grupoPlanif || null,
    area_necesidad:   it.areaNecesidad || null,
    fecha_liberacion: toISODate(it.fechaLiberacion),
    categoria_id:     catIdFromName(maps, it.categoria),
    categoria_manual: !!it.categoriaManual,
  }
}

// ── Cliente: buscar por razón social o crear ────────────────────────────────────
async function findOrCreateCliente(nombre) {
  const razon = (nombre || '').trim() || '(Sin cliente)'
  const { data: found, error } = await supabase
    .from('clientes').select('id').eq('razon_social', razon).maybeSingle()
  if (error) throw error
  if (found) return found.id
  const { data: ins, error: e2 } = await supabase
    .from('clientes').insert({ razon_social: razon }).select('id').single()
  if (e2) throw e2
  return ins.id
}

// ── Listado de Documentos Solped (para la ventana Solped y el dashboard) ─────────
export async function listarDocumentos() {
  const { data, error } = await supabase
    .from('solpeds')
    .select('id, numero, archivo_nombre, fecha_carga, estado, cliente:clientes(id, razon_social), solped_items(categoria_id, activo)')
    .order('fecha_carga', { ascending: false })
  if (error) throw error
  return (data || []).map(d => {
    const activos = (d.solped_items || []).filter(i => i.activo)
    const sinCat = activos.filter(i => !i.categoria_id).length
    return {
      id:             d.id,
      numero:         d.numero,
      archivo:        d.archivo_nombre || '',
      cliente:        d.cliente?.razon_social || '—',
      clienteId:      d.cliente?.id || null,
      fechaCarga:     d.fecha_carga,
      estado:         d.estado,
      totalPosiciones: activos.length,
      sinClasificar:  sinCat,
      pctClasificado: activos.length ? Math.round(((activos.length - sinCat) / activos.length) * 100) : 0,
    }
  })
}

// ── "Proveedor último pedido": último proveedor por código de material ──────────
// Cruza el código del SOLPED con el catálogo `materiales` (auto-alimentado desde
// las OCs). Devuelve Map: codigo → { proveedor, fecha }.
export async function proveedorUltimoPorCodigo(codigos) {
  const uniq = [...new Set((codigos || []).map(c => (c || '').trim()).filter(Boolean))]
  if (!uniq.length) return new Map()
  const { data, error } = await supabase
    .from('materiales')
    .select('codigo, ultima_fecha_compra, proveedor:proveedores(razon_social, nombre_comercial)')
    .in('codigo', uniq)
  if (error) throw error
  const map = new Map()
  for (const m of data || []) {
    const nombre = m.proveedor?.razon_social || m.proveedor?.nombre_comercial || ''
    map.set(m.codigo, { proveedor: nombre, fecha: m.ultima_fecha_compra })
  }
  return map
}

// ── Categoría conocida por código (catálogo `materiales`) ───────────────────────
// El catálogo refleja lo realmente comprado (y posibles correcciones manuales en
// la SOLPED de origen), por eso prevalece sobre la clasificación por reglas.
// Devuelve Map: codigo → nombre de categoría.
export async function categoriaPorCodigo(codigos) {
  const uniq = [...new Set((codigos || []).map(c => (c || '').trim()).filter(Boolean))]
  if (!uniq.length) return new Map()
  const maps = await getCatMaps()
  const { data, error } = await supabase.from('materiales').select('codigo, categoria_id').in('codigo', uniq)
  if (error) throw error
  const m = new Map()
  for (const r of data || []) if (r.categoria_id) m.set(r.codigo, catNameFromId(maps, r.categoria_id))
  return m
}

// ── Cargar un documento completo (cabecera + items activos) ─────────────────────
export async function cargarDocumento(solpedId) {
  const maps = await getCatMaps()
  const { data, error } = await supabase
    .from('solpeds')
    .select('id, numero, archivo_nombre, solicitante, cliente:clientes(razon_social), solped_items(*)')
    .eq('id', solpedId)
    .single()
  if (error) throw error
  const items = (data.solped_items || [])
    .filter(i => i.activo)
    .sort((a, b) => posNum(a.posicion) - posNum(b.posicion))
    .map(i => dbItemToUI(i, maps, data))
  // Enriquecer con "Proveedor último pedido" (columna generada por el ERP).
  const provMap = await proveedorUltimoPorCodigo(items.map(i => i.codigoMaterial))
  for (const it of items) {
    const info = provMap.get((it.codigoMaterial || '').trim())
    it.proveedorUltimo = info?.proveedor || ''
    it.proveedorUltimoFecha = info?.fecha || ''
  }
  return { id: data.id, numero: data.numero, archivo: data.archivo_nombre || '', cliente: data.cliente?.razon_social || '', items }
}

// ── Guardar / recargar un documento (find-or-create + reconciliación por posición) ─
// Devuelve el id de la solped persistida.
export async function guardarDocumento({ cliente, numero, archivo, solicitante, items }) {
  const maps = await getCatMaps()
  const clienteId = await findOrCreateCliente(cliente)

  // Cabecera: buscar (cliente, numero) o crear.
  let solpedId
  const { data: existing, error: e1 } = await supabase
    .from('solpeds').select('id').eq('cliente_id', clienteId).eq('numero', numero).maybeSingle()
  if (e1) throw e1

  const cabecera = { archivo_nombre: archivo || null, fecha_carga: new Date().toISOString(), solicitante: solicitante || null }
  if (existing) {
    solpedId = existing.id
    const { error } = await supabase.from('solpeds').update(cabecera).eq('id', solpedId)
    if (error) throw error
  } else {
    const { data: ins, error } = await supabase
      .from('solpeds').insert({ numero, cliente_id: clienteId, ...cabecera }).select('id').single()
    if (error) throw error
    solpedId = ins.id
  }

  // Reconciliación de items por posición.
  const { data: current, error: e3 } = await supabase
    .from('solped_items').select('id, posicion, categoria_manual').eq('solped_id', solpedId)
  if (e3) throw e3
  const byPos = new Map((current || []).map(r => [String(r.posicion), r]))
  const incoming = new Set()

  for (const it of items) {
    const pos = String(it.posicion ?? '')
    incoming.add(pos)
    const row = uiItemToDb(it, maps, solpedId)
    const prev = byPos.get(pos)
    if (prev) {
      // Preservar clasificación manual previa frente a la re-clasificación automática.
      if (prev.categoria_manual) { delete row.categoria_id; delete row.categoria_manual }
      const { error } = await supabase.from('solped_items').update({ ...row, activo: true }).eq('id', prev.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('solped_items').insert({ ...row, activo: true })
      if (error) throw error
    }
  }

  // Posiciones que ya no vienen ⇒ marcar inactivas (no destructivo).
  const missing = (current || []).filter(r => !incoming.has(String(r.posicion))).map(r => r.id)
  if (missing.length) {
    const { error } = await supabase.from('solped_items').update({ activo: false }).in('id', missing)
    if (error) throw error
  }

  return solpedId
}

// ── Resolver el documento (solped) al que pertenece un item ─────────────────────
export async function solpedIdDeItem(itemId) {
  const { data, error } = await supabase
    .from('solped_items').select('solped_id').eq('id', itemId).maybeSingle()
  if (error) throw error
  return data?.solped_id || null
}

// ── Persistir una corrección manual de categoría sobre un item ──────────────────
export async function actualizarCategoriaItem(itemId, nombreCat) {
  const maps = await getCatMaps()
  const { error } = await supabase
    .from('solped_items')
    .update({ categoria_id: catIdFromName(maps, nombreCat), categoria_manual: true })
    .eq('id', itemId)
  if (error) throw error
}
