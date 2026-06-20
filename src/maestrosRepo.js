// ══════════════════════════════════════════════════════════════════════════════
//  Capa de datos: Maestros (Proveedores y Materiales) ↔ Supabase
// ══════════════════════════════════════════════════════════════════════════════
//  CRUD + carga masiva por Excel. Mismo estilo que solpedRepo.js.
//    · Proveedores → tabla `proveedores` + M:N `proveedor_categorias`
//    · Materiales  → tabla `materiales` (campos de maestro: unidad/fabricante/modelo)
//  La taxonomía (categorías) se resuelve nombre↔id contra la tabla `categorias`.
// ══════════════════════════════════════════════════════════════════════════════

import { supabase } from './supabaseClient.js'

// ── Mapa categoría nombre ↔ id (cacheado; las categorías son estables) ──────────
let _catMaps = null
async function getCatMaps() {
  if (_catMaps) return _catMaps
  const { data, error } = await supabase.from('categorias').select('id, nombre').eq('activo', true).order('orden')
  if (error) throw error
  const byName = new Map(), byId = new Map(), nombres = []
  for (const c of data) { byName.set(c.nombre, c.id); byId.set(c.id, c.nombre); nombres.push(c.nombre) }
  _catMaps = { byName, byId, nombres }
  return _catMaps
}

// Nombres de categoría válidos (para validar el Excel antes de importar).
export async function categoriasValidas() {
  return (await getCatMaps()).nombres
}

// ══════════════════════════════════════════════════════════════════════════════
//  PROVEEDORES
// ══════════════════════════════════════════════════════════════════════════════

function provDbToUI(p) {
  const categorias = (p.proveedor_categorias || [])
    .map(pc => pc.categoria?.nombre)
    .filter(Boolean)
  return {
    id:                p.id,
    razonSocial:       p.razon_social || '',
    ruc:               p.ruc || '',
    nombreComercial:   p.nombre_comercial || '',
    contactoNombre:    p.contacto_nombre || '',
    contactoEmail:     p.contacto_email || '',
    contactoTelefono:  p.contacto_telefono || '',
    direccion:         p.direccion || '',
    categorias,
    estadoHomologacion: p.estado_homologacion || 'Pendiente',
    homologado:        p.estado_homologacion === 'Homologado',
    notas:             p.notas || '',
    activo:            p.activo !== false,
    fechaAlta:         p.fecha_alta || '',
  }
}

function provUItoDb(ui) {
  return {
    razon_social:       (ui.razonSocial || '').trim(),
    ruc:                (ui.ruc || '').replace(/\D/g, '') || null,
    nombre_comercial:   ui.nombreComercial?.trim() || null,
    contacto_nombre:    ui.contactoNombre?.trim() || null,
    contacto_email:     ui.contactoEmail?.trim() || null,
    contacto_telefono:  ui.contactoTelefono?.trim() || null,
    direccion:          ui.direccion?.trim() || null,
    estado_homologacion: ui.estadoHomologacion || 'Pendiente',
    notas:              ui.notas?.trim() || null,
    activo:             ui.activo !== false,
  }
}

export async function listarProveedores() {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*, proveedor_categorias(categoria:categorias(nombre))')
    .order('razon_social')
  if (error) throw error
  return (data || []).map(provDbToUI)
}

// Reemplaza el set de categorías de un proveedor por el indicado (nombres).
async function syncProveedorCategorias(proveedorId, nombres, maps) {
  const ids = [...new Set((nombres || []).map(n => maps.byName.get(n)).filter(Boolean))]
  const { error: eDel } = await supabase.from('proveedor_categorias').delete().eq('proveedor_id', proveedorId)
  if (eDel) throw eDel
  if (!ids.length) return
  const rows = ids.map(categoria_id => ({ proveedor_id: proveedorId, categoria_id }))
  const { error: eIns } = await supabase.from('proveedor_categorias').insert(rows)
  if (eIns) throw eIns
}

// Crea (sin id) o actualiza (con id) un proveedor + sus categorías. Devuelve el id.
export async function guardarProveedor(ui) {
  const maps = await getCatMaps()
  const row = provUItoDb(ui)
  let id = ui.id
  if (id) {
    const { error } = await supabase.from('proveedores').update(row).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('proveedores').insert(row).select('id').single()
    if (error) throw error
    id = data.id
  }
  await syncProveedorCategorias(id, ui.categorias, maps)
  return id
}

export async function eliminarProveedor(id) {
  const { error } = await supabase.from('proveedores').delete().eq('id', id)
  if (error) throw error
}

export async function setProveedorActivo(id, activo) {
  const { error } = await supabase.from('proveedores').update({ activo }).eq('id', id)
  if (error) throw error
}

// Homologar/des-homologar desde la ficha (toggle). Des-homologar vuelve a 'Pendiente'.
export async function setProveedorHomologado(id, homologado) {
  const { error } = await supabase
    .from('proveedores')
    .update({ estado_homologacion: homologado ? 'Homologado' : 'Pendiente' })
    .eq('id', id)
  if (error) throw error
}

