// ══════════════════════════════════════════════════════════════════════════════
//  Capa de datos: Clientes ↔ Supabase
// ══════════════════════════════════════════════════════════════════════════════
//  CRUD del maestro de clientes (las mineras a las que atendemos). Cada cliente
//  tiene un `prefijo_oc` de 2 dígitos que encabeza el N° de sus Órdenes de Compra
//  (p.ej. 45 -> 4500000001…) y los datos de emisor (razón social, RUC, dirección,
//  teléfono) que se autocompletan en la OC. Mismo estilo que maestrosRepo.js.
// ══════════════════════════════════════════════════════════════════════════════

import { supabase } from './supabaseClient.js'

function cliDbToUI(c) {
  return {
    id:           c.id,
    razonSocial:  c.razon_social || '',
    ruc:          c.ruc || '',
    unidad:       c.unidad || '',
    prefijoOC:    c.prefijo_oc || '',
    direccion:    c.direccion || '',
    telefono:     c.telefono || '',
    activo:       c.activo !== false,
  }
}

function cliUItoDb(ui) {
  return {
    razon_social: (ui.razonSocial || '').trim(),
    ruc:          (ui.ruc || '').replace(/\D/g, '') || null,
    unidad:       ui.unidad?.trim() || null,
    prefijo_oc:   (ui.prefijoOC || '').replace(/\D/g, '') || null,
    direccion:    ui.direccion?.trim() || null,
    telefono:     ui.telefono?.trim() || null,
    activo:       ui.activo !== false,
  }
}

export async function listarClientes() {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, razon_social, ruc, unidad, prefijo_oc, direccion, telefono, activo')
    .order('razon_social')
  if (error) throw error
  return (data || []).map(cliDbToUI)
}

// Crea (sin id) o actualiza (con id) un cliente. Devuelve el id.
export async function guardarCliente(ui) {
  const row = cliUItoDb(ui)
  if (ui.id) {
    const { error } = await supabase.from('clientes').update(row).eq('id', ui.id)
    if (error) throw error
    return ui.id
  }
  const { data, error } = await supabase.from('clientes').insert(row).select('id').single()
  if (error) throw error
  return data.id
}

export async function eliminarCliente(id) {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  if (error) throw error
}

// ── Correlativo de Orden de Compra ──────────────────────────────────────────────
// El N° de OC = prefijo (2 díg. del cliente) + correlativo de 8 díg. La numeración
// es por prefijo: 45 -> 4500000001, 4500000002…  El siguiente número se calcula
// del máximo ya guardado en `ordenes_compra` con ese prefijo (max+1). El número se
// reserva al EMITIR (insertar la OC), garantizando unicidad por la restricción
// UNIQUE de numero_oc.
const ANCHO_CORRELATIVO = 8

export async function siguienteNumeroOC(prefijo) {
  const p = (prefijo || '').replace(/\D/g, '')
  if (p.length === 0) throw new Error('El cliente no tiene prefijo de OC configurado.')
  const { data, error } = await supabase
    .from('ordenes_compra')
    .select('numero_oc')
    .like('numero_oc', `${p}%`)
    .order('numero_oc', { ascending: false })
    .limit(1)
  if (error) throw error
  const ultimo = data?.[0]?.numero_oc || ''
  // El correlativo es la parte tras el prefijo; si no hay previos, arranca en 1.
  const prevCorrel = ultimo.startsWith(p) ? parseInt(ultimo.slice(p.length), 10) : NaN
  const siguiente = (isNaN(prevCorrel) ? 0 : prevCorrel) + 1
  return p + String(siguiente).padStart(ANCHO_CORRELATIVO, '0')
}
