import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import Solped, { CATEGORIAS_SOLPED } from './Solped.jsx'
import OrdenCompra from './OrdenCompra.jsx'
import { PROV_KEY, SAMPLE_PROVEEDORES } from './proveedoresData.js'
import Login from './Login.jsx'
import { supabase } from './supabaseClient.js'
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  LayoutDashboard, Users, ShoppingCart, FileText, Package,
  Bell, Plus, Eye, X, Calendar, CheckCircle, Search,
  ClipboardList, Monitor, Smartphone, MoreHorizontal,
  ChevronRight, Download, Copy, AlertTriangle, LogOut,
} from 'lucide-react'

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#F5F6F7', card: '#FFFFFF', shell: '#354A5E',
  primary: '#0070F2', brand: '#0854A0',
  gold: '#E78C07', text: '#32363A', muted: '#6A6D70',
  border: '#E5E5E5', borderInput: '#BABABA',
  danger: '#BB0000', warn: '#E78C07', info: '#0070F2', success: '#188F3A',
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const monthlyData = [
  { mes: 'Dic', solpeds: 28, ocs: 24 },
  { mes: 'Ene', solpeds: 31, ocs: 29 },
  { mes: 'Feb', solpeds: 26, ocs: 25 },
  { mes: 'Mar', solpeds: 34, ocs: 30 },
  { mes: 'Abr', solpeds: 29, ocs: 28 },
  { mes: 'May', solpeds: 38, ocs: 34 },
]
const recentActivity = [
  { oc: 'OC-2025-0341', solped: 'SP-2025-0521', proveedor: 'Pirotec Andina S.A.',      estado: 'En tránsito', entrega: '02/06/2025', dias: 5  },
  { oc: 'OC-2025-0340', solped: 'SP-2025-0519', proveedor: 'Chemindus Perú S.A.',      estado: 'Emitida',     entrega: '10/06/2025', dias: 13 },
  { oc: 'OC-2025-0339', solped: 'SP-2025-0515', proveedor: 'Maquinex del Perú S.A.',  estado: 'Retrasada',   entrega: '25/05/2025', dias: -3 },
  { oc: 'OC-2025-0338', solped: 'SP-2025-0514', proveedor: 'GasAndes S.A.C.',          estado: 'En tránsito', entrega: '30/05/2025', dias: 2  },
  { oc: 'OC-2025-0337', solped: 'SP-2025-0510', proveedor: 'SegurPro Perú S.A.',       estado: 'Entregada',   entrega: '20/05/2025', dias: 0  },
]
const alertas = [
  { tipo: 'danger',  icon: Package,      msg: '2 OCs con entrega vencida',                      sub: 'OC-2025-0339 · OC-2025-0335 — Seguimiento urgente', detail: 'ocs-retrasadas'    },
  { tipo: 'warn',    icon: Calendar,     msg: '8 entregas previstas en los próximos 7 días',    sub: 'Confirmar despacho con proveedores',                detail: 'entregas-semana'   },
  { tipo: 'warn',    icon: ClipboardList,msg: '12 SOLPEDs pendientes de procesar',              sub: 'Backlog acumulado — 3 con prioridad alta',          detail: 'solpeds-pendientes'},
  { tipo: 'success', icon: CheckCircle,  msg: '16 OCs entregadas este mes',                     sub: 'Tasa de cumplimiento: 89% — Meta: 90%',             detail: 'ocs-entregadas'    },
]
// ─── DRILL-DOWN DATASETS (dashboard → detalle) ────────────────────────────────
// Datos mock detallados que respaldan cada KPI y cada alerta del dashboard.
const _PROV = ['Pirotec Andina S.A.', 'Chemindus Perú S.A.', 'Maquinex del Perú S.A.', 'GasAndes S.A.C.', 'SegurPro Perú S.A.', 'Rodacol S.A.C.', 'Metalmaq Industrial S.R.L.', 'Neumatex Andina S.A.', 'Lubriandes S.A.', 'GasIndus S.A.C.', 'Laborindus S.A.C.', 'Segurindus Perú S.A.C.']
const _CAT  = ['Explosivos', 'Reactivos', 'Repuestos OEM', 'Combustibles', 'EPP', 'Repuestos', 'Maquinaria', 'Gases', 'Lubricantes', 'Insumos', 'Servicios', 'Eléctrico / E&I']
const _BASE = new Date(2025, 5, 7) // 07/06/2025 — fecha de referencia del demo
const _fecha = (offset) => {
  const d = new Date(_BASE); d.setDate(d.getDate() + offset)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// KPI «SOLPEDs pendientes» (12) · también alerta «12 SOLPEDs pendientes»
const solpedsPendientes = [
  { id: 'SP-2025-0533', solicitante: 'C. Mendoza',  area: 'Operaciones Mina',     categoria: 'Explosivos',     fecha: '05/06/2025', prioridad: 'Alta',  monto: 124000 },
  { id: 'SP-2025-0532', solicitante: 'L. Paredes',  area: 'Planta Concentradora', categoria: 'Reactivos',      fecha: '05/06/2025', prioridad: 'Alta',  monto: 86000  },
  { id: 'SP-2025-0531', solicitante: 'R. Quispe',   area: 'Mantenimiento',        categoria: 'Repuestos OEM',  fecha: '04/06/2025', prioridad: 'Media', monto: 42000  },
  { id: 'SP-2025-0530', solicitante: 'M. Tello',    area: 'Mantenimiento',        categoria: 'Repuestos',      fecha: '04/06/2025', prioridad: 'Media', monto: 18500  },
  { id: 'SP-2025-0529', solicitante: 'A. Flores',   area: 'Seguridad',            categoria: 'EPP',            fecha: '03/06/2025', prioridad: 'Alta',  monto: 23000  },
  { id: 'SP-2025-0528', solicitante: 'J. Ríos',     area: 'Logística',            categoria: 'Combustibles',   fecha: '03/06/2025', prioridad: 'Baja',  monto: 54000  },
  { id: 'SP-2025-0527', solicitante: 'P. Salas',    area: 'Laboratorio',          categoria: 'Reactivos',      fecha: '02/06/2025', prioridad: 'Media', monto: 12000  },
  { id: 'SP-2025-0526', solicitante: 'D. Cárdenas', area: 'Operaciones Mina',     categoria: 'Maquinaria',     fecha: '02/06/2025', prioridad: 'Baja',  monto: 310000 },
  { id: 'SP-2025-0525', solicitante: 'V. Romero',   area: 'Eléctrico / E&I',      categoria: 'Eléctrico / E&I',fecha: '01/06/2025', prioridad: 'Media', monto: 67000  },
  { id: 'SP-2025-0524', solicitante: 'S. Núñez',    area: 'Mantenimiento',        categoria: 'Lubricantes',    fecha: '01/06/2025', prioridad: 'Baja',  monto: 29000  },
  { id: 'SP-2025-0523', solicitante: 'F. Aguilar',  area: 'Planta Concentradora', categoria: 'Insumos',        fecha: '31/05/2025', prioridad: 'Baja',  monto: 8400   },
  { id: 'SP-2025-0522', solicitante: 'G. Loayza',   area: 'Seguridad',            categoria: 'EPP',            fecha: '31/05/2025', prioridad: 'Media', monto: 15600  },
]

// KPI «OCs activas» (34)
const ocsActivas = Array.from({ length: 34 }, (_, i) => {
  const dias = 3 + (i * 7) % 22
  return {
    oc:        `OC-2025-${String(340 - i).padStart(4, '0')}`,
    solped:    `SP-2025-${String(520 - i).padStart(4, '0')}`,
    proveedor: _PROV[i % _PROV.length],
    categoria: _CAT[i % _CAT.length],
    estado:    i % 3 === 0 ? 'Emitida' : 'En tránsito',
    entrega:   _fecha(dias),
    dias,
    monto:     18000 + ((i * 37) % 80) * 1500,
  }
})

// KPI «Entregas esta semana» (8) · también alerta «8 entregas previstas»
const entregasSemana = [
  { oc: 'OC-2025-0341', proveedor: 'Pirotec Andina S.A.',     categoria: 'Explosivos',   entrega: '09/06/2025', dias: 2, estado: 'En tránsito', contacto: 'ventas@pirotec.com.pe'    },
  { oc: 'OC-2025-0340', proveedor: 'Chemindus Perú S.A.',     categoria: 'Reactivos',    entrega: '10/06/2025', dias: 3, estado: 'Emitida',     contacto: 'pedidos@chemindus.com.pe' },
  { oc: 'OC-2025-0338', proveedor: 'GasAndes S.A.C.',         categoria: 'Combustibles', entrega: '10/06/2025', dias: 3, estado: 'En tránsito', contacto: 'despacho@gasandes.com.pe' },
  { oc: 'OC-2025-0336', proveedor: 'SegurPro Perú S.A.',      categoria: 'EPP',          entrega: '11/06/2025', dias: 4, estado: 'En tránsito', contacto: 'ventas@segurpro.com.pe'   },
  { oc: 'OC-2025-0334', proveedor: 'Metalmaq Industrial S.R.L.', categoria: 'Maquinaria',entrega: '12/06/2025', dias: 5, estado: 'Emitida',     contacto: 'compras@metalmaq.com.pe' },
  { oc: 'OC-2025-0333', proveedor: 'GasIndus S.A.C.',         categoria: 'Gases',        entrega: '12/06/2025', dias: 5, estado: 'En tránsito', contacto: 'ventas@gasindus.com.pe'   },
  { oc: 'OC-2025-0332', proveedor: 'Lubriandes S.A.',         categoria: 'Lubricantes',  entrega: '13/06/2025', dias: 6, estado: 'En tránsito', contacto: 'pedidos@lubriandes.com.pe'},
  { oc: 'OC-2025-0331', proveedor: 'Rodacol S.A.C.',          categoria: 'Repuestos',    entrega: '14/06/2025', dias: 7, estado: 'Emitida',     contacto: 'ventas@rodacol.com.pe'    },
]

// KPI «OCs retrasadas» (2) · también alerta «2 OCs con entrega vencida»
const ocsRetrasadas = [
  { oc: 'OC-2025-0339', solped: 'SP-2025-0515', proveedor: 'Maquinex del Perú S.A.', entrega: '25/05/2025', retraso: 3, monto: 210000, motivo: 'Demora en aduana — importación', contacto: 'import@maquinex.com.pe' },
  { oc: 'OC-2025-0335', solped: 'SP-2025-0508', proveedor: 'Rodacol S.A.C.',         entrega: '22/05/2025', retraso: 6, monto: 48000,  motivo: 'Stock insuficiente del proveedor', contacto: 'ventas@rodacol.com.pe'   },
]

// Alerta «16 OCs entregadas este mes»
const ocsEntregadas = Array.from({ length: 16 }, (_, i) => ({
  oc:        `OC-2025-${String(306 - i).padStart(4, '0')}`,
  proveedor: _PROV[i % _PROV.length],
  categoria: _CAT[i % _CAT.length],
  entrega:   _fecha(-2 - i * 2),
  otif:      [100, 100, 96, 100, 92, 100, 88, 100, 100, 95, 100, 90, 100, 100, 97, 100][i],
  monto:     15000 + ((i * 29) % 70) * 1400,
}))

const proveedoresStatic = [
  { id: 1, nombre: 'Pirotec Andina S.A.',      ruc: '20601234001', cats: ['Explosivos', 'Insumos'],       score: 92, estado: 'Homologado',  otif: 96 },
  { id: 2, nombre: 'Chemindus Perú S.A.',      ruc: '20601234002', cats: ['Reactivos', 'Explosivos'],     score: 88, estado: 'Homologado',  otif: 91 },
  { id: 3, nombre: 'Maquinex del Perú S.A.',   ruc: '20601234003', cats: ['Repuestos OEM', 'Maquinaria'], score: 74, estado: 'Condicional', otif: 82 },
  { id: 4, nombre: 'GasAndes S.A.C.',          ruc: '20601234004', cats: ['Gases', 'Combustibles'],       score: 85, estado: 'Homologado',  otif: 94 },
  { id: 5, nombre: 'SegurPro Perú S.A.',       ruc: '20601234005', cats: ['EPP', 'Seguridad'],            score: 79, estado: 'Homologado',  otif: 87 },
  { id: 6, nombre: 'Rodacol S.A.C.',           ruc: '20601234006', cats: ['Rodamientos', 'Repuestos'],    score: 55, estado: 'Condicional', otif: 71 },
  { id: 7, nombre: 'Pyrotec Industrial S.A.',  ruc: '20601234007', cats: ['Explosivos'],                  score: 38, estado: 'Pendiente',   otif: 0  },
  { id: 8, nombre: 'Metalmaq Industrial S.R.L.',ruc: '20601234008', cats: ['Maquinaria', 'Repuestos OEM'], score: 95, estado: 'Homologado',  otif: 98 },
]
const evalHistory = [
  { fecha: 'Mar 2025', financiero: 90, tecnico: 94, legal: 92, ambiental: 91 },
  { fecha: 'Sep 2024', financiero: 87, tecnico: 91, legal: 90, ambiental: 89 },
  { fecha: 'Mar 2024', financiero: 84, tecnico: 88, legal: 87, ambiental: 86 },
]
const provScores = {
  1: { fin: 90, tec: 94, leg: 92, amb: 91 }, 2: { fin: 86, tec: 90, leg: 88, amb: 87 },
  3: { fin: 65, tec: 72, leg: 80, amb: 70 }, 4: { fin: 82, tec: 88, leg: 86, amb: 84 },
  5: { fin: 76, tec: 82, leg: 80, amb: 78 }, 6: { fin: 50, tec: 58, leg: 55, amb: 52 },
  7: { fin: 35, tec: 40, leg: 38, amb: 36 }, 8: { fin: 96, tec: 95, leg: 94, amb: 95 },
}
const acuerdos = {
  vigentes: [
    { nombre: 'Suministro Explosivos ANFO',  proveedor: 'Pirotec Andina S.A.',      cat: 'Explosivos',   valor: 2400000, vence: '15/05/2026', ejec: 38 },
    { nombre: 'Reactivos Flotación Cu',      proveedor: 'Chemindus Perú S.A.',      cat: 'Reactivos',    valor: 1800000, vence: '30/09/2025', ejec: 71 },
    { nombre: 'Repuestos Flota Mina',        proveedor: 'Metalmaq Industrial S.R.L.',cat: 'Maquinaria',   valor: 3200000, vence: '31/12/2025', ejec: 44 },
    { nombre: 'EPP Estándar Corporativo',    proveedor: 'SegurPro Perú S.A.',       cat: 'EPP',          valor: 480000,  vence: '30/06/2025', ejec: 82 },
    { nombre: 'Combustibles Planta',         proveedor: 'GasAndes S.A.C.',          cat: 'Combustibles', valor: 960000,  vence: '28/02/2026', ejec: 29 },
    { nombre: 'Rodamientos Críticos Mina',   proveedor: 'Rodacol S.A.C.',           cat: 'Repuestos',    valor: 240000,  vence: '31/10/2025', ejec: 56 },
    { nombre: 'Insumos Lab Metalurgia',      proveedor: 'Laborindus S.A.C.',        cat: 'Reactivos',    valor: 180000,  vence: '15/11/2025', ejec: 48 },
    { nombre: 'Vestuario Industrial',        proveedor: 'Segurindus Perú S.A.C.',   cat: 'EPP',          valor: 120000,  vence: '31/08/2025', ejec: 65 },
  ],
  porRenovar: [
    { nombre: 'Neumáticos Flota Mina',   proveedor: 'Neumatex Andina S.A.',  cat: 'Repuestos OEM', valor: 560000, vence: '30/06/2025', ejec: 91 },
    { nombre: 'Gases Industriales',      proveedor: 'GasIndus S.A.C.',       cat: 'Gases',         valor: 320000, vence: '15/07/2025', ejec: 87 },
    { nombre: 'Aceites y Lubricantes',   proveedor: 'Lubriandes S.A.',       cat: 'Insumos',       valor: 240000, vence: '20/07/2025', ejec: 79 },
  ],
  vencidos: [
    { nombre: 'Acero Estructural',       proveedor: 'Siderúrgica del Sur S.A.', cat: 'Materiales', valor: 180000, vence: '30/04/2025', ejec: 100 },
  ],
}
// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

function ScoreBar({ value, size = 'md' }) {
  const color = value >= 80 ? C.primary : value >= 60 ? C.gold : C.danger
  const h = size === 'sm' ? 'h-1.5' : 'h-2'
  return (
    <div className={`w-full rounded-full ${h}`} style={{ background: C.border }}>
      <div className={`${h} rounded-full`} style={{ width: `${value}%`, background: color }} />
    </div>
  )
}

const BADGE_STYLES = {
  Aprobada:    { bg: '#E8F5E9', fg: '#1B6B2E' }, Completada:  { bg: '#E8F5E9', fg: '#1B6B2E' },
  Homologado:  { bg: '#E8F5E9', fg: '#1B6B2E' }, Vigente:     { bg: '#E8F5E9', fg: '#1B6B2E' },
  Normal:      { bg: '#E8F5E9', fg: '#1B6B2E' },
  Pendiente:   { bg: '#FFF3E0', fg: '#C76B00' }, Condicional: { bg: '#FFF3E0', fg: '#C76B00' },
  Bajo:        { bg: '#FFF3E0', fg: '#C76B00' }, 'Por Renovar': { bg: '#FFF3E0', fg: '#C76B00' },
  Urgente:     { bg: '#FDECEA', fg: '#9E0000' }, Rechazado:   { bg: '#FDECEA', fg: '#9E0000' },
  Vencido:     { bg: '#FDECEA', fg: '#9E0000' }, Crítico:     { bg: '#FDECEA', fg: '#9E0000' },
  'En tránsito': { bg: '#E3F0FF', fg: '#0050B3' },
  Marco:       { bg: '#E3F0FF', fg: '#0050B3' }, Spot:        { bg: '#F0F0FF', fg: '#5000B3' },
  Importación: { bg: '#F0F0FF', fg: '#5000B3' }, Borrador:    { bg: '#F4F4F4', fg: '#6A6D70' },
}

function Badge({ children }) {
  const s = BADGE_STYLES[children] || { bg: '#F4F4F4', fg: '#6A6D70' }
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.fg, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500 }}>
      {children}
    </span>
  )
}

