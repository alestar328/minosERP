import { useState, useRef, useCallback, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, RefreshCw, Search, AlertCircle, Pencil, ChevronDown } from 'lucide-react'

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
  { nombre: 'Otros', bg: '#D3D1C7', fg: '#444441', reglas: [] },
]

/**
 * Classifies a SOLPED item into a category.
 * Pure function — applies rules in declaration order; first match wins.
 * Falls back to "Otros" if no rule matches.
 */
export function clasificarItem(item, categorias = CATEGORIAS_SOLPED) {
  const textoBreve = (item.textoBreve || '').toUpperCase()
  const grupo      = (item.grupoArticulos || '').toString()
  const tipoPos    = (item.tipoPos || '').toString()

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
  return 'Otros'
}

// ── Excel parser ──────────────────────────────────────────────────────────────
function parseSolpedSheet(workbook) {
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('El archivo no contiene hojas de cálculo.')
  const sheet = workbook.Sheets[sheetName]
  const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (rows.length < 2) throw new Error('El archivo no tiene filas de datos (mínimo encabezado + 1 fila).')

  const parsed = rows.slice(1)
    .filter(row => {
      const solped = (row[0] ?? '').toString().trim()
      return solped !== '' && !isNaN(Number(solped))
    })
    .map(row => {
      const item = {
        id:              crypto.randomUUID(),
        solped:          (row[0]  ?? '').toString().trim(),
        posicion:        (row[1]  ?? '').toString().trim(),
        codigoMaterial:  (row[2]  ?? '').toString().trim(),
        textoBreve:      (row[3]  ?? '').toString().trim(),
        especificacion:  (row[5]  ?? '').toString().trim(),
        cantidad:        Number(row[6])  || 0,
        unidad:          (row[7]  ?? '').toString().trim(),
        tipoPos:         (row[8]  ?? '').toString().trim(),
        solicitante:     (row[9]  ?? '').toString().trim(),
        valorTotal:      Number(row[10]) || 0,
        moneda:          ((row[11] ?? 'USD').toString().trim()) || 'USD',
        fechaLiberacion: (row[12] ?? '').toString().trim(),
        diasDesde:       Number(row[13]) || 0,
        grupoPlanif:     (row[16] ?? '').toString().trim(),
        areaNecesidad:   (row[18] ?? '').toString().trim(),
        grupoArticulos:  (row[21] ?? '').toString().trim(),
        grupoCompras:    (row[22] ?? '').toString().trim(),
        categoriaManual: false,
      }
      item.categoria = clasificarItem(item)
      return item
    })

  if (parsed.length === 0)
    throw new Error('No se encontraron filas válidas. Verifica que el archivo sea una exportación SOLPED de SAP.')
  return parsed
}

