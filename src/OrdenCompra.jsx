import { useState, useEffect, useRef } from 'react'
import { listarSelecciones, itemsDeSeleccion } from './solpedRepo.js'

const C = {
  bg: '#F5F6F7', card: '#FFFFFF', shell: '#354A5E',
  primary: '#0070F2', brand: '#0854A0',
  gold: '#E78C07', text: '#32363A', muted: '#6A6D70',
  border: '#E5E5E5', borderInput: '#BABABA',
  danger: '#BB0000', warn: '#E78C07',
}

const today = () => new Date().toISOString().slice(0, 10)

function fmtDate(s) {
  if (!s) return ''
  const parts = s.split('-')
  if (parts.length !== 3) return s
  const [y, m, d] = parts
  return `${d}.${m}.${y}`
}

const mkItem = () => ({
  id: crypto.randomUUID(),
  codigo: '', descripcion: '', especificacion: '',
  unidad: 'UN', cantidad: 1, precioUnitario: 0, fechaEntrega: ''
})

// ─── EXAMPLE DATA (MOCK desactivado para pruebas reales — borrar más adelante) ─
/*
const EJEMPLO = {
  numeroOC: '4500047816',
  fechaEmision: '2025-05-20',
  emisor: {
    nombre: 'MINERALES DEL ANDE S.A.A.',
    ruc: '20543219876',
    direccion: 'Av. República de Panamá 3030, Piso 8, San Isidro - Lima',
    telefono: '(01) 611-8800'
  },
  proveedor: {
    ruc: '20489123456',
    razonSocial: 'ENVASES INDUSTRIALES DEL NORTE S.A.C.',
    direccion: 'AV. INDUSTRIAL VILLA EL SALVADOR NRO 821, LIMA',
    telefono: '(01) 567-8901',
    contacto: 'R. MENDOZA',
    email: 'ventas@envasnorte.com.pe'
  },
  comprador: {
    nombre: 'Sandra Huanca',
    telefono: '(01) 611-8800 anexo 214',
    email: 'sandra.huanca@minandes.com.pe'
  },
  items: [
    { id: '1', codigo: '14003059', descripcion: 'CILINDRO METALICO MARRON C/TAPA CON ASA', especificacion: 'USO: RESIDUOS ORGANICOS. CILINDRO DE 55GAL; PLANCHA DE ACERO LAF 0.9MM; TIPO FRH TAPA REMOVIBLE CON ASA DE 3CM; COLOR: MARRON; SEGUN CODIGO DE COLORES ADJUNTO.', unidad: 'UN', cantidad: 4, precioUnitario: 52, fechaEntrega: '2025-06-05' },
    { id: '2', codigo: '14003060', descripcion: 'CILINDRO METALICO AMARILLO C/TAPA CON ASA', especificacion: 'CILINDRO DE 55GAL; PLANCHA ACERO LAF 0.9MM; COLOR: AMARILLO; USO: RESIDUOS METALICOS.', unidad: 'UN', cantidad: 4, precioUnitario: 52, fechaEntrega: '2025-06-05' },
    { id: '3', codigo: '14003062', descripcion: 'CILINDRO METALICO AZUL C/TAPA CON ASA', especificacion: 'CILINDRO DE 55GAL; COLOR: AZUL; USO: RESIDUOS PAPEL Y CARTON.', unidad: 'UN', cantidad: 2, precioUnitario: 52, fechaEntrega: '2025-06-05' },
    { id: '4', codigo: '14003063', descripcion: 'CILINDRO METALICO BLANCO C/TAPA CON ASA', especificacion: 'CILINDRO DE 55GAL; COLOR: BLANCO; USO: RESIDUOS DE PLASTICO.', unidad: 'UN', cantidad: 2, precioUnitario: 52, fechaEntrega: '2025-06-05' },
  ],
  autorizadoPor: 'CARLOS VARGAS',
  fechaAutorizacion: '2025-05-20',
  plazoEntrega: 15,
  lugarEntrega: 'ALMACEN UNIDAD CERRO AZUL',
  formaPago: 30
}
*/

