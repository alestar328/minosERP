// ══════════════════════════════════════════════════════════════════════════════
//  Capa de datos: Órdenes de Compra ↔ Supabase
// ══════════════════════════════════════════════════════════════════════════════
//  Emitir = persistir la OC (cabecera en `ordenes_compra` + líneas en `oc_items`).
//  El N° de OC se reserva en este momento: se calcula el siguiente correlativo del
//  prefijo del cliente y se inserta; la restricción UNIQUE de numero_oc garantiza
//  unicidad. Si dos emisiones colisionan en el mismo número, se reintenta.
// ══════════════════════════════════════════════════════════════════════════════

import { supabase } from './supabaseClient.js'
import { siguienteNumeroOC } from './clientesRepo.js'

const intOrNull = v => { const n = parseInt(v, 10); return isNaN(n) ? null : n }
const esColision = msg => /duplicate key|unique|numero_oc/i.test(msg || '')

// Persiste la OC. Devuelve { id, numero }. Lanza Error con mensaje legible.
export async function emitirOrdenCompra(data) {
  if (!data.cliente?.id) throw new Error('Selecciona un cliente antes de emitir.')
  const prefijo = data.cliente?.prefijoOC
  if (!prefijo) throw new Error('El cliente no tiene prefijo de OC. Asígnalo en «Clientes».')

  const items = (data.items || []).filter(it => it.codigo || it.descripcion || it.especificacion)
  if (!items.length) throw new Error('La orden no tiene ítems con datos.')

  let lastErr = null
  for (let intento = 0; intento < 5; intento++) {
    const numero = await siguienteNumeroOC(prefijo)
    const cab = {
      numero_oc:          numero,
      cliente_id:         data.cliente.id,
      proveedor_id:       data.proveedor?.id || null,
      fecha_emision:      data.fechaEmision || null,
      estado:             'Emitida',
      plazo_entrega_dias: intOrNull(data.plazoEntrega),
      lugar_entrega:      data.lugarEntrega?.trim() || null,
      forma_pago_dias:    intOrNull(data.formaPago),
      comprador_nombre:   data.comprador?.nombre?.trim() || null,
      comprador_email:    data.comprador?.email?.trim() || null,
      comprador_telefono: data.comprador?.telefono?.trim() || null,
      autorizado_por:     data.autorizadoPor?.trim() || null,
      fecha_autorizacion: data.fechaAutorizacion || null,
      moneda:             (data.moneda || 'USD').slice(0, 3),
    }
    const { data: oc, error } = await supabase
      .from('ordenes_compra').insert(cab).select('id, numero_oc').single()
    if (error) {
      if (esColision(error.message)) { lastErr = error; continue }  // colisión → recalcula
      throw error
    }
    const filas = items.map((it, i) => ({
      oc_id:           oc.id,
      posicion:        (i + 1) * 10,
      codigo:          it.codigo || null,
      descripcion:     it.descripcion || '(sin descripción)',
      fabricante:      it.fabricante || null,
      modelo:          it.modelo || null,
      especificacion:  it.especificacion || null,
      unidad:          it.unidad || 'UN',
      cantidad:        Number(it.cantidad) || 0,
      precio_unitario: Number(it.precioUnitario) || 0,
      fecha_entrega:   it.fechaEntrega || null,
    }))
    const { error: e2 } = await supabase.from('oc_items').insert(filas)
    if (e2) {
      await supabase.from('ordenes_compra').delete().eq('id', oc.id)  // rollback de cabecera
      throw e2
    }
    return { id: oc.id, numero: oc.numero_oc }
  }
  throw new Error('No se pudo asignar un número de OC único tras varios intentos. Inténtalo de nuevo.' + (lastErr ? ` (${lastErr.message})` : ''))
}
