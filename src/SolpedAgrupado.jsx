import { useState, useMemo, useRef, useEffect } from 'react'
import { Building2, Package, ChevronDown, ChevronRight, FileText, X, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react'
import { CATEGORIAS_SOLPED } from './Solped.jsx'
import { cargarProveedores, proveedoresParaCategoria } from './proveedoresData.js'

const C = {
  bg: '#F5F6F7', card: '#FFFFFF', shell: '#354A5E',
  primary: '#0070F2', brand: '#0854A0',
  gold: '#E78C07', text: '#32363A', muted: '#6A6D70',
  border: '#E5E5E5', borderInput: '#BABABA',
  danger: '#BB0000', warn: '#E78C07', info: '#0070F2', success: '#188F3A',
}

const TC_PEN_USD = 3.75
const toUSD    = (val, mon) => (mon === 'PEN' ? val / TC_PEN_USD : val)
const fmtMoney = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
const catInfo  = n => CATEGORIAS_SOLPED.find(c => c.nombre === n) ?? CATEGORIAS_SOLPED.at(-1)

function CatDot({ nombre }) {
  const info = catInfo(nombre)
  return <span style={{ width: 10, height: 10, borderRadius: 2, background: info.bg, flexShrink: 0, display: 'inline-block' }} />
}

// ── Borrador de OC consolidado por proveedor ──────────────────────────────────
function BorradorOC({ borrador, isMobile, onClose, onConfirmar, confirmada }) {
  const { proveedor, grupos, totalUSD, totalItems } = borrador

  const overlay = isMobile
    ? { position: 'fixed', inset: 0, zIndex: 80, background: C.bg, display: 'flex', flexDirection: 'column', overflow: 'auto' }
    : { position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(50,54,58,0.50)', padding: 20 }
  const box = isMobile
    ? { background: C.card, display: 'flex', flexDirection: 'column', flex: 1 }
    : { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 'min(720px, 96vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.22)' }

  return (
    <div style={overlay} onClick={isMobile ? undefined : onClose}>
      <div style={box} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: isMobile ? '16px 16px 12px' : '20px 24px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: isMobile ? 16 : 18, color: C.text }}>Orden de compra — borrador</span>
              <span style={{ fontSize: 10, color: C.gold, background: `${C.gold}18`, border: `1px solid ${C.gold}40`, padding: '1px 8px', borderRadius: 3, fontWeight: 600 }}>BORRADOR</span>
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, marginTop: 4 }}>
              <b style={{ color: C.text }}>{proveedor.razonSocial}</b> · RUC {proveedor.ruc} · {totalItems} ítem{totalItems !== 1 ? 's' : ''} en {grupos.length} categoría{grupos.length !== 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}><X size={18} style={{ color: C.muted }} /></button>
        </div>

        {/* Datos proveedor */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12, padding: isMobile ? '14px 16px' : '16px 24px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          {[
            ['Proveedor', proveedor.razonSocial],
            ['Contacto', proveedor.contactoNombre || '—'],
            ['Email', proveedor.contactoEmail || '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Ítems por categoría */}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '8px 16px 16px' : '12px 24px 16px' }}>
          {grupos.map(g => (
            <div key={g.categoria} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <CatDot nombre={g.categoria} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: C.text }}>{g.categoria}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>· {g.items.length} ítem{g.items.length !== 1 ? 's' : ''}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 11 }}>
                <thead>
                  <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                    <th style={{ textAlign: 'left', fontWeight: 500, padding: '0 8px 6px 0' }}>Código</th>
                    <th style={{ textAlign: 'left', fontWeight: 500, padding: '0 8px 6px 0' }}>Descripción</th>
                    <th style={{ textAlign: 'right', fontWeight: 500, padding: '0 8px 6px 0', whiteSpace: 'nowrap' }}>Cant.</th>
                    <th style={{ textAlign: 'right', fontWeight: 500, padding: '0 0 6px 0', whiteSpace: 'nowrap' }}>Valor (US$)</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map(it => (
                    <tr key={it.id} style={{ borderBottom: `1px solid ${C.border}40` }}>
                      <td style={{ padding: '6px 8px 6px 0', color: C.muted, whiteSpace: 'nowrap' }}>{it.codigoMaterial || '—'}</td>
                      <td style={{ padding: '6px 8px 6px 0', color: C.text }}>{it.textoBreve}</td>
                      <td style={{ padding: '6px 8px 6px 0', textAlign: 'right', whiteSpace: 'nowrap', color: C.text }}>{it.cantidad.toLocaleString('es-PE')} {it.unidad}</td>
                      <td style={{ padding: '6px 0 6px 0', textAlign: 'right', whiteSpace: 'nowrap', color: C.text }}>{fmtMoney(toUSD(it.valorTotal, it.moneda))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: isMobile ? '12px 16px 20px' : '14px 24px', borderTop: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>
            Borrador — la emisión formal de la OC se conectará a la base de datos en la siguiente fase.
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total estimado</div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 18, color: C.primary }}>US$ {fmtMoney(totalUSD)}</div>
            </div>
            <button onClick={() => onConfirmar(proveedor.id)} disabled={confirmada}
              style={{ padding: '10px 22px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, border: 'none', cursor: confirmada ? 'default' : 'pointer', background: confirmada ? C.success : C.primary, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
              {confirmada ? <><CheckCircle size={15} /> OC generada</> : 'Generar OC'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de una categoría (grupo de materiales + asignación de proveedor) ──
function GrupoCategoria({ grupo, proveedores, asignado, onAsignar, onEditCategoria, isMobile }) {
  const [abierto, setAbierto] = useState(true)
  const info = catInfo(grupo.categoria)
  const sugeridos = useMemo(() => proveedoresParaCategoria(proveedores, grupo.categoria), [proveedores, grupo.categoria])
  const otros = proveedores.filter(p => p.activo !== false && !sugeridos.some(s => s.id === p.id))
  const top = sugeridos[0]
  const provAsignado = proveedores.find(p => p.id === asignado)

  return (
    <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, overflow: 'hidden' }}>
      {/* Cabecera del grupo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: `${info.bg}14`, borderBottom: abierto ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}
        onClick={() => setAbierto(a => !a)}>
        {abierto ? <ChevronDown size={15} style={{ color: C.muted, flexShrink: 0 }} /> : <ChevronRight size={15} style={{ color: C.muted, flexShrink: 0 }} />}
        <span style={{ padding: '3px 10px', borderRadius: 4, background: info.bg, color: info.fg, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700 }}>{grupo.categoria}</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted }}>{grupo.items.length} ítem{grupo.items.length !== 1 ? 's' : ''}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700, color: C.text }}>US$ {fmtMoney(grupo.valorUSD)}</span>
          {provAsignado
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: C.success, background: `${C.success}14`, border: `1px solid ${C.success}40`, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}><CheckCircle size={12} /> Asignado</span>
            : <span style={{ fontSize: 11, fontWeight: 600, color: C.warn, background: `${C.warn}14`, border: `1px solid ${C.warn}40`, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>Sin proveedor</span>}
        </div>
      </div>

      {abierto && (
        <div style={{ padding: isMobile ? '12px 14px' : '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Asignación de proveedor */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 10, alignItems: isMobile ? 'stretch' : 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <Building2 size={14} style={{ color: C.muted }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text, fontWeight: 600 }}>Proveedor</span>
            </div>
            <select value={asignado || ''} onChange={e => onAsignar(grupo.categoria, e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: C.bg, border: `1px solid ${asignado ? C.success : C.border}`, color: C.text, outline: 'none', minWidth: 0 }}>
              <option value="">— Selecciona un proveedor —</option>
              {sugeridos.length > 0 && (
                <optgroup label={`Sugeridos para «${grupo.categoria}»`}>
                  {sugeridos.map(p => <option key={p.id} value={p.id}>{p.razonSocial}{p.homologado ? ' ✓ homologado' : ''}</option>)}
                </optgroup>
              )}
              {otros.length > 0 && (
                <optgroup label="Otros proveedores">
                  {otros.map(p => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
                </optgroup>
              )}
            </select>
          </div>

          {/* Sugerencia */}
          {top ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 8, background: `${C.primary}0A`, border: `1px solid ${C.primary}25` }}>
              <Sparkles size={14} style={{ color: C.primary, flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.text }}>
                Más idóneo: <b>{top.razonSocial}</b>
                <span style={{ color: C.muted }}> — {top._motivos.join(' · ')}</span>
                {asignado !== top.id && (
                  <button onClick={() => onAsignar(grupo.categoria, top.id)}
                    style={{ marginLeft: 8, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Asignar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 8, background: `${C.warn}0E`, border: `1px solid ${C.warn}33` }}>
              <AlertTriangle size={14} style={{ color: C.warn, flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.text }}>
                Ningún proveedor de tu base cubre «{grupo.categoria}». Regístralo en <b>Proveedores</b> o asigna uno manualmente arriba.
              </div>
            </div>
          )}

          {/* Materiales del grupo */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 11, minWidth: isMobile ? 340 : 'auto' }}>
              <thead>
                <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ textAlign: 'left', fontWeight: 500, padding: '0 8px 6px 0', whiteSpace: 'nowrap' }}>SOLPED</th>
                  <th style={{ textAlign: 'left', fontWeight: 500, padding: '0 8px 6px 0' }}>Descripción</th>
                  <th style={{ textAlign: 'right', fontWeight: 500, padding: '0 8px 6px 0', whiteSpace: 'nowrap' }}>Cant.</th>
                  <th style={{ textAlign: 'right', fontWeight: 500, padding: '0 8px 6px 0', whiteSpace: 'nowrap' }}>Valor</th>
                  <th style={{ textAlign: 'left', fontWeight: 500, padding: '0 0 6px 0', whiteSpace: 'nowrap' }}>Recategorizar</th>
                </tr>
              </thead>
              <tbody>
                {grupo.items.map(it => (
                  <tr key={it.id} style={{ borderBottom: `1px solid ${C.border}30` }}>
                    <td style={{ padding: '6px 8px 6px 0', color: C.primary, fontWeight: 600, whiteSpace: 'nowrap' }}>{it.solped}<span style={{ color: C.muted, fontWeight: 400 }}> ·{it.posicion}</span></td>
                    <td style={{ padding: '6px 8px 6px 0', color: C.text }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title={it.textoBreve}>{it.textoBreve}</div>
                      {it.codigoMaterial && <div style={{ fontSize: 10, color: C.muted }}>{it.codigoMaterial}</div>}
                    </td>
                    <td style={{ padding: '6px 8px 6px 0', textAlign: 'right', whiteSpace: 'nowrap', color: C.text }}>{it.cantidad.toLocaleString('es-PE')} {it.unidad}</td>
                    <td style={{ padding: '6px 8px 6px 0', textAlign: 'right', whiteSpace: 'nowrap', color: C.text }}>{it.moneda} {fmtMoney(it.valorTotal)}</td>
                    <td style={{ padding: '6px 0 6px 0' }}>
                      <select value={grupo.categoria} onChange={e => onEditCategoria(it.id, e.target.value)}
                        style={{ padding: '3px 6px', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: 10, background: C.bg, border: `1px solid ${C.border}`, color: C.muted, outline: 'none', cursor: 'pointer' }}>
                        {CATEGORIAS_SOLPED.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Vista principal: agrupar por categoría + asignar proveedor + OC ───────────
export default function SolpedAgrupado({ items, isMobile, onEditCategoria }) {
  const [proveedores] = useState(() => cargarProveedores())
  const [asignaciones, setAsignaciones] = useState({})   // { [categoria]: proveedorId }
  const [borrador, setBorrador] = useState(null)          // OC consolidada en preview
  const [generadas, setGeneradas] = useState(() => new Set()) // proveedorId con OC confirmada
  const [toast, setToast] = useState(null)
  const sugeridoInicial = useRef(new Set())               // categorías ya autosugeridas
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const flash = msg => { setToast(msg); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 2600) }

  // Agrupa los ítems por categoría (en el orden de la taxonomía).
  const grupos = useMemo(() => {
    return CATEGORIAS_SOLPED
      .map(cat => {
        const its = items.filter(it => it.categoria === cat.nombre)
        return { categoria: cat.nombre, items: its, valorUSD: its.reduce((s, it) => s + toUSD(it.valorTotal, it.moneda), 0) }
      })
      .filter(g => g.items.length > 0)
  }, [items])

  // Autosugiere el proveedor más idóneo la primera vez que aparece cada categoría.
  useEffect(() => {
    setAsignaciones(prev => {
      const next = { ...prev }
      let changed = false
      for (const g of grupos) {
        if (sugeridoInicial.current.has(g.categoria)) continue
        sugeridoInicial.current.add(g.categoria)
        const top = proveedoresParaCategoria(proveedores, g.categoria)[0]
        if (top && next[g.categoria] === undefined) { next[g.categoria] = top.id; changed = true }
      }
      return changed ? next : prev
    })
  }, [grupos, proveedores])

  const asignar = (categoria, provId) => setAsignaciones(prev => ({ ...prev, [categoria]: provId }))

  // Consolida las categorías asignadas por proveedor → una OC por proveedor.
  const ocsPorProveedor = useMemo(() => {
    const map = new Map()
    for (const g of grupos) {
      const provId = asignaciones[g.categoria]
      if (!provId) continue
      const prov = proveedores.find(p => p.id === provId)
      if (!prov) continue
      if (!map.has(provId)) map.set(provId, { proveedor: prov, grupos: [], totalUSD: 0, totalItems: 0 })
      const entry = map.get(provId)
      entry.grupos.push(g)
      entry.totalUSD += g.valorUSD
      entry.totalItems += g.items.length
    }
    return [...map.values()].sort((a, b) => b.totalUSD - a.totalUSD)
  }, [grupos, asignaciones, proveedores])

  const totalUSD = grupos.reduce((s, g) => s + g.valorUSD, 0)
  const totalItems = items.length
  const categoriasAsignadas = grupos.filter(g => asignaciones[g.categoria]).length

  const confirmarOC = provId => { setGeneradas(prev => new Set(prev).add(provId)); flash('✓ OC generada (borrador)'); setBorrador(null) }

  const panel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Órdenes de compra a generar
      </div>
      {ocsPorProveedor.length === 0 ? (
        <div style={{ padding: '18px 14px', borderRadius: 10, border: `1px dashed ${C.border}`, textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted }}>
          Asigna un proveedor a cada categoría para consolidar sus órdenes de compra aquí.
        </div>
      ) : ocsPorProveedor.map(oc => {
        const lista = oc.grupos.map(g => g.categoria)
        const generada = generadas.has(oc.proveedor.id)
        return (
          <div key={oc.proveedor.id} style={{ padding: 12, borderRadius: 10, border: `1px solid ${generada ? C.success + '66' : C.border}`, background: C.card }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 700, color: C.text }}>{oc.proveedor.razonSocial}</span>
              {oc.proveedor.homologado && <CheckCircle size={13} style={{ color: C.success }} />}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginTop: 2 }}>RUC {oc.proveedor.ruc}</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', margin: '8px 0' }}>
              {lista.map(c => {
                const ci = catInfo(c)
                return <span key={c} style={{ padding: '2px 7px', borderRadius: 3, background: ci.bg, color: ci.fg, fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600 }}>{c}</span>
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>{oc.totalItems} ítem{oc.totalItems !== 1 ? 's' : ''}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 800, color: C.primary }}>US$ {fmtMoney(oc.totalUSD)}</span>
            </div>
            <button onClick={() => setBorrador(oc)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: generada ? `${C.success}14` : C.primary, color: generada ? C.success : '#fff', border: generada ? `1px solid ${C.success}55` : 'none' }}>
              {generada ? <><CheckCircle size={13} /> OC generada — ver</> : <><FileText size={13} /> Ver borrador de OC</>}
            </button>
          </div>
        )
      })}
    </div>
  )

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* Resumen superior */}
      <div style={{ padding: isMobile ? '10px 14px' : '12px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: isMobile ? 14 : 28, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          ['Categorías', grupos.length, C.text],
          ['Materiales', totalItems, C.text],
          ['Asignadas', `${categoriasAsignadas}/${grupos.length}`, categoriasAsignadas === grupos.length ? C.success : C.warn],
          ['OCs a generar', ocsPorProveedor.length, C.primary],
          ['Valor total', `US$ ${fmtMoney(totalUSD)}`, C.primary],
        ].map(([label, value, color]) => (
          <div key={label}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: isMobile ? 16 : 18, color, marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Contenido: grupos + panel de consolidación */}
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '12px 14px' : '16px 24px' }}>
        {grupos.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, color: C.muted }}>
            <Package size={28} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13 }}>Sin materiales para agrupar con los filtros actuales.</span>
          </div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {grupos.map(g => (
              <GrupoCategoria key={g.categoria} grupo={g} proveedores={proveedores} asignado={asignaciones[g.categoria]} onAsignar={asignar} onEditCategoria={onEditCategoria} isMobile={isMobile} />
            ))}
            <div style={{ marginTop: 4 }}>{panel}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {grupos.map(g => (
                <GrupoCategoria key={g.categoria} grupo={g} proveedores={proveedores} asignado={asignaciones[g.categoria]} onAsignar={asignar} onEditCategoria={onEditCategoria} isMobile={isMobile} />
              ))}
            </div>
            <div style={{ position: 'sticky', top: 0 }}>{panel}</div>
          </div>
        )}
      </div>

      {borrador && (
        <BorradorOC borrador={borrador} isMobile={isMobile} confirmada={generadas.has(borrador.proveedor.id)}
          onClose={() => setBorrador(null)} onConfirmar={confirmarOC} />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 90, background: C.shell, color: '#fff', padding: '10px 18px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