const INIT = () => ({
  numeroOC: '4500047816',
  fechaEmision: today(),
  emisor: { nombre: '', ruc: '', direccion: '', telefono: '' },
  proveedor: { ruc: '', razonSocial: '', direccion: '', telefono: '', contacto: '', email: '' },
  comprador: { nombre: '', telefono: '', email: '' },
  items: [mkItem()],
  autorizadoPor: '',
  fechaAutorizacion: today(),
  plazoEntrega: '',
  lugarEntrega: '',
  formaPago: 30,
})

// ─── FORM COMPONENTS ──────────────────────────────────────────────────────────
function Inp({ label, value, onChange, type = 'text', placeholder, span = 1, disabled = false }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: `span ${span}` }}>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: disabled ? C.muted : C.text, background: disabled ? `${C.border}55` : `${C.bg}cc`, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', outline: 'none', width: '100%', boxSizing: 'border-box', cursor: disabled ? 'not-allowed' : 'text' }}
      />
    </label>
  )
}

function Sec({ title, cols, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
        {children}
      </div>
    </div>
  )
}

// ─── BUSCADOR DE COD.SELECT.SOLPED ────────────────────────────────────────────
// Lista las selecciones generadas en la ventana SOLPED y, al elegir una, carga
// sus líneas (código, descripción, especificación = modelo, cantidad y unidad).
function SeleccionPicker({ onLoad, isMobile }) {
  const [open, setOpen]           = useState(false)
  const [q, setQ]                 = useState('')
  const [list, setList]           = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [loadingId, setLoadingId] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    setLoading(true); setError(null)
    listarSelecciones().then(setList).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const filtered = list.filter(s => {
    const t = q.trim().toLowerCase()
    if (!t) return true
    return s.codigo.toLowerCase().includes(t) || (s.etiqueta || '').toLowerCase().includes(t) || (s.cliente || '').toLowerCase().includes(t)
  })

  const pick = async s => {
    setLoadingId(s.id); setError(null)
    try {
      const items = await itemsDeSeleccion(s.id)
      onLoad(items, s.codigo)
      setOpen(false); setQ('')
    } catch (e) { setError(e.message) }
    finally { setLoadingId(null) }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 6, background: `${C.brand}14`, border: `1px solid ${C.brand}40`, color: C.brand, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11, whiteSpace: 'nowrap' }}>
        Cargar COD.SELECT.SOLPED ▾
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, zIndex: 50, width: isMobile ? 270 : 350, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,0.18)', padding: 10 }}>
          <input value={q} onChange={e => setQ(e.target.value)} autoFocus placeholder="Buscar código, etiqueta o cliente…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: 12, background: `${C.bg}cc`, border: `1px solid ${C.border}`, color: C.text, outline: 'none', marginBottom: 8 }} />
          {error && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.danger, padding: '4px 2px 8px' }}>{error}</div>}
          {loading ? (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, padding: '10px 2px' }}>Cargando…</div>
          ) : filtered.length === 0 ? (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, padding: '10px 2px', lineHeight: 1.5 }}>
              {q ? 'Sin coincidencias.' : 'Aún no hay selecciones. Genera una desde la ventana SOLPED (botón «Generar orden»).'}
            </div>
          ) : (
            <div style={{ maxHeight: 290, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map(s => (
                <button key={s.id} onClick={() => pick(s)} disabled={loadingId === s.id}
                  style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 6, background: loadingId === s.id ? `${C.brand}10` : 'transparent', border: `1px solid ${C.border}`, cursor: loadingId === s.id ? 'default' : 'pointer' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, color: C.brand }}>{s.codigo}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, marginTop: 2 }}>
                    {[s.etiqueta, s.cliente].filter(Boolean).join(' · ')}{(s.etiqueta || s.cliente) ? ' · ' : ''}{s.nItems} ítem{s.nItems !== 1 ? 's' : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── FORM SCREEN ──────────────────────────────────────────────────────────────
function FormOC({ data, setData, onPreview, isMobile }) {
  const cols = isMobile ? 2 : 4
  // Fecha de emisión arranca bloqueada (solo lectura) con la fecha de hoy.
  // El botón "Editar" la habilita para corrección manual puntual.
  const [editFecha, setEditFecha] = useState(false)
  const [avisoSel, setAvisoSel]   = useState('')   // aviso efímero al cargar un COD.SELECT.SOLPED
  const set = (k, v) => setData(d => ({ ...d, [k]: v }))
  const nest = (f, k, v) => setData(d => ({ ...d, [f]: { ...d[f], [k]: v } }))
  const setItem = (id, k, v) => setData(d => ({ ...d, items: d.items.map(it => it.id === id ? { ...it, [k]: v } : it) }))
  const addItem = () => setData(d => ({ ...d, items: [...d.items, mkItem()] }))
  const removeItem = id => setData(d => ({ ...d, items: d.items.filter(it => it.id !== id) }))

  // Carga las líneas de una selección (COD.SELECT.SOLPED) en los ítems de la OC.
  // Descarta los ítems vacíos previos (p.ej. la fila inicial en blanco) y añade.
  const cargarSeleccion = (loaded, codigo) => {
    if (!loaded?.length) return
    const nuevos = loaded.map(r => ({
      ...mkItem(),
      codigo:         r.codigo || '',
      descripcion:    r.descripcion || '',
      especificacion: r.especificacion || '',
      unidad:         r.unidad || 'UN',
      cantidad:       r.cantidad ?? 1,
    }))
    setData(d => {
      const conDatos = d.items.filter(it => it.codigo || it.descripcion || it.especificacion)
      return { ...d, items: [...conDatos, ...nuevos] }
    })
    setAvisoSel(`Cargados ${nuevos.length} ítem${nuevos.length !== 1 ? 's' : ''} de ${codigo}.`)
    setTimeout(() => setAvisoSel(a => a.includes(codigo) ? '' : a), 5000)
  }

  const valorVenta = data.items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0)
  const igv = valorVenta * 0.18
  const total = valorVenta + igv

  const cellInp = {
    fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.text,
    background: `${C.bg}aa`, border: `1px solid ${C.border}`, borderRadius: 4,
    padding: '4px 6px', outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const TH = { fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, padding: '0 8px 8px', textAlign: 'left', fontWeight: 500, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }
  const TD = { padding: '6px 8px', verticalAlign: 'top' }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px' : '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* CABECERA */}
      {/*
        ───────────────────────────────────────────────────────────────────────
        CÓDIGO DE CLIENTE EN EL N° DE OC
        ───────────────────────────────────────────────────────────────────────
        Los dos primeros dígitos del N° de Orden de Compra identifican al cliente
        al que pertenece la orden. Convención provisional:
            45 -> Cliente 1
            46 -> Cliente 2
            47 -> Cliente 3
            ...
        Así, con solo mirar el prefijo, se sabe a qué cliente corresponde la OC.

        PENDIENTE (decisión del socio): el factor que determina el código de cada
        cliente todavía no está definido (¿correlativo?, ¿RUC?, ¿unidad minera?,
        ¿asignación manual?). Cuando se decida, aquí debe vivir el mapeo
        cliente -> prefijo y la generación automática del numeroOC. Por ahora el
        número se ingresa/edita manualmente.
        ───────────────────────────────────────────────────────────────────────
      */}
      <Sec title="Cabecera" cols={cols}>
        <Inp label="N° Orden de Compra" value={data.numeroOC} onChange={v => set('numeroOC', v)} span={isMobile ? 1 : 2} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, gridColumn: `span ${isMobile ? 1 : 2}` }}>
          <div style={{ flex: 1 }}>
            <Inp label="Fecha de emisión" value={data.fechaEmision} onChange={v => set('fechaEmision', v)} type="date" disabled={!editFecha} />
          </div>
          <button
            type="button"
            onClick={() => setEditFecha(e => !e)}
            title={editFecha ? 'Bloquear fecha' : 'Editar fecha de emisión'}
            style={{ height: 33, padding: '0 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11, whiteSpace: 'nowrap',
              background: editFecha ? C.primary : 'none',
              border: `1px solid ${editFecha ? C.primary : C.border}`,
              color: editFecha ? C.bg : C.muted }}>
            {editFecha ? 'Listo' : 'Editar'}
          </button>
        </div>
      </Sec>

      {/* EMISOR */}
      <Sec title="Emisor — empresa que emite la OC" cols={cols}>
        <Inp label="Nombre empresa" value={data.emisor.nombre} onChange={v => nest('emisor', 'nombre', v)} span={isMobile ? 2 : 2} />
        <Inp label="RUC" value={data.emisor.ruc} onChange={v => nest('emisor', 'ruc', v)} />
        <Inp label="Teléfono" value={data.emisor.telefono} onChange={v => nest('emisor', 'telefono', v)} />
        <Inp label="Dirección" value={data.emisor.direccion} onChange={v => nest('emisor', 'direccion', v)} span={cols} />
      </Sec>

      {/* PROVEEDOR */}
      <Sec title="Proveedor" cols={cols}>
        <Inp label="RUC" value={data.proveedor.ruc} onChange={v => nest('proveedor', 'ruc', v)} />
        <Inp label="Razón Social" value={data.proveedor.razonSocial} onChange={v => nest('proveedor', 'razonSocial', v)} span={isMobile ? 1 : 3} />
        <Inp label="Dirección" value={data.proveedor.direccion} onChange={v => nest('proveedor', 'direccion', v)} span={cols} />
        <Inp label="Teléfono" value={data.proveedor.telefono} onChange={v => nest('proveedor', 'telefono', v)} />
        <Inp label="Contacto" value={data.proveedor.contacto} onChange={v => nest('proveedor', 'contacto', v)} />
        <Inp label="Email" value={data.proveedor.email} onChange={v => nest('proveedor', 'email', v)} span={isMobile ? 2 : 2} />
      </Sec>

      {/* COMPRADOR */}
      <Sec title="Comprador — responsable interno" cols={isMobile ? 2 : 3}>
        <Inp label="Nombre" value={data.comprador.nombre} onChange={v => nest('comprador', 'nombre', v)} />
        <Inp label="Teléfono" value={data.comprador.telefono} onChange={v => nest('comprador', 'telefono', v)} />
        <Inp label="Email" value={data.comprador.email} onChange={v => nest('comprador', 'email', v)} span={isMobile ? 2 : 1} />
      </Sec>

      {/* ÍTEMS */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ítems</span>
          <div style={{ flex: 1, height: 1, background: C.border, minWidth: 20 }} />
          <SeleccionPicker onLoad={cargarSeleccion} isMobile={isMobile} />
          <button onClick={addItem}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 6, background: `${C.primary}18`, border: `1px solid ${C.primary}40`, color: C.primary, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11 }}>
            + Agregar ítem
          </button>
        </div>
        {avisoSel && (
          <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 6, background: `${C.brand}10`, border: `1px solid ${C.brand}33`, fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.brand }}>
            {avisoSel}
          </div>
        )}
        {isMobile ? (
          /* ── Mobile: stacked item cards ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.items.map((it, idx) => {
              const sub = (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0)
              return (
                <div key={it.id} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 12px 8px', background: C.card, position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: C.primary }}>Ítem {idx + 1}</span>
                    <button onClick={() => removeItem(it.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 4, background: `${C.danger}15`, border: `1px solid ${C.danger}40`, color: C.danger, cursor: 'pointer', fontSize: 14 }}>×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase' }}>Código</span>
                      <input value={it.codigo} onChange={e => setItem(it.id, 'codigo', e.target.value)} style={cellInp} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase' }}>UM</span>
                      <input value={it.unidad} onChange={e => setItem(it.id, 'unidad', e.target.value)} style={cellInp} />
                    </label>
                  </div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase' }}>Descripción</span>
                    <input value={it.descripcion} onChange={e => setItem(it.id, 'descripcion', e.target.value)} style={cellInp} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase' }}>Especificación</span>
                    <textarea value={it.especificacion} onChange={e => setItem(it.id, 'especificacion', e.target.value)} rows={2} style={{ ...cellInp, resize: 'none' }} />
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase' }}>Cantidad</span>
                      <input type="number" min="0" value={it.cantidad} onChange={e => setItem(it.id, 'cantidad', e.target.value)} style={{ ...cellInp, textAlign: 'right' }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase' }}>P. Unit.</span>
                      <input type="number" min="0" step="0.01" value={it.precioUnitario} onChange={e => setItem(it.id, 'precioUnitario', e.target.value)} style={{ ...cellInp, textAlign: 'right' }} />
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase' }}>Subtotal</span>
                      <div style={{ ...cellInp, textAlign: 'right', color: C.primary, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{sub.toFixed(2)}</div>
                    </div>
                  </div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase' }}>F. Entrega</span>
                    <input type="date" value={it.fechaEntrega} onChange={e => setItem(it.id, 'fechaEntrega', e.target.value)} style={cellInp} />
                  </label>
                </div>
              )
            })}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted }}>Valor Venta: <strong style={{ color: C.text }}>{valorVenta.toFixed(2)}</strong></div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted }}>IGV 18%: {igv.toFixed(2)}</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700, color: C.primary }}>TOTAL: {total.toFixed(2)}</div>
            </div>
          </div>
        ) : (
          /* ── Desktop: full table ── */
          <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12, minWidth: 900 }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: 80 }}>Código</th>
                  <th style={{ ...TH, width: 190 }}>Descripción</th>
                  <th style={TH}>Especificación técnica</th>
                  <th style={{ ...TH, width: 55 }}>UM</th>
                  <th style={{ ...TH, width: 75 }}>Cant.</th>
                  <th style={{ ...TH, width: 95 }}>P. Unit.</th>
                  <th style={{ ...TH, width: 95, textAlign: 'right' }}>Subtotal</th>
                  <th style={{ ...TH, width: 125 }}>F. Entrega</th>
                  <th style={{ ...TH, width: 34 }} />
                </tr>
              </thead>
              <tbody>
                {data.items.map(it => {
                  const sub = (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0)
                  return (
                    <tr key={it.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={TD}><input value={it.codigo} onChange={e => setItem(it.id, 'codigo', e.target.value)} style={cellInp} /></td>
                      <td style={TD}><input value={it.descripcion} onChange={e => setItem(it.id, 'descripcion', e.target.value)} style={cellInp} /></td>
                      <td style={TD}><textarea value={it.especificacion} onChange={e => setItem(it.id, 'especificacion', e.target.value)} rows={2} style={{ ...cellInp, resize: 'vertical', minHeight: 52 }} /></td>
                      <td style={TD}><input value={it.unidad} onChange={e => setItem(it.id, 'unidad', e.target.value)} style={cellInp} /></td>
                      <td style={TD}><input type="number" min="0" value={it.cantidad} onChange={e => setItem(it.id, 'cantidad', e.target.value)} style={{ ...cellInp, textAlign: 'right' }} /></td>
                      <td style={TD}><input type="number" min="0" step="0.01" value={it.precioUnitario} onChange={e => setItem(it.id, 'precioUnitario', e.target.value)} style={{ ...cellInp, textAlign: 'right' }} /></td>
                      <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: C.primary, verticalAlign: 'middle' }}>{sub.toFixed(2)}</td>
                      <td style={TD}><input type="date" value={it.fechaEntrega} onChange={e => setItem(it.id, 'fechaEntrega', e.target.value)} style={cellInp} /></td>
                      <td style={{ ...TD, verticalAlign: 'middle' }}>
                        <button onClick={() => removeItem(it.id)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 4, background: `${C.danger}15`, border: `1px solid ${C.danger}40`, color: C.danger, cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${C.border}` }}>
                  <td colSpan={5} />
                  <td style={{ padding: '7px 8px', fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, textAlign: 'right' }}>Valor Venta</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text }}>{valorVenta.toFixed(2)}</td>
                  <td colSpan={2} />
                </tr>
                <tr>
                  <td colSpan={5} />
                  <td style={{ padding: '4px 8px', fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, textAlign: 'right' }}>IGV 18%</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>{igv.toFixed(2)}</td>
                  <td colSpan={2} />
                </tr>
                <tr style={{ borderTop: `1px solid ${C.border}` }}>
                  <td colSpan={5} />
                  <td style={{ padding: '7px 8px', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, color: C.primary, textAlign: 'right' }}>TOTAL</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'Inter', fontSize: 15, fontWeight: 900, color: C.primary }}>{total.toFixed(2)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* CONDICIONES */}
      <Sec title="Condiciones" cols={cols}>
        <Inp label="Plazo de entrega (días)" value={data.plazoEntrega} onChange={v => set('plazoEntrega', v)} type="number" />
        <Inp label="Lugar de entrega" value={data.lugarEntrega} onChange={v => set('lugarEntrega', v)} />
        <Inp label="Forma de pago (días)" value={data.formaPago} onChange={v => set('formaPago', v)} type="number" />
        <Inp label="Autorizado por" value={data.autorizadoPor} onChange={v => set('autorizadoPor', v)} />
        <Inp label="Fecha de autorización" value={data.fechaAutorizacion} onChange={v => set('fechaAutorizacion', v)} type="date" span={isMobile ? 2 : 2} />
      </Sec>

      {/* ACTION BUTTONS */}
      <div style={{ display: 'flex', gap: 10, paddingBottom: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {/* ── MOCK desactivado para pruebas reales (borrar más adelante) ──
        <button onClick={() => setData(EJEMPLO)}
          style={{ padding: '10px 20px', borderRadius: 8, background: 'none', border: `1px solid ${C.border}`, color: C.muted, fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' }}>
          Cargar ejemplo
        </button>
        */}
        <button onClick={onPreview}
          style={{ padding: '10px 28px', borderRadius: 8, background: C.primary, border: 'none', color: C.bg, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Ver documento →
        </button>
      </div>
    </div>
  )
}

// ─── DOCUMENT PREVIEW ─────────────────────────────────────────────────────────
function DocOC({ data, onBack }) {
  const { items = [] } = data
  const valorVenta = items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0), 0)
  const igv = valorVenta * 0.18
  const total = valorVenta + igv

  const MONO = { fontFamily: "'Courier New', Courier, monospace" }
  const B1 = '1px solid #333'
  const B2 = '1px solid #888'

  const thDoc = { ...MONO, background: '#e0e0e0', fontWeight: 600, padding: '4px 6px', border: B2, fontSize: 10, textAlign: 'center', verticalAlign: 'middle' }
  const td = (extra = {}) => ({ ...MONO, padding: '3px 5px', border: B2, verticalAlign: 'top', fontSize: 11, ...extra })

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#c8c8c8', padding: '16px 10px' }}>

      {/* FLOATING CONTROLS — hidden on print */}
      <div className="no-print" style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' }}>
          ← Volver al formulario
        </button>
        <button onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 22px', borderRadius: 8, background: C.primary, border: 'none', color: C.bg, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Imprimir / Guardar PDF
        </button>
      </div>

      {/* DOCUMENT */}
      <div id="oc-document" style={{ ...MONO, background: '#fff', maxWidth: 900, margin: '0 auto', fontSize: 11, color: '#000', lineHeight: 1.45 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', ...MONO, fontSize: 11, color: '#000' }}>
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '34%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '17%' }} />
          </colgroup>
          <tbody>

            {/* ── HEADER ROW ── */}
            <tr>
              <td colSpan={8} style={{ border: B1, padding: '8px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 88, height: 44, border: '1px solid #bbb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#aaa', flexShrink: 0, borderRadius: 2, letterSpacing: 2 }}>LOGO</div>
                  <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5 }}>
                    Orden De Compra N°&nbsp;{data.numeroOC}
                  </div>
                  <div style={{ fontSize: 10, color: '#555', whiteSpace: 'nowrap' }}>
                    <div>Fecha: {fmtDate(data.fechaEmision)}</div>
                    <div>Página 1 de 1</div>
                  </div>
                </div>
              </td>
            </tr>

            {/* ── INFO BLOCK ── */}
            <tr>
              <td colSpan={4} style={{ border: B1, padding: '8px 10px', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>{data.emisor.nombre}</div>
                <div>RUC: {data.emisor.ruc}</div>
                <div>DIRECCION: {data.emisor.direccion}</div>
                <div>Teléfono: {data.emisor.telefono}</div>
                <div style={{ height: 7 }} />
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>PROVEEDOR</div>
                <div>RUC: {data.proveedor.ruc}</div>
                <div>Razón Social: {data.proveedor.razonSocial}</div>
                <div>Dirección: {data.proveedor.direccion}</div>
                {data.proveedor.telefono && <div>Teléfono: {data.proveedor.telefono}</div>}
                {data.proveedor.contacto && <div>Contacto: {data.proveedor.contacto}</div>}
                {data.proveedor.email && <div>E-mail: {data.proveedor.email}</div>}
              </td>
              <td colSpan={4} style={{ border: B1, padding: '8px 10px', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>COMPRADOR</div>
                <div>{'Nombre  : '}{data.comprador.nombre}</div>
                <div>{'Teléfono: '}{data.comprador.telefono}</div>
                <div>{'E-mail  : '}{data.comprador.email}</div>
                <div style={{ height: 7 }} />
                <div style={{ fontWeight: 'bold', marginBottom: 2 }}>FACTURAR A:</div>
                <div>{data.emisor.nombre}</div>
                <div>RUC: {data.emisor.ruc}</div>
                <div>Dirección: {data.emisor.direccion}</div>
              </td>
            </tr>

            {/* ── ITEMS HEADER ── */}
            <tr>
              {['ITEM', 'CÓDIGO', 'DESCRIPCIÓN', 'UM', 'CANT', 'P.UNIT', 'SUBTOTAL', 'F.ENTR'].map(h => (
                <th key={h} style={thDoc}>{h}</th>
              ))}
            </tr>

            {/* ── ITEM ROWS ── */}
            {items.map((it, idx) => {
              const sub = (Number(it.cantidad) || 0) * (Number(it.precioUnitario) || 0)
              return (
                <tr key={it.id} className="no-break">
                  <td style={td({ textAlign: 'center' })}>{String((idx + 1) * 10).padStart(5, '0')}</td>
                  <td style={td()}>{it.codigo}</td>
                  <td style={td()}>
                    <div style={{ fontWeight: 500 }}>{it.descripcion}</div>
                    {it.especificacion && (
                      <div style={{ fontSize: 9, color: '#555', marginTop: 3, lineHeight: 1.4 }}>{it.especificacion}</div>
                    )}
                  </td>
                  <td style={td({ textAlign: 'center' })}>{it.unidad}</td>
                  <td style={td({ textAlign: 'right' })}>{it.cantidad}</td>
                  <td style={td({ textAlign: 'right' })}>{Number(it.precioUnitario).toFixed(2)}</td>
                  <td style={td({ textAlign: 'right', fontWeight: 600 })}>{sub.toFixed(2)}</td>
                  <td style={td({ textAlign: 'center' })}>{fmtDate(it.fechaEntrega)}</td>
                </tr>
              )
            })}

            {/* ── TOTALS ── */}
            <tr>
              <td colSpan={8} style={{ border: B1, padding: '5px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <table style={{ borderCollapse: 'collapse', ...MONO, fontSize: 11 }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '2px 16px 2px 0', textAlign: 'right' }}>VALOR VENTA&nbsp;&nbsp;US $</td>
                        <td style={{ padding: '2px 0', textAlign: 'right', minWidth: 80 }}>{valorVenta.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 16px 2px 0', textAlign: 'right' }}>VALOR IGV</td>
                        <td style={{ padding: '2px 0', textAlign: 'right' }}>{igv.toFixed(2)}</td>
                      </tr>
                      <tr style={{ borderTop: '1px solid #999' }}>
                        <td style={{ padding: '3px 16px 2px 0', textAlign: 'right', fontWeight: 'bold' }}>TOTAL</td>
                        <td style={{ padding: '3px 0 2px', textAlign: 'right', fontWeight: 'bold' }}>{total.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>

            {/* ── FOOTER ── */}
            <tr>
              <td colSpan={8} style={{ border: B1, padding: '7px 12px' }}>
                <div style={{ marginBottom: 3 }}>
                  Autorizado Por:&nbsp;<strong>{data.autorizadoPor}</strong>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Fecha: {fmtDate(data.fechaAutorizacion)}
                </div>
                {data.plazoEntrega && <div>- PLAZO DE ENTREGA: {data.plazoEntrega} DIAS.</div>}
                {data.lugarEntrega && <div>- LUGAR DE ENTREGA: {data.lugarEntrega}.</div>}
                {data.formaPago && <div>- FORMA DE PAGO: {data.formaPago} DIAS.</div>}
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function OrdenCompra({ isMobile }) {
  const [screen, setScreen] = useState('form')
  const [data, setData] = useState(INIT)

  if (screen === 'preview') return <DocOC data={data} onBack={() => setScreen('form')} />
  return <FormOC data={data} setData={setData} onPreview={() => setScreen('preview')} isMobile={isMobile} />
}