// ── Sample data ───────────────────────────────────────────────────────────────
const RAW_SAMPLES = [
  { solped:'10050131', posicion:'10', codigoMaterial:'M-2341',  textoBreve:'RODAMIENTO SKF 23040 CC/W33 C3',                  especificacion:'',                                              cantidad:4,    unidad:'UN',  tipoPos:'L', solicitante:'JLOPEZ',    valorTotal:4800,  moneda:'USD', fechaLiberacion:'01/04/2025', diasDesde:75,  grupoPlanif:'Mantenimiento', areaNecesidad:'Planta Concentradora', grupoArticulos:'29001', grupoCompras:'GC01' },
  { solped:'10050132', posicion:'10', codigoMaterial:'',        textoBreve:'SERV MANTTO PREVENTIVO BOMBA WARMAN 6/4',          especificacion:'Servicio de mantenimiento preventivo trimestral', cantidad:1,    unidad:'GL',  tipoPos:'F', solicitante:'RMENDOZA', valorTotal:12500, moneda:'USD', fechaLiberacion:'15/03/2025', diasDesde:92,  grupoPlanif:'Servicios',     areaNecesidad:'Mina',                 grupoArticulos:'',      grupoCompras:'GC02' },
  { solped:'10050133', posicion:'10', codigoMaterial:'Q-0045',  textoBreve:'XANTATO ISOPROPILICO AEROPHINE 3418A',             especificacion:'',                                              cantidad:2000, unidad:'KG',  tipoPos:'L', solicitante:'PCASAS',    valorTotal:9800,  moneda:'USD', fechaLiberacion:'20/04/2025', diasDesde:28,  grupoPlanif:'Reactivos',     areaNecesidad:'Procesamiento Mineral',grupoArticulos:'16020', grupoCompras:'GC03' },
  { solped:'10050134', posicion:'10', codigoMaterial:'E-0099',  textoBreve:'VARIADOR DE FRECUENCIA ABB ACS880 55KW',           especificacion:'',                                              cantidad:2,    unidad:'UN',  tipoPos:'L', solicitante:'FSORIA',    valorTotal:18600, moneda:'USD', fechaLiberacion:'10/03/2025', diasDesde:97,  grupoPlanif:'Eléctrico',     areaNecesidad:'Infraestructura',       grupoArticulos:'26010', grupoCompras:'GC01' },
  { solped:'10050135', posicion:'10', codigoMaterial:'L-0012',  textoBreve:'GRASA MOLYKOTE BR2 PLUS 180KG',                   especificacion:'',                                              cantidad:5,    unidad:'BL',  tipoPos:'L', solicitante:'JLOPEZ',    valorTotal:2250,  moneda:'USD', fechaLiberacion:'05/05/2025', diasDesde:12,  grupoPlanif:'Lubricación',   areaNecesidad:'Planta Concentradora', grupoArticulos:'17001', grupoCompras:'GC01' },
  { solped:'10050136', posicion:'10', codigoMaterial:'S-0234',  textoBreve:'CASCO MINERO 3M H700 BLANCO TIPO I CLASE E',      especificacion:'',                                              cantidad:50,   unidad:'UN',  tipoPos:'L', solicitante:'HSALAS',    valorTotal:1750,  moneda:'USD', fechaLiberacion:'22/04/2025', diasDesde:36,  grupoPlanif:'Seguridad',     areaNecesidad:'Seguridad y Salud',    grupoArticulos:'34005', grupoCompras:'GC04' },
  { solped:'10050137', posicion:'10', codigoMaterial:'X-0001',  textoBreve:'ANFO PESADO 94/6 PARA VOLADURA SUBTERRANEA',       especificacion:'Suministro de ANFO pesado campaña Q2 2025',     cantidad:120,  unidad:'TM',  tipoPos:'L', solicitante:'PGUERRERO', valorTotal:98400, moneda:'USD', fechaLiberacion:'01/03/2025', diasDesde:106, grupoPlanif:'Explosivos',    areaNecesidad:'Mina',                 grupoArticulos:'11001', grupoCompras:'GC05' },
  { solped:'10050138', posicion:'10', codigoMaterial:'C-0078',  textoBreve:'TUBERIA HDPE DN200 PN10 x 6m',                    especificacion:'',                                              cantidad:30,   unidad:'TRO', tipoPos:'L', solicitante:'MQUISPE',   valorTotal:6750,  moneda:'USD', fechaLiberacion:'18/04/2025', diasDesde:40,  grupoPlanif:'Construcción',  areaNecesidad:'Infraestructura',       grupoArticulos:'28003', grupoCompras:'GC01' },
  { solped:'10050139', posicion:'10', codigoMaterial:'R-0055',  textoBreve:'KIT SELLO MECANICO BOMBA WARMAN 6/4 AH',           especificacion:'',                                              cantidad:6,    unidad:'KIT', tipoPos:'L', solicitante:'JLOPEZ',    valorTotal:12150, moneda:'PEN', fechaLiberacion:'25/04/2025', diasDesde:33,  grupoPlanif:'Mantenimiento', areaNecesidad:'Planta Concentradora', grupoArticulos:'15020', grupoCompras:'GC01' },
  { solped:'10050140', posicion:'10', codigoMaterial:'',        textoBreve:'CALI INSTRUMENTOS DE MEDICION PLANTA PROCESO',     especificacion:'Calibración de instrumentos plan anual 2025',   cantidad:1,    unidad:'SV',  tipoPos:'F', solicitante:'FSORIA',    valorTotal:8200,  moneda:'USD', fechaLiberacion:'12/04/2025', diasDesde:46,  grupoPlanif:'Servicios',     areaNecesidad:'Procesamiento Mineral',grupoArticulos:'',      grupoCompras:'GC02' },
]

const SAMPLE_ITEMS = RAW_SAMPLES.map(item => ({
  ...item,
  id: crypto.randomUUID(),
  categoriaManual: false,
  categoria: clasificarItem(item),
}))

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

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ nombre, count, valorUSD, active, onClick }) {
  const info = catInfo(nombre)
  return (
    <button onClick={onClick}
      style={{ padding: '9px 13px', borderRadius: 8, background: active ? `${info.bg}25` : C.card, border: `1px solid ${active ? info.bg : C.border}`, cursor: 'pointer', textAlign: 'left', minWidth: 110, transition: 'border-color 0.1s, background 0.1s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: info.bg, flexShrink: 0 }} />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, color: active ? info.bg : C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{nombre}</span>
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 22, color: C.text, lineHeight: 1 }}>{count}</div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, marginTop: 3 }}>US$ {fmtMoney(valorUSD)}</div>
    </button>
  )
}