function Card({ children, className = '', style, ...rest }) {
  return <div className={`rounded-lg ${className}`} style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', ...style }} {...rest}>{children}</div>
}

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', fontSize: 12, color: C.text, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <div style={{ fontWeight: 600, marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color, fontFamily: 'Inter, sans-serif' }}>{p.name}: {p.value}K</div>)}
    </div>
  )
}

function GaugeMini({ label, value }) {
  const color = value >= 80 ? C.primary : value >= 60 ? C.gold : C.danger
  const r = 26, cx = 34, cy = 34
  const circ = Math.PI * r
  const offset = circ * (1 - value / 100)
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="68" height="42">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={C.border} strokeWidth={6} />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color}
          strokeWidth={6} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
        <text x={cx} y={cy + 1} textAnchor="middle" fontSize={10} fontFamily="IBM Plex Mono" fontWeight="600" fill={C.text}>{value}</text>
      </svg>
      <div style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', color: C.muted }}>{label}</div>
    </div>
  )
}

// ─── CATEGORÍAS PALETTE (Proveedores CRUD) ────────────────────────────────────
// Taxonomía única: proveedores y materiales SOLPED comparten la MISMA lista de
// categorías (fuente: CATEGORIAS_SOLPED en Solped.jsx, que además trae las reglas
// de auto-clasificación). Así, agregar/editar una categoría se hace en un solo sitio.
const CATEGORIAS = CATEGORIAS_SOLPED