// Carga masiva. `filas` = salida de parseProveedores().ok. Upsert por RUC.
// Devuelve { creados, actualizados, errores: [{ ruc, msg }] }.
export async function importarProveedores(filas) {
  const maps = await getCatMaps()
  const rucs = [...new Set(filas.map(f => f.ruc).filter(Boolean))]
  const { data: existentes, error } = rucs.length
    ? await supabase.from('proveedores').select('id, ruc').in('ruc', rucs)
    : { data: [], error: null }
  if (error) throw error
  const idPorRuc = new Map((existentes || []).map(p => [p.ruc, p.id]))

  let creados = 0, actualizados = 0
  const errores = []
  for (const f of filas) {
    try {
      const row = provUItoDb(f)
      let id = idPorRuc.get(f.ruc)
      if (id) {
        const { error: e } = await supabase.from('proveedores').update(row).eq('id', id)
        if (e) throw e
        actualizados++
      } else {
        const { data, error: e } = await supabase.from('proveedores').insert(row).select('id').single()
        if (e) throw e
        id = data.id
        idPorRuc.set(f.ruc, id)
        creados++
      }
      await syncProveedorCategorias(id, f.categorias, maps)
    } catch (e) {
      errores.push({ ruc: f.ruc, msg: e.message || String(e) })
    }
  }
  return { creados, actualizados, errores }
}

// ══════════════════════════════════════════════════════════════════════════════
//  MATERIALES
// ══════════════════════════════════════════════════════════════════════════════

function matDbToUI(m) {
  return {
    id:               m.id,
    codigo:           m.codigo || '',
    descripcion:      m.descripcion || '',
    categoria:        m.categoria?.nombre || '',
    unidad:           m.unidad || '',
    fabricante:       m.fabricante || '',
    modelo:           m.modelo || '',
    ultimoPrecio:     m.ultimo_precio != null ? Number(m.ultimo_precio) : null,
    ultimaMoneda:     (m.ultima_moneda || 'USD').trim(),
    ultimoProveedor:  m.proveedor?.razon_social || m.proveedor?.nombre_comercial || '',
    ultimaFechaCompra: m.ultima_fecha_compra || '',
  }
}

function matUItoDb(ui, maps) {
  return {
    codigo:        (ui.codigo || '').trim(),
    descripcion:   ui.descripcion?.trim() || null,
    categoria_id:  ui.categoria ? (maps.byName.get(ui.categoria) ?? null) : null,
    unidad:        ui.unidad?.trim() || null,
    fabricante:    ui.fabricante?.trim() || null,
    modelo:        ui.modelo?.trim() || null,
    ultimo_precio: ui.ultimoPrecio ?? null,
    ultima_moneda: (ui.ultimaMoneda || 'USD').toUpperCase().slice(0, 3),
  }
}

// Devuelve el Set de códigos (de la lista dada) que YA existen en el catálogo.
// Lo usa la detección de "materiales nuevos" al cargar una SOLPED.
export async function codigosExistentes(codigos) {
  const uniq = [...new Set((codigos || []).map(c => (c || '').trim()).filter(Boolean))]
  if (!uniq.length) return new Set()
  const { data, error } = await supabase.from('materiales').select('codigo').in('codigo', uniq)
  if (error) throw error
  return new Set((data || []).map(m => m.codigo))
}

// Códigos (de la lista dada) que el usuario marcó como "no proponer" (ignorados).
export async function codigosIgnorados(codigos) {
  const uniq = [...new Set((codigos || []).map(c => (c || '').trim()).filter(Boolean))]
  if (!uniq.length) return new Set()
  const { data, error } = await supabase.from('materiales_ignorados').select('codigo').in('codigo', uniq)
  if (error) throw error
  return new Set((data || []).map(m => m.codigo))
}

// Registra códigos para no volver a proponerlos al cargar SOLPEDs (idempotente).
export async function ignorarCodigos(codigos) {
  const rows = [...new Set((codigos || []).map(c => (c || '').trim()).filter(Boolean))].map(codigo => ({ codigo }))
  if (!rows.length) return
  const { error } = await supabase.from('materiales_ignorados').upsert(rows, { onConflict: 'codigo', ignoreDuplicates: true })
  if (error) throw error
}

export async function listarMateriales() {
  const { data, error } = await supabase
    .from('materiales')
    .select('*, categoria:categorias(nombre), proveedor:proveedores(razon_social, nombre_comercial)')
    .order('codigo')
  if (error) throw error
  return (data || []).map(matDbToUI)
}

export async function guardarMaterial(ui) {
  const maps = await getCatMaps()
  const row = matUItoDb(ui, maps)
  let id = ui.id
  if (id) {
    const { error } = await supabase.from('materiales').update(row).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('materiales').insert(row).select('id').single()
    if (error) throw error
    id = data.id
  }
  return id
}

export async function eliminarMaterial(id) {
  const { error } = await supabase.from('materiales').delete().eq('id', id)
  if (error) throw error
}

// Carga masiva. `filas` = salida de parseMateriales().ok. Upsert por `codigo`.
// Devuelve { creados, actualizados, errores: [{ codigo, msg }] }.
export async function importarMateriales(filas) {
  const maps = await getCatMaps()
  const codigos = [...new Set(filas.map(f => f.codigo).filter(Boolean))]
  const { data: existentes, error } = codigos.length
    ? await supabase.from('materiales').select('id, codigo').in('codigo', codigos)
    : { data: [], error: null }
  if (error) throw error
  const idPorCodigo = new Map((existentes || []).map(m => [m.codigo, m.id]))

  let creados = 0, actualizados = 0
  const errores = []
  for (const f of filas) {
    try {
      const row = matUItoDb(f, maps)
      const id = idPorCodigo.get(f.codigo)
      if (id) {
        const { error: e } = await supabase.from('materiales').update(row).eq('id', id)
        if (e) throw e
        actualizados++
      } else {
        const { error: e } = await supabase.from('materiales').insert(row)
        if (e) throw e
        creados++
      }
    } catch (e) {
      errores.push({ codigo: f.codigo, msg: e.message || String(e) })
    }
  }
  return { creados, actualizados, errores }
}