// ── Upload screen ─────────────────────────────────────────────────────────────
function UploadZone({ onFile, onSample, loading, error }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDrop = e => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 20 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        style={{ width: '100%', maxWidth: 520, padding: '48px 40px', borderRadius: 16, border: `2px dashed ${dragging ? C.primary : C.border}`, background: dragging ? `${C.primary}08` : C.card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, cursor: loading ? 'default' : 'pointer', transition: 'all 0.15s' }}>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = '' }} />

        {loading
          ? <RefreshCw size={44} style={{ color: C.primary, animation: 'spin 1s linear infinite' }} />
          : <FileSpreadsheet size={44} style={{ color: dragging ? C.primary : C.muted }} />
        }

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 17, color: C.text, marginBottom: 8 }}>
            {loading ? 'Procesando archivo...' : dragging ? 'Suelta para cargar' : 'Arrastra el Excel SOLPED aquí'}
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
            Exportación SAP de Solicitudes de Pedido<br />
            Formato <b style={{ color: C.text }}>.xlsx</b> o <b style={{ color: C.text }}>.xls</b>
          </div>
        </div>

        {!loading && (
          <button onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
            style={{ padding: '9px 28px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, background: C.primary, color: C.bg, border: 'none', cursor: 'pointer' }}>
            Seleccionar Archivo
          </button>
        )}
      </div>

      {error && (
        <div style={{ display: 'flex', gap: 12, padding: '14px 20px', borderRadius: 10, background: `${C.danger}15`, border: `1px solid ${C.danger}40`, maxWidth: 520, width: '100%' }}>
          <AlertCircle size={16} style={{ color: C.danger, flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: C.danger, marginBottom: 4 }}>Error al procesar el archivo</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted }}>{error}</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginTop: 6 }}>Asegúrate de que sea una exportación SOLPED de SAP con la estructura estándar (columnas 0–22).</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>¿No tienes un archivo listo?</div>
        <button onClick={onSample}
          style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.primary, background: 'transparent', border: `1px solid ${C.primary}40`, padding: '7px 18px', borderRadius: 8, cursor: 'pointer' }}>
          Cargar datos de ejemplo (10 ítems)
        </button>
      </div>
    </div>
  )
}