function inputStyle(err) {
  return { width: '100%', padding: '8px 12px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: C.bg, border: `1px solid ${err ? C.danger : C.border}`, color: C.text, outline: 'none' }
}

function FormField({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, letterSpacing: '0.05em' }}>{label}</label>
      {children}
      {error && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.danger }}>{error}</span>}
    </div>
  )
}

function CatBadge({ nombre }) {
  const cat = CATEGORIAS.find(c => c.nombre === nombre)
  return (
    <span style={{ padding: '2px 8px', borderRadius: 3, background: cat ? cat.bg : C.border, color: cat ? cat.fg : C.muted, fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, display: 'inline-block' }}>
      {nombre}
    </span>
  )
}

const EMPTY_FORM = { razonSocial: '', ruc: '', nombreComercial: '', contactoNombre: '', contactoEmail: '', contactoTelefono: '', categorias: [], notas: '' }

function validateProvForm(form) {
  const errs = {}
  if (!form.razonSocial.trim()) errs.razonSocial = 'Obligatorio'
  if (!form.ruc.trim()) errs.ruc = 'Obligatorio'
  else if (!/^\d{11}$/.test(form.ruc.trim())) errs.ruc = 'Debe tener exactamente 11 dígitos numéricos'
  if (!form.contactoEmail.trim()) errs.contactoEmail = 'Obligatorio'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactoEmail.trim())) errs.contactoEmail = 'Formato de email inválido'
  if (form.categorias.length === 0) errs.categorias = 'Selecciona al menos una categoría'
  return errs
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard',   label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'solped',      label: 'SOLPEDs',    icon: ClipboardList   },
  { id: 'proveedores', label: 'Proveedores', icon: Users           },
  { id: 'ordenes',     label: 'Órdenes',    icon: ShoppingCart    },
  { id: 'acuerdos',    label: 'Acuerdos',   icon: FileText        },
]
const NAV_PRIMARY   = NAV
const NAV_SECONDARY = []

// ─── BOTTOM NAV (mobile) ──────────────────────────────────────────────────────
function BottomNav({ active, onNav }) {
  return (
    <div className="no-print" style={{ flexShrink: 0, background: C.card, borderTop: `1px solid ${C.border}`, boxShadow: '0 -2px 8px rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div style={{ height: 56, display: 'flex', alignItems: 'stretch' }}>
        {NAV_PRIMARY.map(({ id, label, icon: Icon }) => {
          const on = active === id
          return (
            <button key={id} onClick={() => onNav(id)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', color: on ? C.primary : C.muted, borderTop: `2px solid ${on ? C.primary : 'transparent'}` }}>
              <Icon size={18} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, fontWeight: on ? 600 : 400 }}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── SIDEBAR (desktop) ────────────────────────────────────────────────────────
function Sidebar({ active, onNav }) {
  return (
    <div className="no-print" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: 220, background: C.card, borderRight: `1px solid ${C.border}`, flexShrink: 0 }}>
      {/* Shell brand strip */}
      <div style={{ background: C.shell, padding: '14px 18px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 18, color: '#fff', letterSpacing: '-0.3px' }}>
          Minos<span style={{ color: '#7EC8FF' }}> ERP</span>
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>Outsourcing Estratégico</div>
      </div>
      {/* Tenant selector */}
      <div style={{ margin: '10px 12px', padding: '8px 12px', borderRadius: 6, background: C.bg, border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: C.text }}>Minerales del Ande S.A.A.</div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>Unidad Cerro Azul</div>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.gold, background: `${C.gold}18`, border: `1px solid ${C.gold}40`, padding: '1px 8px', borderRadius: 3, display: 'inline-block', marginTop: 4, fontWeight: 600 }}>DEMO</span>
      </div>
      {/* Navigation */}
      <nav style={{ flex: 1, paddingTop: 4, display: 'flex', flexDirection: 'column' }}>
        {NAV.map(({ id, label, icon: Icon }) => {
          const on = active === id
          return (
            <button key={id} onClick={() => onNav(id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', height: 44, width: '100%', background: on ? '#E8F2FF' : 'transparent', color: on ? C.primary : C.text, borderLeft: `3px solid ${on ? C.primary : 'transparent'}`, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: on ? 600 : 400, cursor: 'pointer', border: 'none', borderLeft: `3px solid ${on ? C.primary : 'transparent'}`, textAlign: 'left' }}>
              <Icon size={16} style={{ flexShrink: 0, opacity: on ? 1 : 0.65 }} />{label}
            </button>
          )
        })}
      </nav>
      {/* User footer */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 12 }}>JR</div>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: C.text }}>Jorge Ríos</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>Jefe de Compras</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TOPBAR (Fiori Shell Bar) ─────────────────────────────────────────────────
function Topbar({ title, isMobile, viewMode, onToggleViewMode, onSignOut }) {
  return (
    <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 14px' : '0 20px', height: isMobile ? 50 : 48, background: C.shell, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.18)' }}>
      {isMobile ? (
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 17, color: '#fff', letterSpacing: '-0.3px' }}>
          Minos<span style={{ color: '#7EC8FF' }}> ERP</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.2px' }}>Minos<span style={{ color: '#7EC8FF' }}> ERP</span></span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>|</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>{title}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10 }}>
        <button onClick={onToggleViewMode} title={viewMode === 'desktop' ? 'Cambiar a vista móvil' : 'Cambiar a vista escritorio'}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 4, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11 }}>
          {viewMode === 'desktop' ? <Smartphone size={13} /> : <Monitor size={13} />}
          {!isMobile && <span>{viewMode === 'desktop' ? 'Vista Móvil' : 'Vista Escritorio'}</span>}
        </button>
        {!isMobile && (
          <button style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', color: 'rgba(255,255,255,0.85)', display: 'flex' }}>
            <Bell size={17} />
            <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: C.danger, border: '1px solid rgba(255,255,255,0.5)' }} />
          </button>
        )}
        <div style={{ width: isMobile ? 28 : 32, height: isMobile ? 28 : 32, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: isMobile ? 11 : 12 }}>JR</div>
        <button onClick={onSignOut} title="Cerrar sesión"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 4, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11 }}>
          <LogOut size={13} />{!isMobile && <span>Salir</span>}
        </button>
      </div>
    </div>
  )
}

// ─── DRILL-DOWN: chips, columnas y configuración de detalle ───────────────────
const PRIO_COLOR = { Alta: C.danger, Media: C.warn, Baja: C.success }
function Chip({ label, color }) {
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: `${color}18`, color, border: `1px solid ${color}40`, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600 }}>{label}</span>
}
const diasColor = (d) => d < 0 ? C.danger : d <= 3 ? C.warn : C.success
const otifColor = (v) => v >= 95 ? C.success : v >= 85 ? C.warn : C.danger