// ── Main SOLPED component ─────────────────────────────────────────────────────
export default function Solped({ isMobile = false }) {
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const [filename,  setFilename]  = useState(null)
  const [search,    setSearch]    = useState('')
  const [filtroCats,setFiltroCats]= useState([])
  const [filtroUrg, setFiltroUrg] = useState('todos')
  const [selected,  setSelected]  = useState(new Set())

  const loaded = items.length > 0

  const processFile = useCallback(file => {
    setLoading(true)
    setError(null)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' })
        const parsed = parseSolpedSheet(wb)
        setItems(parsed)
        setFilename(file.name)
        setSelected(new Set())
        setFiltroCats([])
        setFiltroUrg('todos')
        setSearch('')
      } catch (err) {
        setError(err.message ?? 'Error desconocido.')
      } finally {
        setLoading(false)
      }
    }
    reader.onerror = () => { setError('No se pudo leer el archivo.'); setLoading(false) }
    reader.readAsArrayBuffer(file)
  }, [])

  const loadSample = () => {
    setItems(SAMPLE_ITEMS)
    setFilename('ejemplo_solped.xlsx')
    setError(null)
    setSelected(new Set())
    setFiltroCats([])
    setFiltroUrg('todos')
    setSearch('')
  }

  const reset = () => {
    setItems([]); setFilename(null); setError(null)
    setSelected(new Set()); setFiltroCats([]); setFiltroUrg('todos'); setSearch('')
  }

  const editCategoria = (id, newCat) =>
    setItems(prev => prev.map(it => it.id === id ? { ...it, categoria: newCat, categoriaManual: true } : it))

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtrada = items.filter(it => {
    const q = search.toLowerCase()
    const mSearch = !q || it.textoBreve.toLowerCase().includes(q) || it.solped.includes(q) || it.solicitante.toLowerCase().includes(q)
    const mCat    = filtroCats.length === 0 || filtroCats.includes(it.categoria)
    const mUrg    = filtroUrg === 'todos' ||
      (filtroUrg === 'urgente'  && it.diasDesde > 60) ||
      (filtroUrg === 'atencion' && it.diasDesde > 30 && it.diasDesde <= 60) ||
      (filtroUrg === 'normal'   && it.diasDesde <= 30)
    return mSearch && mCat && mUrg
  })

  // ── Summary by category ────────────────────────────────────────────────────
  const summary = CATEGORIAS_SOLPED
    .map(cat => ({
      nombre:   cat.nombre,
      count:    items.filter(it => it.categoria === cat.nombre).length,
      valorUSD: items.filter(it => it.categoria === cat.nombre).reduce((s, it) => s + toUSD(it.valorTotal, it.moneda), 0),
    }))
    .filter(s => s.count > 0)

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

  if (!loaded) return <UploadZone onFile={processFile} onSample={loadSample} loading={loading} error={error} />

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: C.bg }}>

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      <div style={{ padding: isMobile ? '10px 14px' : '10px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : 'visible', alignItems: 'center', paddingBottom: isMobile ? 10 : undefined }}>
        {summary.map(s => (
          <SummaryCard key={s.nombre} nombre={s.nombre} count={s.count} valorUSD={s.valorUSD}
            active={filtroCats.includes(s.nombre)} onClick={() => toggleCatFilter(s.nombre)} />
        ))}
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
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.primary, fontWeight: 600 }}>
                {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
              </span>
            )}
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>
              {filtrada.length} de {items.length} ítems
            </span>
            <button onClick={reset}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 11, background: C.card, color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
              <Upload size={11} /> Cargar otro
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginRight: 2 }}>Categoría:</span>
          {CATEGORIAS_SOLPED.map(cat => {
            if (!items.some(it => it.categoria === cat.nombre)) return null
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

      {isMobile && (
        <div style={{ padding: '4px 14px 8px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 6, overflowX: 'auto' }}>
          {[['todos','Todos'],['urgente','⚡ >60d'],['atencion','⚠ 31–60d'],['normal','✓ ≤30d']].map(([val,lbl]) => (
            <button key={val} onClick={() => setFiltroUrg(val)}
              style={{ padding: '4px 10px', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: 11, background: filtroUrg === val ? `${C.primary}20` : C.card, color: filtroUrg === val ? C.primary : C.muted, border: `1px solid ${filtroUrg === val ? C.primary : C.border}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {lbl}
            </button>
          ))}
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', minWidth: isMobile ? 380 : 1060, borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12, tableLayout: isMobile ? 'auto' : 'fixed' }}>
          {!isMobile && (
            <colgroup>
              <col style={{ width: 38  }} />
              <col style={{ width: 112 }} />
              <col />
              <col style={{ width: 148 }} />
              <col style={{ width: 90  }} />
              <col style={{ width: 118 }} />
              <col style={{ width: 90  }} />
              <col style={{ width: 108 }} />
              <col style={{ width: 155 }} />
            </colgroup>
          )}
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: C.card, boxShadow: `0 1px 0 ${C.border}` }}>
            <tr>
              <th style={{ padding: '10px 0 10px 12px', textAlign: 'center', width: 34 }}>
                <input
                  type="checkbox"
                  ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                  checked={allSelected}
                  onChange={toggleAll}
                  style={{ cursor: 'pointer', accentColor: C.primary }}
                />
              </th>
              {!isMobile && <th style={{ padding: '10px 8px 10px 0', textAlign: 'left', fontWeight: 500, fontSize: 11, color: C.muted, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>SOLPED</th>}
              <th style={{ padding: '10px 8px 10px 0', textAlign: 'left', fontWeight: 500, fontSize: 11, color: C.muted, letterSpacing: '0.05em' }}>Descripción</th>
              <th style={{ padding: '10px 8px 10px 0', textAlign: 'left', fontWeight: 500, fontSize: 11, color: C.muted, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Categoría</th>
              <th style={{ padding: '10px 8px 10px 0', textAlign: 'left', fontWeight: 500, fontSize: 11, color: C.muted, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Cant.</th>
              {!isMobile && <th style={{ padding: '10px 8px 10px 0', textAlign: 'left', fontWeight: 500, fontSize: 11, color: C.muted, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Valor</th>}
              <th style={{ padding: '10px 8px 10px 0', textAlign: 'left', fontWeight: 500, fontSize: 11, color: C.muted, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Urgencia</th>
              {!isMobile && <th style={{ padding: '10px 8px 10px 0', textAlign: 'left', fontWeight: 500, fontSize: 11, color: C.muted, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Solicitante</th>}
              {!isMobile && <th style={{ padding: '10px 8px 10px 0', textAlign: 'left', fontWeight: 500, fontSize: 11, color: C.muted, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Área</th>}
            </tr>
          </thead>
          <tbody>
            {filtrada.length === 0 ? (
              <tr>
                <td colSpan={isMobile ? 5 : 9} style={{ padding: 48, textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted }}>
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
                  <td style={{ padding: '7px 0 7px 0', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }} title={it.areaNecesidad}>
                    {it.areaNecesidad || '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