// Cada detalle: columnas (key/label/align/render/exportFmt) + acciones por fila.
const DETAILS = {
  'solpeds-pendientes': {
    file: 'solpeds-pendientes',
    title: 'SOLPEDs pendientes de procesar',
    subtitle: '12 solicitudes sin OC asignada — 3 con prioridad alta',
    rows: solpedsPendientes,
    columns: [
      { key: 'id',          label: 'SOLPED',     render: r => <span style={{ color: C.primary, fontWeight: 600 }}>{r.id}</span> },
      { key: 'solicitante', label: 'Solicitante' },
      { key: 'area',        label: 'Área' },
      { key: 'categoria',   label: 'Categoría' },
      { key: 'fecha',       label: 'F. Solicitud' },
      { key: 'prioridad',   label: 'Prioridad',  render: r => <Chip label={r.prioridad} color={PRIO_COLOR[r.prioridad]} /> },
      { key: 'monto',       label: 'Monto est.', align: 'right', render: r => fmt(r.monto), exportFmt: r => r.monto },
    ],
    actions: [
      { label: 'Procesar',          color: C.primary },
      { label: 'Asignar comprador', color: C.muted   },
      { label: 'Rechazar',          color: C.danger  },
    ],
  },
  'ocs-activas': {
    file: 'ocs-activas',
    title: 'Órdenes de compra activas',
    subtitle: '34 OCs emitidas o en tránsito con proveedores',
    rows: ocsActivas,
    columns: [
      { key: 'oc',        label: 'OC',        render: r => <span style={{ color: C.primary, fontWeight: 600 }}>{r.oc}</span> },
      { key: 'solped',    label: 'SOLPED' },
      { key: 'proveedor', label: 'Proveedor' },
      { key: 'categoria', label: 'Categoría' },
      { key: 'estado',    label: 'Estado',    render: r => <Badge>{r.estado}</Badge> },
      { key: 'entrega',   label: 'F. Entrega' },
      { key: 'dias',      label: 'Faltan',    align: 'right', render: r => <span style={{ color: diasColor(r.dias), fontWeight: 600 }}>{r.dias}d</span>, exportFmt: r => `${r.dias}d` },
      { key: 'monto',     label: 'Monto',     align: 'right', render: r => fmt(r.monto), exportFmt: r => r.monto },
    ],
    actions: [
      { label: 'Ver seguimiento', color: C.primary },
      { label: 'Marcar prioridad', color: C.warn   },
    ],
  },
  'entregas-semana': {
    file: 'entregas-semana',
    title: 'Entregas previstas — próximos 7 días',
    subtitle: '8 despachos por confirmar con proveedores',
    rows: entregasSemana,
    columns: [
      { key: 'oc',        label: 'OC',        render: r => <span style={{ color: C.primary, fontWeight: 600 }}>{r.oc}</span> },
      { key: 'proveedor', label: 'Proveedor' },
      { key: 'categoria', label: 'Categoría' },
      { key: 'entrega',   label: 'F. Entrega' },
      { key: 'dias',      label: 'En',        align: 'right', render: r => <span style={{ color: diasColor(r.dias), fontWeight: 600 }}>{r.dias}d</span>, exportFmt: r => `${r.dias}d` },
      { key: 'estado',    label: 'Estado',    render: r => <Badge>{r.estado}</Badge> },
      { key: 'contacto',  label: 'Contacto' },
    ],
    actions: [
      { label: 'Confirmar despacho',  color: C.success },
      { label: 'Contactar proveedor', color: C.primary },
    ],
  },
  'ocs-retrasadas': {
    file: 'ocs-retrasadas',
    title: 'OCs con entrega vencida',
    subtitle: '2 órdenes fuera de plazo — requieren seguimiento urgente',
    banner: 'Estas órdenes superaron su fecha de entrega comprometida. Tomar acción y dejar registro con el proveedor.',
    rows: ocsRetrasadas,
    columns: [
      { key: 'oc',        label: 'OC',        render: r => <span style={{ color: C.primary, fontWeight: 600 }}>{r.oc}</span> },
      { key: 'solped',    label: 'SOLPED' },
      { key: 'proveedor', label: 'Proveedor' },
      { key: 'entrega',   label: 'F. Comprometida' },
      { key: 'retraso',   label: 'Retraso',   align: 'right', render: r => <span style={{ color: C.danger, fontWeight: 700 }}>{r.retraso}d tarde</span>, exportFmt: r => `${r.retraso}d tarde` },
      { key: 'monto',     label: 'Monto',     align: 'right', render: r => fmt(r.monto), exportFmt: r => r.monto },
      { key: 'motivo',    label: 'Motivo' },
      { key: 'contacto',  label: 'Contacto' },
    ],
    actions: [
      { label: 'Contactar proveedor', color: C.primary },
      { label: 'Reprogramar',         color: C.warn    },
      { label: 'Escalar',             color: C.danger  },
    ],
  },
  'ocs-entregadas': {
    file: 'ocs-entregadas',
    title: 'OCs entregadas este mes',
    subtitle: '16 órdenes recibidas — tasa de cumplimiento 89% (meta 90%)',
    rows: ocsEntregadas,
    columns: [
      { key: 'oc',        label: 'OC',        render: r => <span style={{ color: C.primary, fontWeight: 600 }}>{r.oc}</span> },
      { key: 'proveedor', label: 'Proveedor' },
      { key: 'categoria', label: 'Categoría' },
      { key: 'entrega',   label: 'F. Entrega' },
      { key: 'otif',      label: 'OTIF',      align: 'right', render: r => <span style={{ color: otifColor(r.otif), fontWeight: 600 }}>{r.otif}%</span>, exportFmt: r => `${r.otif}%` },
      { key: 'monto',     label: 'Monto',     align: 'right', render: r => fmt(r.monto), exportFmt: r => r.monto },
    ],
    actions: [
      { label: 'Ver conformidad', color: C.primary },
      { label: 'Cerrar OC',       color: C.success },
    ],
  },
}

const _cellExport = (col, row) => (col.exportFmt ? col.exportFmt(row) : row[col.key])
const _esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Exporta filas a un .xlsx real (usa los labels de columna como cabecera).
function exportRowsToExcel(file, columns, rows) {
  const data = rows.map(r => Object.fromEntries(columns.map(c => [c.label, _cellExport(c, r)])))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Detalle')
  XLSX.writeFile(wb, `${file}.xlsx`)
}

// Copia las filas al portapapeles como tabla (HTML con estilo + texto/TSV de respaldo),
// de modo que al pegar en Gmail/Outlook conserva el formato de tabla.
async function copyRowsToClipboard(columns, rows) {
  const headers = columns.map(c => c.label)
  const matrix  = rows.map(r => columns.map(c => _cellExport(c, r)))
  const tsv  = [headers.join('\t'), ...matrix.map(r => r.join('\t'))].join('\n')
  const html = `<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px"><thead><tr style="background:#354A5E;color:#fff">${headers.map(h => `<th style="padding:6px 10px;text-align:left">${_esc(h)}</th>`).join('')}</tr></thead><tbody>${matrix.map((r, i) => `<tr style="background:${i % 2 ? '#F5F6F7' : '#fff'}">${r.map(c => `<td style="padding:5px 10px;border:1px solid #E5E5E5">${_esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
  try {
    await navigator.clipboard.write([new ClipboardItem({
      'text/html':  new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([tsv],  { type: 'text/plain' }),
    })])
    return true
  } catch {
    try { await navigator.clipboard.writeText(tsv); return true } catch { return false }
  }
}

// ─── DETAIL DIALOG (drill-down de KPIs y alertas) ─────────────────────────────
function DetailDialog({ detail, isMobile, onClose }) {
  const [toast, setToast] = useState(null)
  const [done,  setDone]  = useState(() => new Set())
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])
  if (!detail) return null

  const flash = (msg) => { setToast(msg); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 2600) }

  const handleAction = (act, idx, row) => {
    setDone(prev => new Set(prev).add(idx))
    flash(`✓ "${act.label}" aplicado a ${row.id || row.oc}`)
  }

  const handleExport = () => { exportRowsToExcel(detail.file, detail.columns, detail.rows); flash('Excel generado') }
  const handleCopy   = async () => { flash(await copyRowsToClipboard(detail.columns, detail.rows) ? 'Tabla copiada — pégala en tu correo' : 'No se pudo copiar') }

  const overlay = isMobile
    ? { position: 'fixed', inset: 0, zIndex: 70, background: C.bg, display: 'flex', flexDirection: 'column', overflow: 'auto' }
    : { position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(50,54,58,0.50)', padding: 20 }
  const box = isMobile
    ? { background: C.card, display: 'flex', flexDirection: 'column', flex: 1 }
    : { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 'fit-content', minWidth: 'min(680px, 94vw)', maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.22)' }

  const hasActions = detail.actions?.length > 0

  return (
    <div style={overlay} onClick={isMobile ? undefined : onClose}>
      <div style={box} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: isMobile ? '16px 16px 12px' : '20px 24px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: isMobile ? 16 : 18, color: C.text }}>{detail.title}</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, marginTop: 3 }}>{detail.subtitle}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}><X size={18} style={{ color: C.muted }} /></button>
        </div>

        {/* Banner (alertas críticas) */}
        {detail.banner && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: isMobile ? '12px 16px 0' : '14px 24px 0', padding: '10px 12px', borderRadius: 8, background: `${C.danger}0E`, border: `1px solid ${C.danger}33` }}>
            <AlertTriangle size={15} style={{ color: C.danger, flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text }}>{detail.banner}</span>
          </div>
        )}

        {/* Toolbar: exportar / copiar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: isMobile ? '12px 16px' : '14px 24px', flexShrink: 0 }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, marginRight: 'auto' }}>
            {detail.rows.length} registro{detail.rows.length !== 1 ? 's' : ''}
          </span>
          <button onClick={handleCopy}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: C.card, color: C.text, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
            <Copy size={13} /> Copiar tabla
          </button>
          <button onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, background: C.success, color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Download size={13} /> Exportar Excel
          </button>
        </div>

        {/* Tabla (texto seleccionable) */}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '0 16px 16px' : '0 24px 8px', userSelect: 'text' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
            <thead>
              <tr style={{ color: C.muted, borderBottom: `2px solid ${C.border}` }}>
                {detail.columns.map(c => (
                  <th key={c.key} style={{ padding: '0 12px 8px 0', textAlign: c.align || 'left', fontWeight: 500, fontSize: 11, letterSpacing: '0.04em', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: C.card }}>{c.label}</th>
                ))}
                {hasActions && <th style={{ padding: '0 0 8px 0', textAlign: 'right', fontWeight: 500, fontSize: 11, position: 'sticky', top: 0, background: C.card }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {detail.rows.map((r, i) => {
                const isDone = done.has(i)
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}40`, opacity: isDone ? 0.55 : 1 }}>
                    {detail.columns.map(c => (
                      <td key={c.key} style={{ padding: '9px 12px 9px 0', textAlign: c.align || 'left', color: C.text, whiteSpace: c.key === 'motivo' ? 'normal' : 'nowrap' }}>
                        {c.render ? c.render(r) : r[c.key]}
                      </td>
                    ))}
                    {hasActions && (
                      <td style={{ padding: '9px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {isDone ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.success, fontWeight: 600, fontSize: 11 }}><CheckCircle size={13} /> Listo</span>
                        ) : (
                          <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                            {detail.actions.map(a => (
                              <button key={a.label} onClick={() => handleAction(a, i, r)}
                                style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, background: 'none', border: `1px solid ${a.color}55`, color: a.color, padding: '4px 10px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                {a.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footer hint */}
        <div style={{ padding: isMobile ? '10px 16px 20px' : '12px 24px', borderTop: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>
            Tip: selecciona las filas con el cursor y cópialas (Ctrl+C) para pegarlas directamente en un correo, o usa «Copiar tabla».
          </span>
          <button onClick={onClose} style={{ marginLeft: 'auto', padding: '8px 18px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer' }}>Cerrar</button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 80, background: C.shell, color: '#fff', padding: '10px 18px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Clickable KPI card & Alert row ───────────────────────────────────────────
function KpiCard({ k, isMobile, onClick }) {
  const [hover, setHover] = useState(false)
  const Icon = k.icon
  return (
    <Card className="p-4" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ cursor: 'pointer', transition: 'box-shadow .15s, transform .15s', boxShadow: hover ? '0 4px 14px rgba(0,0,0,0.12)' : '0 1px 4px rgba(0,0,0,0.06)', transform: hover ? 'translateY(-2px)' : 'none', borderColor: hover ? `${k.color}55` : C.border }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: isMobile ? 9 : 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.4 }}>{k.label}</span>
        <div style={{ padding: 6, borderRadius: 7, background: `${k.color}12`, flexShrink: 0, marginLeft: 6 }}>
          <Icon size={14} style={{ color: k.color, display: 'block' }} />
        </div>
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: isMobile ? 28 : 34, color: k.color, marginTop: 8, lineHeight: 1 }}>{k.value}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>{k.sub}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, color: hover ? k.color : C.muted }}>
          Ver detalle <ChevronRight size={12} />
        </span>
      </div>
    </Card>
  )
}

function AlertRow({ a, isLast, onClick }) {
  const [hover, setHover] = useState(false)
  const Icon = a.icon
  const color = a.tipo === 'danger' ? C.danger : a.tipo === 'warn' ? C.warn : a.tipo === 'success' ? C.success : C.primary
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', textAlign: 'left', background: hover ? C.bg : 'transparent', border: 'none', borderBottom: isLast ? 'none' : `1px solid ${C.border}`, padding: '0 4px 12px', marginBottom: 0, cursor: 'pointer', borderRadius: hover ? 6 : 0 }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={13} style={{ color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{a.msg}</div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginTop: 3 }}>{a.sub}</div>
      </div>
      <ChevronRight size={15} style={{ color: hover ? color : C.muted, flexShrink: 0 }} />
    </button>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ isMobile }) {
  const P   = isMobile ? '14px 14px' : 24
  const gap = isMobile ? 12 : 16

  const [detailId, setDetailId] = useState(null)

  const kpis = [
    { label: 'SOLPEDs pendientes',  value: '12', sub: 'sin procesar',      icon: ClipboardList, color: C.warn,    detail: 'solpeds-pendientes' },
    { label: 'OCs activas',         value: '34', sub: 'con proveedores',   icon: ShoppingCart,  color: C.primary, detail: 'ocs-activas'        },
    { label: 'Entregas esta semana',value:  '8', sub: 'próximos 7 días',   icon: Calendar,      color: C.info,    detail: 'entregas-semana'    },
    { label: 'OCs retrasadas',      value:  '2', sub: 'requieren acción',  icon: Package,       color: C.danger,  detail: 'ocs-retrasadas'     },
  ]

  const pipeline = [
    { label: 'SOLPED pendiente', count: 12, color: C.warn    },
    { label: 'OC emitida',       count: 18, color: C.primary },
    { label: 'En tránsito',      count: 16, color: C.info    },
    { label: 'Entregada (mes)',   count: 16, color: C.success },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: P, display: 'flex', flexDirection: 'column', gap }}>

      {/* ── KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isMobile ? 10 : 14, ...(!isMobile && { gridTemplateColumns: 'repeat(4, 1fr)' }) }}>
        {kpis.map(k => (
          <KpiCard key={k.label} k={k} isMobile={isMobile} onClick={() => setDetailId(k.detail)} />
        ))}
      </div>

      {/* ── Chart + Pipeline ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 260px', gap: 14 }}>

        {/* Bar chart */}
        <Card className="p-5">
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Evolución mensual — SOLPEDs recibidas vs OCs emitidas
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
            {[{ label: 'SOLPEDs', color: `${C.primary}55` }, { label: 'OCs emitidas', color: C.primary }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>{l.label}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={isMobile ? 140 : 190}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 6, left: -20, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: C.muted, fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v, n) => [v, n === 'solpeds' ? 'SOLPEDs' : 'OCs emitidas']}
                contentStyle={{ background: C.card, border: `1px solid ${C.border}`, fontFamily: 'Inter, sans-serif', fontSize: 11, borderRadius: 6, color: C.text }}
              />
              <Bar dataKey="solpeds" fill={`${C.primary}55`} radius={[3, 3, 0, 0]} />
              <Bar dataKey="ocs"     fill={C.primary}         radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pipeline */}
        <Card className="p-5">
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Pipeline actual
          </div>
          {isMobile ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {pipeline.map(s => (
                <div key={s.label} style={{ padding: '10px 12px', borderRadius: 8, background: `${s.color}10`, border: `1px solid ${s.color}30` }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 22, color: s.color, lineHeight: 1 }}>{s.count}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {pipeline.map((s, i) => (
                <div key={s.label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, background: `${s.color}08`, border: `1px solid ${s.color}25` }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 20, color: s.color, minWidth: 32, lineHeight: 1 }}>{s.count}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text }}>{s.label}</span>
                  </div>
                  {i < pipeline.length - 1 && (
                    <div style={{ textAlign: 'center', color: C.border, fontSize: 16, lineHeight: '18px' }}>↓</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Activity table + Alerts ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: 14 }}>
        <Card className="p-4" style={{ overflowX: 'auto' }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Seguimiento de OCs activas
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
            <thead>
              <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: '0 10px 8px 0', textAlign: 'left', fontWeight: 500 }}>OC / SOLPED</th>
                <th style={{ padding: '0 10px 8px 0', textAlign: 'left', fontWeight: 500 }}>Proveedor</th>
                <th style={{ padding: '0 10px 8px 0', textAlign: 'left', fontWeight: 500 }}>Estado</th>
                {!isMobile && <th style={{ padding: '0 10px 8px 0', textAlign: 'left', fontWeight: 500 }}>F. Entrega</th>}
                <th style={{ padding: '0 0 8px 0', textAlign: 'right', fontWeight: 500 }}>Días</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((r, i) => {
                const dc = r.dias < 0 ? C.danger : r.dias <= 3 ? C.warn : C.success
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}40` }}>
                    <td style={{ padding: '9px 10px 9px 0' }}>
                      <div style={{ color: C.primary, fontWeight: 600, fontSize: isMobile ? 11 : 12 }}>{r.oc}</div>
                      <div style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>{r.solped}</div>
                    </td>
                    <td style={{ padding: '9px 10px 9px 0', color: C.text, fontSize: isMobile ? 11 : 12 }}>{r.proveedor}</td>
                    <td style={{ padding: '9px 10px 9px 0' }}><Badge>{r.estado}</Badge></td>
                    {!isMobile && <td style={{ padding: '9px 10px 9px 0', color: C.muted, fontSize: 11 }}>{r.entrega}</td>}
                    <td style={{ padding: '9px 0 9px 0', textAlign: 'right', fontWeight: 600, color: dc, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {r.dias < 0 ? `${Math.abs(r.dias)}d tarde` : r.dias === 0 ? '—' : `${r.dias}d`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>

        <Card className="p-4">
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Alertas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {alertas.map((a, i) => (
              <AlertRow key={i} a={a} isLast={i === alertas.length - 1} onClick={() => setDetailId(a.detail)} />
            ))}
          </div>
        </Card>
      </div>

      <DetailDialog detail={detailId ? DETAILS[detailId] : null} isMobile={isMobile} onClose={() => setDetailId(null)} />
    </div>
  )
}

// ─── FICHA DE PROVEEDOR: OCs por cliente + documentos de homologación ─────────
// «Cliente» = empresa minera atendida por el outsourcing (Minos ERP compra por
// cuenta de varias mineras). Una OC de un proveedor pertenece a un cliente.
const CLIENTES = ['Minerales del Ande S.A.A.', 'Cía. Minera Cerro Verde', 'Southern Copper Perú', 'Volcan Cía. Minera', 'Nexa Resources Perú']
const OC_ESTADOS = ['Emitida', 'En tránsito', 'Entregada', 'Entregada', 'Retrasada']

// OCs mock deterministas para un proveedor (semilla a partir del RUC).
function ocsDeProveedor(prov) {
  const seed = Number(String(prov.ruc).slice(-4)) || (prov.id.length * 137)
  const n = 6 + (seed % 9) // 6..14 OCs
  const cats = prov.categorias?.length ? prov.categorias : ['Otros']
  return Array.from({ length: n }, (_, i) => {
    const s = seed + i * 31
    return {
      oc:        `OC-2025-${String(400 - (seed % 60) - i).padStart(4, '0')}`,
      cliente:   CLIENTES[(seed + i) % CLIENTES.length],
      categoria: cats[i % cats.length],
      estado:    OC_ESTADOS[s % OC_ESTADOS.length],
      emision:   _fecha(-90 + (s % 70)),
      entrega:   _fecha(-50 + (s % 95)),
      monto:     12000 + (s % 90) * 1600,
    }
  })
}

const PROV_OC_COLUMNS = [
  { key: 'oc',        label: 'OC',         render: r => <span style={{ color: C.primary, fontWeight: 600 }}>{r.oc}</span> },
  { key: 'cliente',   label: 'Cliente' },
  { key: 'categoria', label: 'Categoría',  render: r => <CatBadge nombre={r.categoria} /> },
  { key: 'estado',    label: 'Estado',     render: r => <Badge>{r.estado}</Badge> },
  { key: 'emision',   label: 'F. Emisión' },
  { key: 'entrega',   label: 'F. Entrega' },
  { key: 'monto',     label: 'Monto',      align: 'right', render: r => fmt(r.monto), exportFmt: r => r.monto },
]

// Documentos requeridos para homologar un proveedor.
const DOCS_REQUERIDOS = [
  { id: 'ficha-ruc',   label: 'Ficha RUC (SUNAT)' },
  { id: 'politicas',   label: 'Políticas firmadas' },
  { id: 'cargos',      label: 'Cargos / vigencia de poder' },
  { id: 'iso',         label: 'Certificado de calidad (ISO)' },
  { id: 'sst',         label: 'Plan SST / Seguridad' },
  { id: 'bancaria',    label: 'Detalle de cuenta bancaria' },
]

// ─── IndexedDB mínimo para guardar los archivos reales de documentos ──────────
const IDB_NAME = 'minprocure', IDB_STORE = 'docs'
function idbOpen() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: 'key' }) }
    req.onsuccess = () => res(req.result)
    req.onerror   = () => rej(req.error)
  })
}
async function idbPut(rec) {
  const db = await idbOpen()
  return new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, 'readwrite'); tx.objectStore(IDB_STORE).put(rec); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })
}
async function idbGetAll() {
  const db = await idbOpen()
  return new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, 'readonly'); const rq = tx.objectStore(IDB_STORE).getAll(); rq.onsuccess = () => res(rq.result || []); rq.onerror = () => rej(rq.error) })
}
async function idbDelete(key) {
  const db = await idbOpen()
  return new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, 'readwrite'); tx.objectStore(IDB_STORE).delete(key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) })
}
const _docKey = (provId, docId) => `${provId}__${docId}`
const _kb = (bytes) => bytes >= 1024 * 1024 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{ padding: '8px 4px', marginRight: 20, background: 'none', border: 'none', borderBottom: `2px solid ${active ? C.primary : 'transparent'}`, color: active ? C.primary : C.muted, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer' }}>
      {children}
    </button>
  )
}

function ProveedorDialog({ prov, isMobile, onClose, onSetHomologado }) {
  const [tab,    setTab]    = useState('resumen')
  const [toast,  setToast]  = useState(null)
  const [docs,   setDocs]   = useState([])
  const [cliFiltro, setCliFiltro] = useState('todos')
  const timer = useRef(null)

  const ocs = ocsDeProveedor(prov)
  const clientes = [...new Set(ocs.map(o => o.cliente))]
  const ocsFiltradas = cliFiltro === 'todos' ? ocs : ocs.filter(o => o.cliente === cliFiltro)
  const montoTotal = ocs.reduce((s, o) => s + o.monto, 0)

  useEffect(() => { idbGetAll().then(all => setDocs(all.filter(d => d.provId === prov.id))).catch(() => {}) }, [prov.id])
  useEffect(() => () => clearTimeout(timer.current), [])

  const flash = (msg) => { setToast(msg); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), 2600) }
  const reloadDocs = () => idbGetAll().then(all => setDocs(all.filter(d => d.provId === prov.id))).catch(() => {})

  const onPick = async (docId, file) => {
    if (!file) return
    await idbPut({ key: _docKey(prov.id, docId), provId: prov.id, docId, nombre: file.name, mime: file.type || 'archivo', size: file.size, fecha: new Date().toISOString().slice(0, 10), blob: file })
    await reloadDocs()
    flash(`Documento cargado: ${file.name}`)
  }
  const onVer = (rec) => { const url = URL.createObjectURL(rec.blob); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000) }
  const onQuitar = async (docId) => { await idbDelete(_docKey(prov.id, docId)); await reloadDocs(); flash('Documento eliminado') }

  const docDe = (docId) => docs.find(d => d.docId === docId)
  const completos = DOCS_REQUERIDOS.every(d => docDe(d.id))

  const exportOcs = () => { exportRowsToExcel(`ocs-${prov.ruc}`, PROV_OC_COLUMNS, ocsFiltradas); flash('Excel generado') }
  const copyOcs   = async () => { flash(await copyRowsToClipboard(PROV_OC_COLUMNS, ocsFiltradas) ? 'Tabla copiada — pégala en tu correo' : 'No se pudo copiar') }

  const overlay = isMobile
    ? { position: 'fixed', inset: 0, zIndex: 70, background: C.bg, display: 'flex', flexDirection: 'column', overflow: 'auto' }
    : { position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(50,54,58,0.50)', padding: 20 }
  const box = isMobile
    ? { background: C.card, display: 'flex', flexDirection: 'column', flex: 1 }
    : { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: 'fit-content', minWidth: 'min(760px, 94vw)', maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.22)' }

  return (
    <div style={overlay} onClick={isMobile ? undefined : onClose}>
      <div style={box} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: isMobile ? '16px 16px 0' : '20px 24px 0', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: isMobile ? 16 : 18, color: C.text }}>{prov.razonSocial}</span>
              {prov.homologado
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: C.success, background: `${C.success}14`, border: `1px solid ${C.success}40`, padding: '2px 8px', borderRadius: 4 }}><CheckCircle size={12} /> Homologado</span>
                : <span style={{ fontSize: 11, fontWeight: 600, color: C.warn, background: `${C.warn}14`, border: `1px solid ${C.warn}40`, padding: '2px 8px', borderRadius: 4 }}>Por homologar</span>}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, marginTop: 3 }}>RUC {prov.ruc}{prov.nombreComercial ? ` · ${prov.nombreComercial}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}><X size={18} style={{ color: C.muted }} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: isMobile ? '8px 16px 0' : '10px 24px 0', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <TabBtn active={tab === 'resumen'} onClick={() => setTab('resumen')}>Resumen</TabBtn>
          <TabBtn active={tab === 'ocs'}     onClick={() => setTab('ocs')}>Órdenes de compra ({ocs.length})</TabBtn>
          <TabBtn active={tab === 'docs'}    onClick={() => setTab('docs')}>Documentos</TabBtn>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '16px' : '18px 24px' }}>

          {/* ── RESUMEN ── */}
          {tab === 'resumen' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 12 }}>
                {[
                  { label: 'OCs totales',     value: ocs.length,                       color: C.primary },
                  { label: 'Monto acumulado', value: fmt(montoTotal),                  color: C.text    },
                  { label: 'Clientes',        value: clientes.length,                  color: C.info    },
                ].map(s => (
                  <div key={s.label} style={{ padding: 14, borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 22, color: s.color, marginTop: 6 }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 16, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                <div>
                  <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Contacto</div>
                  <div style={{ color: C.text }}>{prov.contactoNombre || '—'}</div>
                  <div style={{ color: C.muted, marginTop: 2 }}>{prov.contactoTelefono || '—'}</div>
                </div>
                <div>
                  <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Email</div>
                  <div style={{ color: C.text }}>{prov.contactoEmail}</div>
                  <div style={{ color: C.muted, marginTop: 2 }}>Alta: {prov.fechaAlta}</div>
                </div>
                <div>
                  <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Categorías</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{prov.categorias.map(c => <CatBadge key={c} nombre={c} />)}</div>
                </div>
              </div>
              {prov.notas && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, fontStyle: 'italic' }}>{prov.notas}</div>}
            </div>
          )}

          {/* ── ÓRDENES DE COMPRA ── */}
          {tab === 'ocs' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginRight: 2 }}>Cliente:</span>
                {['todos', ...clientes].map(c => (
                  <button key={c} onClick={() => setCliFiltro(c)}
                    style={{ padding: '5px 12px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 11, background: cliFiltro === c ? `${C.primary}20` : C.card, color: cliFiltro === c ? C.primary : C.muted, border: `1px solid ${cliFiltro === c ? C.primary : C.border}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {c === 'todos' ? 'Todos' : c}
                  </button>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button onClick={copyOcs} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: C.card, color: C.text, border: `1px solid ${C.border}`, cursor: 'pointer' }}><Copy size={13} /> Copiar</button>
                  <button onClick={exportOcs} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, background: C.success, color: '#fff', border: 'none', cursor: 'pointer' }}><Download size={13} /> Excel</button>
                </div>
              </div>
              <div style={{ userSelect: 'text', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: C.muted, borderBottom: `2px solid ${C.border}` }}>
                      {PROV_OC_COLUMNS.map(c => <th key={c.key} style={{ padding: '0 12px 8px 0', textAlign: c.align || 'left', fontWeight: 500, fontSize: 11, whiteSpace: 'nowrap' }}>{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {ocsFiltradas.map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.border}40` }}>
                        {PROV_OC_COLUMNS.map(c => (
                          <td key={c.key} style={{ padding: '9px 12px 9px 0', textAlign: c.align || 'left', color: C.text, whiteSpace: 'nowrap' }}>{c.render ? c.render(r) : r[c.key]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── DOCUMENTOS / HOMOLOGACIÓN ── */}
          {tab === 'docs' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, marginBottom: 16, background: completos ? `${C.success}0E` : `${C.warn}0E`, border: `1px solid ${completos ? C.success : C.warn}33` }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.text }}>
                  {DOCS_REQUERIDOS.filter(d => docDe(d.id)).length} de {DOCS_REQUERIDOS.length} documentos cargados.
                  {completos ? ' Listo para homologar.' : ' Faltan documentos para homologar.'}
                </span>
                <button disabled={!completos || prov.homologado}
                  onClick={() => { onSetHomologado(prov.id, true); flash('Proveedor homologado') }}
                  style={{ marginLeft: 'auto', padding: '7px 16px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, border: 'none', cursor: (completos && !prov.homologado) ? 'pointer' : 'not-allowed', background: (completos && !prov.homologado) ? C.success : C.border, color: (completos && !prov.homologado) ? '#fff' : C.muted }}>
                  {prov.homologado ? 'Homologado ✓' : 'Homologar'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DOCS_REQUERIDOS.map(d => {
                  const rec = docDe(d.id)
                  return (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
                      <FileText size={16} style={{ color: rec ? C.success : C.muted, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: C.text }}>{d.label}</div>
                        {rec
                          ? <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.nombre} · {_kb(rec.size)} · {rec.fecha}</div>
                          : <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.warn }}>Pendiente</div>}
                      </div>
                      {rec && <button onClick={() => onVer(rec)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Inter, sans-serif', fontSize: 11, background: 'none', border: `1px solid ${C.border}`, color: C.primary, padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}><Eye size={12} /> Ver</button>}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Inter, sans-serif', fontSize: 11, background: 'none', border: `1px solid ${C.primary}55`, color: C.primary, padding: '5px 10px', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <Plus size={12} /> {rec ? 'Reemplazar' : 'Cargar'}
                        <input type="file" style={{ display: 'none' }} onChange={e => { onPick(d.id, e.target.files[0]); e.target.value = '' }} />
                      </label>
                      {rec && <button onClick={() => onQuitar(d.id)} style={{ background: 'none', border: `1px solid ${C.danger}40`, color: C.danger, padding: '5px 9px', borderRadius: 6, cursor: 'pointer' }}><X size={12} /></button>}
                    </div>
                  )
                })}
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginTop: 12 }}>
                Los archivos se guardan en este navegador (IndexedDB). No se suben a ningún servidor en este demo.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: isMobile ? '10px 16px 20px' : '12px 24px', borderTop: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer' }}>Cerrar</button>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 80, background: C.shell, color: '#fff', padding: '10px 18px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── PROVEEDORES ──────────────────────────────────────────────────────────────
function Proveedores({ isMobile }) {
  const [lista, setLista] = useState(() => {
    try { const raw = localStorage.getItem(PROV_KEY); return raw ? JSON.parse(raw) : SAMPLE_PROVEEDORES } catch { return SAMPLE_PROVEEDORES }
  })
  const [search,    setSearch]    = useState('')
  const [filtroCats,setFiltroCats]= useState([])
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState({ ...EMPTY_FORM })
  const [errores,   setErrores]   = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [provDetail,    setProvDetail]    = useState(null)
  const isFirstSave = useRef(true)

  useEffect(() => {
    if (isFirstSave.current) { isFirstSave.current = false; return }
    localStorage.setItem(PROV_KEY, JSON.stringify(lista))
  }, [lista])

  const openNuevo  = () => { setForm({ ...EMPTY_FORM }); setErrores({}); setModal('nuevo') }
  const openEditar = p => {
    setForm({ razonSocial: p.razonSocial, ruc: p.ruc, nombreComercial: p.nombreComercial, contactoNombre: p.contactoNombre, contactoEmail: p.contactoEmail, contactoTelefono: p.contactoTelefono, categorias: [...p.categorias], notas: p.notas })
    setErrores({}); setModal(p.id)
  }
  const closeModal = () => { setModal(null); setErrores({}) }

  const handleSave = () => {
    const errs = validateProvForm(form)
    if (Object.keys(errs).length > 0) { setErrores(errs); return }
    if (modal === 'nuevo') setLista(prev => [{ ...form, id: crypto.randomUUID(), fechaAlta: new Date().toISOString().slice(0, 10), activo: true }, ...prev])
    else setLista(prev => prev.map(p => p.id === modal ? { ...p, ...form } : p))
    closeModal()
  }

  const toggleActivo   = id => setLista(prev => prev.map(p => p.id === id ? { ...p, activo: !p.activo } : p))
  const setHomologado  = (id, val) => setLista(prev => prev.map(p => p.id === id ? { ...p, homologado: val } : p))
  const handleDelete   = id => { setLista(prev => prev.filter(p => p.id !== id)); setConfirmDelete(null) }
  const provVista      = lista.find(p => p.id === provDetail) || null

  const toggleCatFilter = cat => setFiltroCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  const toggleFormCat   = cat => {
    setForm(prev => ({ ...prev, categorias: prev.categorias.includes(cat) ? prev.categorias.filter(c => c !== cat) : [...prev.categorias, cat] }))
    if (errores.categorias) setErrores(e => ({ ...e, categorias: undefined }))
  }
  const setField = (key, val, errKey) => {
    setForm(f => ({ ...f, [key]: val }))
    if (errKey && errores[errKey]) setErrores(e => ({ ...e, [errKey]: undefined }))
  }

  const filtrada = lista.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.razonSocial.toLowerCase().includes(q) || p.ruc.includes(q) || p.nombreComercial.toLowerCase().includes(q)
    const matchCats   = filtroCats.length === 0 || filtroCats.some(c => p.categorias.includes(c))
    const matchEstado = filtroEstado === 'todos' || (filtroEstado === 'activos' ? p.activo : !p.activo)
    return matchSearch && matchCats && matchEstado
  })

  const isEdit  = modal && modal !== 'nuevo'
  const delProv = lista.find(p => p.id === confirmDelete)

  // Modal overlay style differs between mobile (full screen) and desktop (centered)
  const modalOverlayStyle = isMobile
    ? { position: 'fixed', inset: 0, zIndex: 50, background: C.bg, display: 'flex', flexDirection: 'column', overflow: 'auto' }
    : { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(50,54,58,0.50)' }
  const modalBoxStyle = isMobile
    ? { background: C.card, padding: '16px 16px 40px', flex: 1 }
    : { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 32, width: 560, maxHeight: '90vh', overflowY: 'auto' }

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* ── Toolbar ── */}
      <div style={{ padding: isMobile ? '10px 14px' : '14px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: isMobile ? 1 : 'none' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={isMobile ? 'Buscar...' : 'Razón social, RUC o nombre comercial...'}
              style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: C.card, border: `1px solid ${C.border}`, color: C.text, outline: 'none', width: isMobile ? '100%' : 310 }} />
          </div>
          {!isMobile && [['todos','Todos'],['activos','Activos'],['inactivos','Inactivos']].map(([val,lbl]) => (
            <button key={val} onClick={() => setFiltroEstado(val)}
              style={{ padding: '7px 14px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: filtroEstado === val ? `${C.primary}20` : C.card, color: filtroEstado === val ? C.primary : C.muted, border: `1px solid ${filtroEstado === val ? C.primary : C.border}`, cursor: 'pointer' }}>
              {lbl}
            </button>
          ))}
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, display: isMobile ? 'none' : 'inline' }}>
            {filtrada.length} resultado{filtrada.length !== 1 ? 's' : ''}
          </span>
          <button onClick={openNuevo}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: isMobile ? '8px 14px' : '8px 18px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, background: C.primary, color: C.bg, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Plus size={13} />{isMobile ? 'Nuevo' : 'Nuevo Proveedor'}
          </button>
        </div>

        {isMobile && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {[['todos','Todos'],['activos','Activos'],['inactivos','Inactivos']].map(([val,lbl]) => (
              <button key={val} onClick={() => setFiltroEstado(val)}
                style={{ padding: '5px 12px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 11, background: filtroEstado === val ? `${C.primary}20` : C.card, color: filtroEstado === val ? C.primary : C.muted, border: `1px solid ${filtroEstado === val ? C.primary : C.border}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {lbl}
              </button>
            ))}
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', marginLeft: 4, whiteSpace: 'nowrap' }}>
              {filtrada.length} resultados
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : 'visible', alignItems: 'center', paddingBottom: isMobile ? 2 : 0 }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginRight: 4, flexShrink: 0 }}>Cat:</span>
          {CATEGORIAS.map(cat => {
            const active = filtroCats.includes(cat.nombre)
            return (
              <button key={cat.nombre} onClick={() => toggleCatFilter(cat.nombre)}
                style={{ padding: '3px 10px', borderRadius: 4, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: active ? 600 : 400, background: active ? cat.bg : `${cat.bg}22`, color: active ? cat.fg : cat.bg, border: `1px solid ${active ? cat.bg : cat.bg + '60'}`, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {cat.nombre}
              </button>
            )
          })}
          {filtroCats.length > 0 && (
            <button onClick={() => setFiltroCats([])}
              style={{ padding: '3px 10px', borderRadius: 4, fontFamily: 'Inter, sans-serif', fontSize: 11, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer', flexShrink: 0 }}>
              × Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0 0 8px' : '0 24px 24px' }}>
        {filtrada.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} style={{ color: C.muted }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>
                {lista.length === 0 ? 'No hay proveedores registrados' : 'Sin resultados'}
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted }}>
                {lista.length === 0 ? 'Toca "Nuevo" para comenzar.' : 'Ajusta los filtros o la búsqueda.'}
              </div>
            </div>
          </div>
        ) : isMobile ? (
          /* ── Mobile card list ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filtrada.map(p => (
              <div key={p.id} style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}30` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <button onClick={() => setProvDetail(p.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, flex: 1, marginRight: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13, color: C.primary }}>{p.razonSocial}</span>
                      {p.homologado && <CheckCircle size={13} style={{ color: C.success }} />}
                    </div>
                    {p.nombreComercial && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{p.nombreComercial}</div>}
                  </button>
                  <span style={{ padding: '3px 8px', borderRadius: 4, fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, flexShrink: 0, background: p.activo ? `${C.primary}20` : `${C.danger}15`, color: p.activo ? C.primary : C.danger, border: `1px solid ${p.activo ? C.primary + '40' : C.danger + '40'}` }}>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginBottom: 8 }}>RUC {p.ruc}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                  {p.categorias.map(c => <CatBadge key={c} nombre={c} />)}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEditar(p)} style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 11, background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '6px 0', borderRadius: 6, cursor: 'pointer' }}>Editar</button>
                  <button onClick={() => toggleActivo(p.id)} style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 11, background: 'none', border: `1px solid ${C.border}`, color: p.activo ? C.warn : C.primary, padding: '6px 0', borderRadius: 6, cursor: 'pointer' }}>{p.activo ? 'Desactivar' : 'Activar'}</button>
                  <button onClick={() => setConfirmDelete(p.id)} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, background: 'none', border: `1px solid ${C.danger}40`, color: C.danger, padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}>×</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Desktop table ── */
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12, marginTop: 16 }}>
            <thead>
              <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                {['Razón Social', 'RUC', 'Categorías', 'Contacto Email', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '0 12px 10px 0', textAlign: 'left', fontWeight: 500, fontSize: 11, letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrada.map(p => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}40`, color: C.text }}>
                    <td style={{ padding: '12px 12px 12px 0' }}>
                      <button onClick={() => setProvDetail(p.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontWeight: 700, color: C.primary, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>{p.razonSocial}</span>
                        {p.homologado && <CheckCircle size={13} style={{ color: C.success }} />}
                        {p.nombreComercial && <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>· {p.nombreComercial}</span>}
                      </button>
                    </td>
                    <td style={{ padding: '12px 12px 12px 0', color: C.muted }}>{p.ruc}</td>
                    <td style={{ padding: '12px 12px 12px 0' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {p.categorias.map(c => <CatBadge key={c} nombre={c} />)}
                      </div>
                    </td>
                    <td style={{ padding: '12px 12px 12px 0', color: C.muted }}>{p.contactoEmail}</td>
                    <td style={{ padding: '12px 12px 12px 0' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 4, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, background: p.activo ? `${C.primary}20` : `${C.danger}15`, color: p.activo ? C.primary : C.danger, border: `1px solid ${p.activo ? C.primary + '40' : C.danger + '40'}` }}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 0 12px 0' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEditar(p)} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>Editar</button>
                        <button onClick={() => toggleActivo(p.id)} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, background: 'none', border: `1px solid ${C.border}`, color: p.activo ? C.warn : C.primary, padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>{p.activo ? 'Desactivar' : 'Activar'}</button>
                        <button onClick={() => setConfirmDelete(p.id)} style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, background: 'none', border: `1px solid ${C.danger}40`, color: C.danger, padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div style={modalOverlayStyle}>
          <div style={modalBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 15, color: C.text }}>{isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}</div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} style={{ color: C.muted }} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FormField label="Razón Social *" error={errores.razonSocial}>
                <input value={form.razonSocial} onChange={e => setField('razonSocial', e.target.value, 'razonSocial')} placeholder="Nombre legal completo" style={inputStyle(errores.razonSocial)} />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="RUC *" error={errores.ruc}>
                  <input value={form.ruc} onChange={e => setField('ruc', e.target.value, 'ruc')} placeholder="11 dígitos" maxLength={11} style={inputStyle(errores.ruc)} />
                </FormField>
                <FormField label="Nombre Comercial">
                  <input value={form.nombreComercial} onChange={e => setField('nombreComercial', e.target.value)} placeholder="Nombre abreviado" style={inputStyle()} />
                </FormField>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Nombre de Contacto">
                  <input value={form.contactoNombre} onChange={e => setField('contactoNombre', e.target.value)} placeholder="Nombre y apellido" style={inputStyle()} />
                </FormField>
                <FormField label="Teléfono">
                  <input value={form.contactoTelefono} onChange={e => setField('contactoTelefono', e.target.value)} placeholder="01-234-5678" style={inputStyle()} />
                </FormField>
              </div>
              <FormField label="Email de Contacto *" error={errores.contactoEmail}>
                <input value={form.contactoEmail} onChange={e => setField('contactoEmail', e.target.value, 'contactoEmail')} placeholder="correo@empresa.com" style={inputStyle(errores.contactoEmail)} />
              </FormField>
              <FormField label="Categorías * — selecciona una o más" error={errores.categorias}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 12px', borderRadius: 8, border: `1px solid ${errores.categorias ? C.danger : C.border}`, background: C.bg }}>
                  {CATEGORIAS.map(cat => {
                    const sel = form.categorias.includes(cat.nombre)
                    return (
                      <button key={cat.nombre} type="button" onClick={() => toggleFormCat(cat.nombre)}
                        style={{ padding: '5px 12px', borderRadius: 6, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: sel ? 600 : 400, background: sel ? cat.bg : `${cat.bg}20`, color: sel ? cat.fg : cat.bg, border: `2px solid ${sel ? cat.bg : cat.bg + '55'}`, cursor: 'pointer' }}>
                        {cat.nombre}
                      </button>
                    )
                  })}
                </div>
              </FormField>
              <FormField label="Notas">
                <textarea value={form.notas} onChange={e => setField('notas', e.target.value)} placeholder="Condiciones especiales, lead time, observaciones..." rows={3} style={{ ...inputStyle(), resize: 'vertical', minHeight: 72 }} />
              </FormField>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20, paddingTop: 18, borderTop: `1px solid ${C.border}` }}>
              <button onClick={closeModal} style={{ padding: '9px 20px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '9px 20px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, background: C.primary, color: C.bg, border: 'none', cursor: 'pointer' }}>{isEdit ? 'Guardar Cambios' : 'Crear Proveedor'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(50,54,58,0.52)', padding: isMobile ? '0 20px' : 0 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: isMobile ? '100%' : 400 }}>
            <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 8 }}>Eliminar Proveedor</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: C.muted, marginBottom: 20 }}>
              ¿Estás seguro de eliminar a <b style={{ color: C.text }}>{delProv?.razonSocial}</b>? Esta acción no se puede deshacer.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '8px 18px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ padding: '8px 18px', borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, background: C.danger, color: '#fff', border: 'none', cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ficha de proveedor (OCs por cliente + documentos) ── */}
      {provVista && (
        <ProveedorDialog prov={provVista} isMobile={isMobile} onClose={() => setProvDetail(null)} onSetHomologado={setHomologado} />
      )}
    </div>
  )
}


// ─── ACUERDOS MARCO ──────────────────────────────────────────────────────────
function Acuerdos({ isMobile }) {
  const cols = [
    { key: 'vigentes',   label: 'Vigentes',    color: C.primary, data: acuerdos.vigentes   },
    { key: 'porRenovar', label: 'Por Renovar', color: C.warn,    data: acuerdos.porRenovar },
    { key: 'vencidos',   label: 'Vencidos',    color: C.danger,  data: acuerdos.vencidos   },
  ]
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 14px' : 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
        {cols.map(({ key, label, color, data }) => (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 12, color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'Inter, sans-serif', fontSize: 11, background: `${color}20`, color, padding: '2px 8px', borderRadius: 99 }}>{data.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.map((a, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>{a.nombre}</div>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginBottom: 8 }}>{a.proveedor}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, background: C.border, color: C.muted, padding: '2px 6px', borderRadius: 3 }}>{a.cat}</span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: C.text }}>{fmt(a.valor)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Calendar size={10} style={{ color: C.muted }} />
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: key === 'vencidos' ? C.danger : key === 'porRenovar' ? C.warn : C.muted }}>Vence: {a.vence}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, background: C.border, borderRadius: 4, height: 6 }}>
                      <div style={{ height: 6, borderRadius: 4, background: color, width: `${a.ejec}%` }} />
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color }}>{a.ejec}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}

// ─── VIEWS MAP ────────────────────────────────────────────────────────────────
const VIEWS = {
  dashboard:   { comp: Dashboard,   title: 'Dashboard Ejecutivo'    },
  solped:      { comp: Solped,      title: 'Procesamiento SOLPED'   },
  proveedores: { comp: Proveedores, title: 'Maestro de Proveedores' },
  ordenes:     { comp: OrdenCompra, title: 'Órdenes de Compra'      },
  acuerdos:    { comp: Acuerdos,    title: 'Acuerdos Marco'         },
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('dashboard')
  const [session, setSession] = useState(undefined)   // undefined = cargando, null = sin sesión
  const [viewMode, setViewMode] = useState(() => {
    try { const s = localStorage.getItem('mp_viewmode'); if (s) return s } catch {}
    return window.innerWidth < 900 ? 'mobile' : 'desktop'
  })

  const isMobile = viewMode === 'mobile'

  // Sesión: estado inicial + suscripción a cambios (login/logout/refresh de token).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const toggleViewMode = () => {
    const next = isMobile ? 'desktop' : 'mobile'
    setViewMode(next)
    try { localStorage.setItem('mp_viewmode', next) } catch {}
  }

  const signOut = () => supabase.auth.signOut()

  const { comp: View, title } = VIEWS[view]

  // Cargando sesión → evita parpadeo del login.
  if (session === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: C.bg, fontFamily: 'Inter, sans-serif', fontSize: 13, color: C.muted }}>
        Cargando…
      </div>
    )
  }
  // Sin sesión → pantalla de login.
  if (!session) return <Login />

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: C.bg, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif' }}>
      {!isMobile && <Sidebar active={view} onNav={setView} />}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <Topbar title={title} isMobile={isMobile} viewMode={viewMode} onToggleViewMode={toggleViewMode} onSignOut={signOut} />
        <div className="print-content" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <View isMobile={isMobile} />
        </div>
        {isMobile && <BottomNav active={view} onNav={setView} />}
      </div>
    </div>
  )
}
