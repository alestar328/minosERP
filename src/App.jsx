import { useState, useEffect, useRef, Fragment } from 'react'
import Solped from './Solped.jsx'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  LayoutDashboard, Users, ShoppingCart, FileText, TrendingUp, Package,
  Bell, Plus, Eye, X, Calendar, Zap, BarChart2, CheckCircle, Search, ClipboardList
} from 'lucide-react'

// ─── PALETTE ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0D1B2A', card: '#1A2B3C', primary: '#00C896',
  gold: '#C9A84C', text: '#F0F4F8', muted: '#8BA3B8',
  border: '#243447', danger: '#EF4444', warn: '#F59E0B', info: '#3B82F6',
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const spendData = [
  { mes: 'Jun', gasto: 1820, ahorro: 68 }, { mes: 'Jul', gasto: 2140, ahorro: 95 },
  { mes: 'Ago', gasto: 1950, ahorro: 88 }, { mes: 'Set', gasto: 2380, ahorro: 124 },
  { mes: 'Oct', gasto: 2100, ahorro: 102 }, { mes: 'Nov', gasto: 2560, ahorro: 138 },
  { mes: 'Dic', gasto: 2200, ahorro: 115 }, { mes: 'Ene', gasto: 1980, ahorro: 97 },
  { mes: 'Feb', gasto: 2340, ahorro: 131 }, { mes: 'Mar', gasto: 2680, ahorro: 156 },
  { mes: 'Abr', gasto: 2450, ahorro: 142 }, { mes: 'May', gasto: 2890, ahorro: 169 },
]

const recentOCs = [
  { oc: 'OC-2025-0341', proveedor: 'Famesa Explosivos', cat: 'Explosivos', monto: 284000, estado: 'Aprobada' },
  { oc: 'OC-2025-0340', proveedor: 'Orica Mining', cat: 'Reactivos', monto: 156800, estado: 'Pendiente' },
  { oc: 'OC-2025-0339', proveedor: 'Grupo Ferreyros', cat: 'Repuestos OEM', monto: 98400, estado: 'Aprobada' },
  { oc: 'OC-2025-0338', proveedor: 'Air Products', cat: 'Combustibles', monto: 312000, estado: 'Urgente' },
  { oc: 'OC-2025-0337', proveedor: 'MSA Safety', cat: 'EPP', monto: 42600, estado: 'Aprobada' },
]

const alertas = [
  { tipo: 'warn', icon: FileText, msg: 'Contrato EPP Seguridad vence en 18 días', sub: 'MSA Safety · Marco #FA-2025-008' },
  { tipo: 'danger', icon: Package, msg: 'Stock crítico: Cianuro de Sodio — 12 días', sub: 'Mina Orcopampa · Reorden sugerido: 48 t' },
  { tipo: 'warn', icon: Users, msg: 'Evaluación anual pendiente — Grupo Ferreyros', sub: 'Última evaluación: Nov 2024 · Score: 74' },
  { tipo: 'success', icon: CheckCircle, msg: 'Acuerdo marco Explosivos renovado', sub: 'Famesa Explosivos · Vigente hasta May 2026' },
]

const proveedores = [
  { id: 1, nombre: 'Famesa Explosivos S.A.', ruc: '20100084136', cats: ['Explosivos', 'Insumos'], score: 92, estado: 'Homologado', otif: 96 },
  { id: 2, nombre: 'Orica Mining Services', ruc: '20389456123', cats: ['Reactivos', 'Explosivos'], score: 88, estado: 'Homologado', otif: 91 },
  { id: 3, nombre: 'Grupo Ferreyros S.A.', ruc: '20100128056', cats: ['Repuestos OEM', 'Maquinaria'], score: 74, estado: 'Condicional', otif: 82 },
  { id: 4, nombre: 'Air Products Perú', ruc: '20512345678', cats: ['Gases', 'Combustibles'], score: 85, estado: 'Homologado', otif: 94 },
  { id: 5, nombre: 'MSA Safety Perú', ruc: '20456789012', cats: ['EPP', 'Seguridad'], score: 79, estado: 'Homologado', otif: 87 },
  { id: 6, nombre: 'SKF del Perú', ruc: '20345678901', cats: ['Rodamientos', 'Repuestos'], score: 55, estado: 'Condicional', otif: 71 },
  { id: 7, nombre: 'Exsa S.A.', ruc: '20100234567', cats: ['Explosivos'], score: 38, estado: 'Pendiente', otif: 0 },
  { id: 8, nombre: 'Komatsu Mitsui', ruc: '20234567890', cats: ['Maquinaria', 'Repuestos OEM'], score: 95, estado: 'Homologado', otif: 98 },
]

const evalHistory = [
  { fecha: 'Mar 2025', financiero: 90, tecnico: 94, legal: 92, ambiental: 91 },
  { fecha: 'Sep 2024', financiero: 87, tecnico: 91, legal: 90, ambiental: 89 },
  { fecha: 'Mar 2024', financiero: 84, tecnico: 88, legal: 87, ambiental: 86 },
]

const provScores = {
  1: { fin: 90, tec: 94, leg: 92, amb: 91 },
  2: { fin: 86, tec: 90, leg: 88, amb: 87 },
  3: { fin: 65, tec: 72, leg: 80, amb: 70 },
  4: { fin: 82, tec: 88, leg: 86, amb: 84 },
  5: { fin: 76, tec: 82, leg: 80, amb: 78 },
  6: { fin: 50, tec: 58, leg: 55, amb: 52 },
  7: { fin: 35, tec: 40, leg: 38, amb: 36 },
  8: { fin: 96, tec: 95, leg: 94, amb: 95 },
}

const ordenes = [
  { oc: 'OC-2025-0341', fecha: '22/05/2025', proveedor: 'Famesa Explosivos', cat: 'Explosivos', monto: 284000, tipo: 'Marco', estado: 'Aprobada', lead: 8 },
  { oc: 'OC-2025-0340', fecha: '21/05/2025', proveedor: 'Orica Mining', cat: 'Reactivos', monto: 156800, tipo: 'Marco', estado: 'Pendiente', lead: 12 },
  { oc: 'OC-2025-0339', fecha: '20/05/2025', proveedor: 'Grupo Ferreyros', cat: 'Repuestos OEM', monto: 98400, tipo: 'Spot', estado: 'Aprobada', lead: 18 },
  { oc: 'OC-2025-0338', fecha: '19/05/2025', proveedor: 'Air Products', cat: 'Combustibles', monto: 312000, tipo: 'Urgente', estado: 'Aprobada', lead: 3 },
  { oc: 'OC-2025-0337', fecha: '18/05/2025', proveedor: 'MSA Safety', cat: 'EPP', monto: 42600, tipo: 'Marco', estado: 'Aprobada', lead: 6 },
  { oc: 'OC-2025-0336', fecha: '17/05/2025', proveedor: 'Komatsu Mitsui', cat: 'Maquinaria', monto: 875000, tipo: 'Importación', estado: 'En tránsito', lead: 45 },
  { oc: 'OC-2025-0335', fecha: '16/05/2025', proveedor: 'SKF del Perú', cat: 'Rodamientos', monto: 34200, tipo: 'Spot', estado: 'Borrador', lead: 10 },
  { oc: 'OC-2025-0334', fecha: '15/05/2025', proveedor: 'Exsa S.A.', cat: 'Explosivos', monto: 198000, tipo: 'Marco', estado: 'Urgente', lead: 2 },
  { oc: 'OC-2025-0333', fecha: '14/05/2025', proveedor: 'Air Products', cat: 'Gases', monto: 67800, tipo: 'Marco', estado: 'Completada', lead: 7 },
  { oc: 'OC-2025-0332', fecha: '13/05/2025', proveedor: 'Famesa Explosivos', cat: 'Explosivos', monto: 320000, tipo: 'Marco', estado: 'Completada', lead: 9 },
]

const ocItems = [
  { item: 'ANFO Pesado 94/6', unidad: 'TM', cant: 120, precio: 1800, total: 216000 },
  { item: 'Emulsión Matrix', unidad: 'TM', cant: 24, precio: 2500, total: 60000 },
  { item: 'Booster 400g', unidad: 'UND', cant: 800, precio: 10, total: 8000 },
]

const acuerdos = {
  vigentes: [
    { nombre: 'Suministro Explosivos ANFO', proveedor: 'Famesa Explosivos', cat: 'Explosivos', valor: 2400000, vence: '15/05/2026', ejec: 38 },
    { nombre: 'Reactivos Flotación Cu', proveedor: 'Orica Mining', cat: 'Reactivos', valor: 1800000, vence: '30/09/2025', ejec: 71 },
    { nombre: 'Repuestos Flota Mina', proveedor: 'Komatsu Mitsui', cat: 'Maquinaria', valor: 3200000, vence: '31/12/2025', ejec: 44 },
    { nombre: 'EPP Estándar Corporativo', proveedor: 'MSA Safety', cat: 'EPP', valor: 480000, vence: '30/06/2025', ejec: 82 },
    { nombre: 'Combustibles Planta', proveedor: 'Air Products', cat: 'Combustibles', valor: 960000, vence: '28/02/2026', ejec: 29 },
    { nombre: 'Rodamientos SKF Críticos', proveedor: 'SKF del Perú', cat: 'Repuestos', valor: 240000, vence: '31/10/2025', ejec: 56 },
    { nombre: 'Insumos Lab Metalurgia', proveedor: 'Merck Perú', cat: 'Reactivos', valor: 180000, vence: '15/11/2025', ejec: 48 },
    { nombre: 'Vestuario Industrial', proveedor: 'Workteam SAC', cat: 'EPP', valor: 120000, vence: '31/08/2025', ejec: 65 },
  ],
  porRenovar: [
    { nombre: 'Neumáticos Flota Mina', proveedor: 'Bridgestone Perú', cat: 'Repuestos OEM', valor: 560000, vence: '30/06/2025', ejec: 91 },
    { nombre: 'Gases Industriales', proveedor: 'Air Liquide', cat: 'Gases', valor: 320000, vence: '15/07/2025', ejec: 87 },
    { nombre: 'Aceites y Lubricantes', proveedor: 'Mobil Perú', cat: 'Insumos', valor: 240000, vence: '20/07/2025', ejec: 79 },
  ],
  vencidos: [
    { nombre: 'Acero Estructural', proveedor: 'Aceros Arequipa', cat: 'Materiales', valor: 180000, vence: '30/04/2025', ejec: 100 },
  ],
}

const ahorroComp = [
  { name: 'Explosivos ANFO', acuerdo: 1800, spot: 2250 },
  { name: 'Reactivos Cu', acuerdo: 2200, spot: 2650 },
  { name: 'Repuestos Komatsu', acuerdo: 3100, spot: 3800 },
  { name: 'EPP Estándar', acuerdo: 420, spot: 510 },
  { name: 'Combustibles', acuerdo: 890, spot: 1050 },
]

const gastoCat = [
  { name: 'Explosivos', value: 28, color: '#00C896' },
  { name: 'Reactivos', value: 22, color: '#3B82F6' },
  { name: 'Repuestos OEM', value: 19, color: '#C9A84C' },
  { name: 'EPP', value: 12, color: '#8B5CF6' },
  { name: 'Combustibles', value: 11, color: '#F59E0B' },
  { name: 'Otros', value: 8, color: '#6B7280' },
]

const paretoData = [
  { proveedor: 'Komatsu Mitsui', gasto: 3200, pct: 20.3, acum: 20.3, acuerdo: 88 },
  { proveedor: 'Famesa Explosivos', gasto: 2400, pct: 15.2, acum: 35.5, acuerdo: 95 },
  { proveedor: 'Orica Mining', gasto: 1800, pct: 11.4, acum: 46.9, acuerdo: 91 },
  { proveedor: 'Air Products', gasto: 1440, pct: 9.1, acum: 56.0, acuerdo: 100 },
  { proveedor: 'Bridgestone', gasto: 960, pct: 6.1, acum: 62.1, acuerdo: 84 },
  { proveedor: 'Air Liquide', gasto: 840, pct: 5.3, acum: 67.4, acuerdo: 76 },
  { proveedor: 'Mobil Perú', gasto: 720, pct: 4.6, acum: 72.0, acuerdo: 72 },
  { proveedor: 'SKF del Perú', gasto: 560, pct: 3.6, acum: 75.6, acuerdo: 68 },
  { proveedor: 'MSA Safety', gasto: 480, pct: 3.0, acum: 78.6, acuerdo: 100 },
  { proveedor: 'Merck Perú', gasto: 320, pct: 2.0, acum: 80.6, acuerdo: 100 },
]

const inventario = [
  { codigo: 'INV-00234', desc: 'ANFO Pesado 94/6', cat: 'Explosivos', stock: 84, unidad: 'TM', min: 60, max: 200, estado: 'Normal', valor: 151200, mov: 12 },
  { codigo: 'INV-00189', desc: 'Cianuro de Sodio', cat: 'Reactivos', stock: 18, unidad: 'TM', min: 40, max: 120, estado: 'Crítico', valor: 162000, mov: 28 },
  { codigo: 'INV-00312', desc: 'Aceite Hidráulico ISO 46', cat: 'Lubricantes', stock: 2400, unidad: 'L', min: 1000, max: 5000, estado: 'Normal', valor: 19200, mov: 8 },
  { codigo: 'INV-00445', desc: 'Correa transportadora B2000', cat: 'Repuestos', stock: 3, unidad: 'UND', min: 2, max: 6, estado: 'Bajo', valor: 24000, mov: 2 },
  { codigo: 'INV-00156', desc: 'Casco Minero 3M H700', cat: 'EPP', stock: 340, unidad: 'UND', min: 100, max: 500, estado: 'Normal', valor: 27200, mov: 45 },
  { codigo: 'INV-00078', desc: 'Rodamiento SKF 23040', cat: 'Repuestos', stock: 12, unidad: 'UND', min: 4, max: 20, estado: 'Normal', valor: 19200, mov: 3 },
  { codigo: 'INV-00567', desc: 'Xantato Isopropílico', cat: 'Reactivos', stock: 2, unidad: 'TM', min: 8, max: 25, estado: 'Crítico', valor: 14000, mov: 15 },
  { codigo: 'INV-00290', desc: 'Mecha de seguridad', cat: 'Explosivos', stock: 45000, unidad: 'M', min: 20000, max: 80000, estado: 'Normal', valor: 22500, mov: 6 },
]

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

function Badge({ children }) {
  const s = {
    Aprobada: `${C.primary}25`, Completada: `${C.primary}25`, Homologado: `${C.primary}25`, Vigente: `${C.primary}25`,
    Pendiente: `${C.warn}25`, Condicional: `${C.warn}25`,
    Urgente: `${C.danger}25`, Rechazado: `${C.danger}25`, Vencido: `${C.danger}25`, Crítico: `${C.danger}25`,
    'En tránsito': `${C.info}25`,
    Marco: `${C.primary}20`, Spot: `${C.info}20`, Importación: '#8B5CF620', Borrador: `${C.border}`,
    Bajo: `${C.warn}20`, Normal: `${C.primary}15`,
  }
  const tc = {
    Aprobada: C.primary, Completada: C.primary, Homologado: C.primary, Vigente: C.primary,
    Pendiente: C.warn, Condicional: C.warn, Bajo: C.warn,
    Urgente: C.danger, Rechazado: C.danger, Vencido: C.danger, Crítico: C.danger,
    'En tránsito': C.info,
    Marco: C.primary, Spot: C.info, Importación: '#A78BFA', Borrador: C.muted,
    Normal: C.primary,
  }
  return (
    <span className="text-xs font-mono px-2 py-0.5 rounded-sm" style={{ background: s[children] || C.border, color: tc[children] || C.muted }}>
      {children}
    </span>
  )
}

function Card({ children, className = '' }) {
  return <div className={`rounded-lg ${className}`} style={{ background: C.card, border: `1px solid ${C.border}` }}>{children}</div>
}

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs font-mono" style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text }}>
      <div className="font-bold mb-1">{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {p.value}K</div>)}
    </div>
  )
}

// ─── GAUGE MINI ───────────────────────────────────────────────────────────────
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
      <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', color: C.muted }}>{label}</div>
    </div>
  )
}

// ─── CATEGORÍAS PALETTE ───────────────────────────────────────────────────────
const CATEGORIAS = [
  { nombre: 'Repuestos',        bg: '#F0997B', fg: '#3d1200' },
  { nombre: 'Servicios',        bg: '#85B7EB', fg: '#001e3d' },
  { nombre: 'Reactivos',        bg: '#97C459', fg: '#0f2400' },
  { nombre: 'EPP',              bg: '#AFA9EC', fg: '#1a0f3d' },
  { nombre: 'Eléctrico / E&I',  bg: '#5DCAA5', fg: '#00261a' },
  { nombre: 'Lubricantes',      bg: '#EF9F27', fg: '#2e1800' },
  { nombre: 'Explosivos',       bg: '#F09595', fg: '#3d0000' },
  { nombre: 'Construcción',     bg: '#888780', fg: '#0f0f0e' },
  { nombre: 'Otros',            bg: '#B4B2A9', fg: '#1a1a18' },
]

const SAMPLE_PROVEEDORES = [
  {
    id: '1', razonSocial: 'VULCO PERU S.A.', ruc: '20100674000',
    nombreComercial: 'Vulco', contactoNombre: 'Marco Salinas',
    contactoEmail: 'ventas@vulco.com.pe', contactoTelefono: '01-234-5678',
    categorias: ['Repuestos', 'Servicios'],
    notas: 'Proveedor homologado para repuestos de desgaste y revestimientos.',
    fechaAlta: '2024-01-15', activo: true,
  },
  {
    id: '2', razonSocial: 'ELECTRO FERRO CENTRO S.A.C.', ruc: '20503141380',
    nombreComercial: 'EFC', contactoNombre: 'Rosa Soto',
    contactoEmail: 'rsoto@efc.com.pe', contactoTelefono: '01-456-7890',
    categorias: ['Eléctrico / E&I', 'Repuestos'],
    notas: 'Ferretería industrial y eléctricos. Lead time 3–5 días.',
    fechaAlta: '2024-03-10', activo: true,
  },
  {
    id: '3', razonSocial: 'MERCANTIL INTERAMERICANA S.A.C.', ruc: '20171545670',
    nombreComercial: 'Mercantil', contactoNombre: 'Luis Quispe',
    contactoEmail: 'lquispe@mercantil.pe', contactoTelefono: '01-567-8901',
    categorias: ['Reactivos', 'Lubricantes'],
    notas: 'Proveedor de reactivos para proceso de flotación.',
    fechaAlta: '2024-05-20', activo: true,
  },
]

const PROV_KEY = 'minprocure_proveedores'

function inputStyle(err) {
  return {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    fontFamily: 'IBM Plex Mono', fontSize: 12,
    background: C.bg, border: `1px solid ${err ? C.danger : C.border}`,
    color: C.text, outline: 'none',
  }
}

function FormField({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, letterSpacing: '0.05em' }}>{label}</label>
      {children}
      {error && <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.danger }}>{error}</span>}
    </div>
  )
}

function CatBadge({ nombre }) {
  const cat = CATEGORIAS.find(c => c.nombre === nombre)
  return (
    <span style={{ padding: '2px 8px', borderRadius: 3, background: cat ? cat.bg : C.border, color: cat ? cat.fg : C.muted, fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: 600, display: 'inline-block' }}>
      {nombre}
    </span>
  )
}

const EMPTY_FORM = {
  razonSocial: '', ruc: '', nombreComercial: '',
  contactoNombre: '', contactoEmail: '', contactoTelefono: '',
  categorias: [], notas: '',
}

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

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard',   label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'solped',      label: 'SOLPEDs',           icon: ClipboardList },
  { id: 'proveedores', label: 'Proveedores',       icon: Users },
  { id: 'ordenes',     label: 'Órdenes de Compra', icon: ShoppingCart },
  { id: 'acuerdos',    label: 'Acuerdos Marco',    icon: FileText },
  { id: 'spend',       label: 'Spend Analysis',    icon: TrendingUp },
  { id: 'inventario',  label: 'Inventario MRO',    icon: Package },
]

function Sidebar({ active, onNav }) {
  return (
    <div className="flex flex-col h-full shrink-0" style={{ width: 220, background: C.card, borderRight: `1px solid ${C.border}` }}>
      <div className="px-5 py-5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: 20, color: C.primary, letterSpacing: '-0.5px' }}>
          Min<span style={{ color: C.gold }}>Procure</span>
        </div>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, marginTop: 2 }}>Outsourcing Estratégico</div>
      </div>
      <div className="mx-3 mt-3 px-3 py-2 rounded-lg" style={{ background: C.bg }}>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 600, color: C.text }}>Minera Buenaventura</div>
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted }}>S.A. — Unidad Orcopampa</div>
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: C.gold, background: `${C.gold}15`, border: `1px solid ${C.gold}40`, padding: '1px 8px', borderRadius: 3, display: 'inline-block', marginTop: 4 }}>DEMO</span>
      </div>
      <nav className="flex-1 px-2 py-3" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ id, label, icon: Icon }) => {
          const on = active === id
          return (
            <button key={id} onClick={() => onNav(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8,
                background: on ? `${C.primary}15` : 'transparent',
                color: on ? C.primary : C.muted,
                borderLeft: on ? `3px solid ${C.primary}` : '3px solid transparent',
                fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: on ? 600 : 400,
                cursor: 'pointer', border: on ? `1px solid ${C.primary}20` : '1px solid transparent',
                borderLeftColor: on ? C.primary : 'transparent',
                textAlign: 'left', width: '100%',
              }}>
              <Icon size={15} />{label}
            </button>
          )
        })}
      </nav>
      <div className="px-3 py-3" style={{ borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.primary, color: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter', fontWeight: 700, fontSize: 12 }}>JR</div>
          <div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 600, color: C.text }}>Jorge Ríos</div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted }}>Jefe de Compras</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Topbar({ title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', background: C.card, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15, color: C.text, letterSpacing: '0.3px' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <Bell size={16} style={{ color: C.muted }} />
          <span style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: C.danger, color: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'IBM Plex Mono' }}>3</span>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.primary, color: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter', fontWeight: 700, fontSize: 12 }}>JR</div>
      </div>
    </div>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Ahorro Generado YTD', value: 'US$ 1,247,800', sub: 'meta US$ 1,500,000', pct: 83, color: C.primary },
          { label: 'Compras Bajo Acuerdo', value: '73%', sub: 'meta: 80% del gasto', pct: 91, color: C.primary },
          { label: 'OTIF Proveedores', value: '88.4%', sub: 'últimos 90 días', pct: 93, color: C.gold },
          null,
        ].map((k, i) => k ? (
          <Card key={i} className="p-4">
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k.label}</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: 24, color: C.text, margin: '6px 0' }}>{k.value}</div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, marginBottom: 8 }}>{k.sub}</div>
            <ScoreBar value={k.pct} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'IBM Plex Mono', fontSize: 10, marginTop: 4 }}>
              <span style={{ color: k.color }}>{k.pct}% de meta</span>
            </div>
          </Card>
        ) : (
          <Card key={i} className="p-4">
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contratos Activos</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: 28, color: C.text, margin: '6px 0' }}>42</div>
            <Badge>Pendiente</Badge>
            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.warn, marginLeft: 6 }}>3 vencen en 30 días</span>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, marginTop: 6 }}>1 vencido sin renovar</div>
          </Card>
        ))}
      </div>

      {/* Area chart */}
      <Card className="p-5">
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
          Gasto Mensual vs. Ahorro Generado (US$ miles)
        </div>
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={spendData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.info} stopOpacity={0.3} />
                <stop offset="95%" stopColor={C.info} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.primary} stopOpacity={0.4} />
                <stop offset="95%" stopColor={C.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="mes" tick={{ fill: C.muted, fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.muted, fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
            <Tooltip content={<TooltipContent />} />
            <Area type="monotone" dataKey="gasto" name="Gasto" stroke={C.info} fill="url(#gG)" strokeWidth={2} />
            <Area type="monotone" dataKey="ahorro" name="Ahorro" stroke={C.primary} fill="url(#gA)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <Card className="p-4">
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Últimas Órdenes de Compra</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
            <thead>
              <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                {['N° OC', 'Proveedor', 'Categoría', 'Monto', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '0 12px 8px 0', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOCs.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}40` }}>
                  <td style={{ padding: '10px 12px 10px 0', color: C.primary }}>{r.oc}</td>
                  <td style={{ padding: '10px 12px 10px 0', color: C.text }}>{r.proveedor}</td>
                  <td style={{ padding: '10px 12px 10px 0', color: C.muted }}>{r.cat}</td>
                  <td style={{ padding: '10px 12px 10px 0', color: C.text, fontWeight: 600 }}>{fmt(r.monto)}</td>
                  <td style={{ padding: '10px 0 10px 0' }}><Badge>{r.estado}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="p-4">
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Alertas Activas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {alertas.map((a, i) => {
              const Icon = a.icon
              const color = a.tipo === 'danger' ? C.danger : a.tipo === 'warn' ? C.warn : C.primary
              return (
                <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 12, borderBottom: i < alertas.length - 1 ? `1px solid ${C.border}50` : 'none' }}>
                  <Icon size={14} style={{ color, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 600, color: C.text }}>{a.msg}</div>
                    <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, marginTop: 2 }}>{a.sub}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── PROVEEDORES ──────────────────────────────────────────────────────────────
function Proveedores() {
  const [lista, setLista] = useState(() => {
    try {
      const raw = localStorage.getItem(PROV_KEY)
      return raw ? JSON.parse(raw) : SAMPLE_PROVEEDORES
    } catch { return SAMPLE_PROVEEDORES }
  })
  const [search, setSearch] = useState('')
  const [filtroCats, setFiltroCats] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [errores, setErrores] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const isFirstSave = useRef(true)

  useEffect(() => {
    if (isFirstSave.current) { isFirstSave.current = false; return }
    localStorage.setItem(PROV_KEY, JSON.stringify(lista))
  }, [lista])

  const openNuevo = () => { setForm({ ...EMPTY_FORM }); setErrores({}); setModal('nuevo') }
  const openEditar = p => {
    setForm({
      razonSocial: p.razonSocial, ruc: p.ruc, nombreComercial: p.nombreComercial,
      contactoNombre: p.contactoNombre, contactoEmail: p.contactoEmail,
      contactoTelefono: p.contactoTelefono, categorias: [...p.categorias], notas: p.notas,
    })
    setErrores({})
    setModal(p.id)
  }
  const closeModal = () => { setModal(null); setErrores({}) }

  const handleSave = () => {
    const errs = validateProvForm(form)
    if (Object.keys(errs).length > 0) { setErrores(errs); return }
    if (modal === 'nuevo') {
      setLista(prev => [{
        ...form, id: crypto.randomUUID(),
        fechaAlta: new Date().toISOString().slice(0, 10), activo: true,
      }, ...prev])
    } else {
      setLista(prev => prev.map(p => p.id === modal ? { ...p, ...form } : p))
    }
    closeModal()
  }

  const toggleActivo = id => setLista(prev => prev.map(p => p.id === id ? { ...p, activo: !p.activo } : p))
  const handleDelete = id => { setLista(prev => prev.filter(p => p.id !== id)); setConfirmDelete(null) }
  const toggleCatFilter = cat => setFiltroCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  const toggleFormCat = cat => {
    setForm(prev => ({
      ...prev,
      categorias: prev.categorias.includes(cat) ? prev.categorias.filter(c => c !== cat) : [...prev.categorias, cat],
    }))
    if (errores.categorias) setErrores(e => ({ ...e, categorias: undefined }))
  }
  const setField = (key, val, errKey) => {
    setForm(f => ({ ...f, [key]: val }))
    if (errKey && errores[errKey]) setErrores(e => ({ ...e, [errKey]: undefined }))
  }

  const filtrada = lista.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.razonSocial.toLowerCase().includes(q) || p.ruc.includes(q) || p.nombreComercial.toLowerCase().includes(q)
    const matchCats = filtroCats.length === 0 || filtroCats.some(c => p.categorias.includes(c))
    const matchEstado = filtroEstado === 'todos' || (filtroEstado === 'activos' ? p.activo : !p.activo)
    return matchSearch && matchCats && matchEstado
  })

  const isEdit = modal && modal !== 'nuevo'
  const delProv = lista.find(p => p.id === confirmDelete)

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* ── Toolbar ── */}
      <div style={{ padding: '14px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Razón social, RUC o nombre comercial..."
              style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 8, fontFamily: 'IBM Plex Mono', fontSize: 12, background: C.card, border: `1px solid ${C.border}`, color: C.text, outline: 'none', width: 310 }} />
          </div>
          {[['todos', 'Todos'], ['activos', 'Activos'], ['inactivos', 'Inactivos']].map(([val, lbl]) => (
            <button key={val} onClick={() => setFiltroEstado(val)}
              style={{ padding: '7px 14px', borderRadius: 8, fontFamily: 'IBM Plex Mono', fontSize: 12, background: filtroEstado === val ? `${C.primary}20` : C.card, color: filtroEstado === val ? C.primary : C.muted, border: `1px solid ${filtroEstado === val ? C.primary : C.border}`, cursor: 'pointer' }}>
              {lbl}
            </button>
          ))}
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted }}>
            {filtrada.length} resultado{filtrada.length !== 1 ? 's' : ''}
          </span>
          <button onClick={openNuevo}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 8, fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 600, background: C.primary, color: C.bg, border: 'none', cursor: 'pointer' }}>
            <Plus size={13} /> Nuevo Proveedor
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, marginRight: 4 }}>Categoría:</span>
          {CATEGORIAS.map(cat => {
            const active = filtroCats.includes(cat.nombre)
            return (
              <button key={cat.nombre} onClick={() => toggleCatFilter(cat.nombre)}
                style={{ padding: '3px 10px', borderRadius: 4, fontFamily: 'IBM Plex Mono', fontSize: 11, fontWeight: active ? 600 : 400, background: active ? cat.bg : `${cat.bg}22`, color: active ? cat.fg : cat.bg, border: `1px solid ${active ? cat.bg : cat.bg + '60'}`, cursor: 'pointer' }}>
                {cat.nombre}
              </button>
            )
          })}
          {filtroCats.length > 0 && (
            <button onClick={() => setFiltroCats([])}
              style={{ padding: '3px 10px', borderRadius: 4, fontFamily: 'IBM Plex Mono', fontSize: 11, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
              × Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
        {filtrada.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} style={{ color: C.muted }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>
                {lista.length === 0 ? 'No hay proveedores registrados' : 'Sin resultados'}
              </div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: C.muted }}>
                {lista.length === 0 ? 'Haz clic en "Nuevo Proveedor" para comenzar.' : 'Ajusta los filtros o el texto de búsqueda.'}
              </div>
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono', fontSize: 12, marginTop: 16 }}>
            <thead>
              <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                {['Razón Social', 'RUC', 'Categorías', 'Contacto Email', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '0 12px 10px 0', textAlign: 'left', fontWeight: 500, fontSize: 11, letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrada.map(p => (
                <Fragment key={p.id}>
                  <tr style={{ borderBottom: expandedId === p.id ? 'none' : `1px solid ${C.border}40`, background: expandedId === p.id ? C.card : 'transparent', color: C.text }}>
                    <td style={{ padding: '12px 12px 12px 0' }}>
                      <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                        <div style={{ fontWeight: 700, color: expandedId === p.id ? C.primary : C.text, fontFamily: 'IBM Plex Mono', fontSize: 12 }}>{p.razonSocial}</div>
                        {p.nombreComercial && <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{p.nombreComercial}</div>}
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
                      <span style={{ padding: '3px 10px', borderRadius: 4, fontFamily: 'IBM Plex Mono', fontSize: 11, fontWeight: 600, background: p.activo ? `${C.primary}20` : `${C.danger}15`, color: p.activo ? C.primary : C.danger, border: `1px solid ${p.activo ? C.primary + '40' : C.danger + '40'}` }}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 0 12px 0' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEditar(p)} style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, background: 'none', border: `1px solid ${C.border}`, color: C.muted, padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>Editar</button>
                        <button onClick={() => toggleActivo(p.id)} style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, background: 'none', border: `1px solid ${C.border}`, color: p.activo ? C.warn : C.primary, padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>{p.activo ? 'Desactivar' : 'Activar'}</button>
                        <button onClick={() => setConfirmDelete(p.id)} style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, background: 'none', border: `1px solid ${C.danger}40`, color: C.danger, padding: '4px 10px', borderRadius: 6, cursor: 'pointer' }}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === p.id && (
                    <tr style={{ background: C.card, borderBottom: `1px solid ${C.border}40` }}>
                      <td colSpan={6} style={{ padding: '10px 0 16px 0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
                          <div>
                            <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Contacto</div>
                            <div style={{ color: C.text }}>{p.contactoNombre || '—'}</div>
                            <div style={{ color: C.muted, marginTop: 2 }}>{p.contactoTelefono || '—'}</div>
                          </div>
                          <div>
                            <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Email</div>
                            <div style={{ color: C.text }}>{p.contactoEmail}</div>
                          </div>
                          <div>
                            <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Fecha de Alta</div>
                            <div style={{ color: C.text }}>{p.fechaAlta}</div>
                          </div>
                          <div>
                            <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Notas</div>
                            <div style={{ color: C.muted }}>{p.notas || '—'}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,27,42,0.90)' }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 32, width: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: C.text }}>{isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}</div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} style={{ color: C.muted }} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormField label="Razón Social *" error={errores.razonSocial}>
                <input value={form.razonSocial} onChange={e => setField('razonSocial', e.target.value, 'razonSocial')}
                  placeholder="Nombre legal completo" style={inputStyle(errores.razonSocial)} />
              </FormField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="RUC *" error={errores.ruc}>
                  <input value={form.ruc} onChange={e => setField('ruc', e.target.value, 'ruc')}
                    placeholder="11 dígitos" maxLength={11} style={inputStyle(errores.ruc)} />
                </FormField>
                <FormField label="Nombre Comercial">
                  <input value={form.nombreComercial} onChange={e => setField('nombreComercial', e.target.value)}
                    placeholder="Nombre abreviado" style={inputStyle()} />
                </FormField>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="Nombre de Contacto">
                  <input value={form.contactoNombre} onChange={e => setField('contactoNombre', e.target.value)}
                    placeholder="Nombre y apellido" style={inputStyle()} />
                </FormField>
                <FormField label="Teléfono">
                  <input value={form.contactoTelefono} onChange={e => setField('contactoTelefono', e.target.value)}
                    placeholder="01-234-5678" style={inputStyle()} />
                </FormField>
              </div>
              <FormField label="Email de Contacto *" error={errores.contactoEmail}>
                <input value={form.contactoEmail} onChange={e => setField('contactoEmail', e.target.value, 'contactoEmail')}
                  placeholder="correo@empresa.com" style={inputStyle(errores.contactoEmail)} />
              </FormField>
              <FormField label="Categorías * — selecciona una o más" error={errores.categorias}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 12px', borderRadius: 8, border: `1px solid ${errores.categorias ? C.danger : C.border}`, background: C.bg }}>
                  {CATEGORIAS.map(cat => {
                    const sel = form.categorias.includes(cat.nombre)
                    return (
                      <button key={cat.nombre} type="button" onClick={() => toggleFormCat(cat.nombre)}
                        style={{ padding: '5px 12px', borderRadius: 6, fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: sel ? 600 : 400, background: sel ? cat.bg : `${cat.bg}20`, color: sel ? cat.fg : cat.bg, border: `2px solid ${sel ? cat.bg : cat.bg + '55'}`, cursor: 'pointer' }}>
                        {cat.nombre}
                      </button>
                    )
                  })}
                </div>
              </FormField>
              <FormField label="Notas">
                <textarea value={form.notas} onChange={e => setField('notas', e.target.value)}
                  placeholder="Condiciones especiales, lead time, observaciones..." rows={3}
                  style={{ ...inputStyle(), resize: 'vertical', minHeight: 72 }} />
              </FormField>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
              <button onClick={closeModal} style={{ padding: '9px 20px', borderRadius: 8, fontFamily: 'IBM Plex Mono', fontSize: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '9px 20px', borderRadius: 8, fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 600, background: C.primary, color: C.bg, border: 'none', cursor: 'pointer' }}>{isEdit ? 'Guardar Cambios' : 'Crear Proveedor'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,27,42,0.92)' }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: 400 }}>
            <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 8 }}>Eliminar Proveedor</div>
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: C.muted, marginBottom: 20 }}>
              ¿Estás seguro de eliminar a <b style={{ color: C.text }}>{delProv?.razonSocial}</b>? Esta acción no se puede deshacer.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '8px 18px', borderRadius: 8, fontFamily: 'IBM Plex Mono', fontSize: 12, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} style={{ padding: '8px 18px', borderRadius: 8, fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 600, background: C.danger, color: '#fff', border: 'none', cursor: 'pointer' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ÓRDENES ─────────────────────────────────────────────────────────────────
const STEP_LABELS = ['Solicitado', 'Aprobado', 'Enviado', 'Recibido']
const stepFor = (e) => ({ Borrador: 0, Pendiente: 1, Aprobada: 2, Urgente: 2, 'En tránsito': 3, Completada: 4 }[e] ?? 1)

function Ordenes() {
  const [filtro, setFiltro] = useState('Todas')
  const [modal, setModal] = useState(null)
  const filtMap = { Borradores: 'Borrador', 'Pendiente aprobación': 'Pendiente', Aprobadas: 'Aprobada', Urgentes: 'Urgente' }
  const list = filtro === 'Todas' ? ordenes : ordenes.filter(o => o.estado === filtMap[filtro])
  const oc = modal ? ordenes.find(o => o.oc === modal) : null

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { l: 'OC del Mes', v: '34', c: C.text },
          { l: 'Bajo Acuerdo Marco', v: '26 (76%)', c: C.primary },
          { l: 'Urgentes', v: '3', c: C.danger },
          { l: 'Ahorro del Mes', v: 'US$ 48,200', c: C.primary },
        ].map(({ l, v, c }) => (
          <Card key={l} className="px-4 py-3">
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted }}>{l}</div>
            <div style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: 22, color: c, marginTop: 4 }}>{v}</div>
          </Card>
        ))}
      </div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8 }}>
        {['Todas', 'Borradores', 'Pendiente aprobación', 'Aprobadas', 'Urgentes'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ padding: '6px 14px', borderRadius: 8, fontFamily: 'IBM Plex Mono', fontSize: 12, background: filtro === f ? `${C.primary}20` : C.card, color: filtro === f ? C.primary : C.muted, border: `1px solid ${filtro === f ? C.primary : C.border}`, cursor: 'pointer' }}>
            {f}
          </button>
        ))}
      </div>
      {/* Table */}
      <Card className="p-4" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
          <thead>
            <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
              {['N° OC', 'Fecha', 'Proveedor', 'Categoría', 'Monto USD', 'Tipo', 'Estado', 'Lead', ''].map(h => (
                <th key={h} style={{ padding: '0 12px 8px 0', textAlign: 'left', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((o, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}40`, color: C.text }}>
                <td style={{ padding: '10px 12px 10px 0', color: C.primary }}>{o.oc}</td>
                <td style={{ padding: '10px 12px 10px 0', color: C.muted }}>{o.fecha}</td>
                <td style={{ padding: '10px 12px 10px 0', fontWeight: 600 }}>{o.proveedor}</td>
                <td style={{ padding: '10px 12px 10px 0', color: C.muted }}>{o.cat}</td>
                <td style={{ padding: '10px 12px 10px 0', fontWeight: 600 }}>{fmt(o.monto)}</td>
                <td style={{ padding: '10px 12px 10px 0' }}><Badge>{o.tipo}</Badge></td>
                <td style={{ padding: '10px 12px 10px 0' }}><Badge>{o.estado}</Badge></td>
                <td style={{ padding: '10px 12px 10px 0', color: o.lead <= 5 ? C.danger : o.lead <= 10 ? C.warn : C.muted }}>{o.lead}d</td>
                <td><button onClick={() => setModal(o.oc)} style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.primary, fontFamily: 'IBM Plex Mono', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}><Eye size={12} /> Ver</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Modal */}
      {oc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,27,42,0.88)' }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: 540, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: C.text }}>{oc.oc}</div>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: C.muted, marginTop: 2 }}>{oc.proveedor} · {oc.cat} · {fmt(oc.monto)}</div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} style={{ color: C.muted }} /></button>
            </div>
            {/* Stepper */}
            <div style={{ display: 'flex', marginBottom: 24, position: 'relative' }}>
              {STEP_LABELS.map((s, i) => {
                const done = i < stepFor(oc.estado)
                const active = i === Math.min(stepFor(oc.estado) - 1, 3)
                const col = done || active ? C.primary : C.border
                return (
                  <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    {i < STEP_LABELS.length - 1 && (
                      <div style={{ position: 'absolute', top: 14, left: '50%', width: '100%', height: 2, background: done ? C.primary : C.border, zIndex: 0 }} />
                    )}
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: done || active ? C.primary : C.bg, color: done || active ? C.bg : C.muted, border: `2px solid ${col}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'IBM Plex Mono', fontWeight: 700, fontSize: 11, zIndex: 1 }}>
                      {done ? '✓' : i + 1}
                    </div>
                    <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, marginTop: 6, color: active || done ? C.text : C.muted }}>{s}</div>
                  </div>
                )
              })}
            </div>
            {/* Items */}
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Ítems</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono', fontSize: 12, marginBottom: 16 }}>
              <thead>
                <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                  {['Descripción', 'Unid.', 'Cant.', 'P.Unit.', 'Total'].map(h => <th key={h} style={{ padding: '0 10px 8px 0', textAlign: 'left', fontWeight: 500 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {ocItems.map((it, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}40`, color: C.text }}>
                    <td style={{ padding: '8px 10px 8px 0' }}>{it.item}</td>
                    <td style={{ padding: '8px 10px 8px 0', color: C.muted }}>{it.unidad}</td>
                    <td style={{ padding: '8px 10px 8px 0' }}>{it.cant}</td>
                    <td style={{ padding: '8px 10px 8px 0' }}>{fmt(it.precio)}</td>
                    <td style={{ padding: '8px 0 8px 0', color: C.primary, fontWeight: 600 }}>{fmt(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, color: C.muted }}>Total OC</span>
              <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: C.primary }}>{fmt(284000)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ACUERDOS MARCO ──────────────────────────────────────────────────────────
function Acuerdos() {
  const cols = [
    { key: 'vigentes', label: 'Vigentes', color: C.primary, data: acuerdos.vigentes },
    { key: 'porRenovar', label: 'Por Renovar', color: C.warn, data: acuerdos.porRenovar },
    { key: 'vencidos', label: 'Vencidos', color: C.danger, data: acuerdos.vencidos },
  ]
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {cols.map(({ key, label, color, data }) => (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 12, color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'IBM Plex Mono', fontSize: 11, background: `${color}20`, color, padding: '2px 8px', borderRadius: 99 }}>{data.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.map((a, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 2 }}>{a.nombre}</div>
                  <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, marginBottom: 8 }}>{a.proveedor}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, background: C.border, color: C.muted, padding: '2px 6px', borderRadius: 3 }}>{a.cat}</span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: C.text }}>{fmt(a.valor)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Calendar size={10} style={{ color: C.muted }} />
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: key === 'vencidos' ? C.danger : key === 'porRenovar' ? C.warn : C.muted }}>Vence: {a.vence}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, background: C.border, borderRadius: 4, height: 6 }}>
                      <div style={{ height: 6, borderRadius: 4, background: color, width: `${a.ejec}%` }} />
                    </div>
                    <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color }}>{a.ejec}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Card className="p-5">
        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
          Precio Bajo Acuerdo vs. Precio Spot — Top 5 Contratos (US$ miles)
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={ahorroComp} layout="vertical" margin={{ left: 10, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
            <XAxis type="number" tick={{ fill: C.muted, fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" tick={{ fill: C.muted, fontSize: 11, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={130} />
            <Tooltip formatter={(v, n) => [`US$ ${v}K`, n === 'acuerdo' ? 'Precio Acuerdo' : 'Precio Spot']} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.text }} />
            <Bar dataKey="spot" name="Spot" fill={`${C.danger}50`} radius={[0, 4, 4, 0]} />
            <Bar dataKey="acuerdo" name="Acuerdo" fill={C.primary} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

// ─── SPEND ANALYSIS ──────────────────────────────────────────────────────────
function Spend() {
  const [periodo, setPeriodo] = useState('YTD')
  const [unidad, setUnidad] = useState('Todas')
  const R = Math.PI / 180
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
    if (value < 10) return null
    const r = innerRadius + (outerRadius - innerRadius) * 0.5
    return <text x={cx + r * Math.cos(-midAngle * R)} y={cy + r * Math.sin(-midAngle * R)} fill={C.text} textAnchor="middle" dominantBaseline="central" fontSize={10} fontFamily="IBM Plex Mono" fontWeight="600">{value}%</text>
  }
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {['YTD', 'Q1', 'Q2', 'Q3', 'Q4'].map(p => (
          <button key={p} onClick={() => setPeriodo(p)}
            style={{ padding: '6px 14px', borderRadius: 8, fontFamily: 'IBM Plex Mono', fontSize: 12, background: periodo === p ? `${C.primary}20` : C.card, color: periodo === p ? C.primary : C.muted, border: `1px solid ${periodo === p ? C.primary : C.border}`, cursor: 'pointer' }}>
            {p}
          </button>
        ))}
        <div style={{ marginLeft: 16, display: 'flex', gap: 8 }}>
          {['Todas', 'Orcopampa', 'Uchucchacua', 'Tambomayo'].map(u => (
            <button key={u} onClick={() => setUnidad(u)}
              style={{ padding: '6px 14px', borderRadius: 8, fontFamily: 'IBM Plex Mono', fontSize: 12, background: unidad === u ? `${C.gold}20` : C.card, color: unidad === u ? C.gold : C.muted, border: `1px solid ${unidad === u ? C.gold : C.border}`, cursor: 'pointer' }}>
              {u}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
        <Card className="p-5">
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Gasto por Categoría</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={180} height={175}>
              <PieChart>
                <Pie data={gastoCat} cx={85} cy={82} innerRadius={46} outerRadius={78} dataKey="value" labelLine={false} label={renderLabel}>
                  {gastoCat.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v}%`, n]} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.text }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gastoCat.map((g, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: g.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, flex: 1 }}>{g.name}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 600, color: C.text }}>{g.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-4" style={{ overflowY: 'auto' }}>
          <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Top 10 Proveedores — Análisis Pareto</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
            <thead>
              <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                {['Proveedor', 'Gasto US$K', '% Total', '% Acum.', '% Marco'].map(h => <th key={h} style={{ padding: '0 12px 8px 0', textAlign: 'left', fontWeight: 500 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {paretoData.map((p, i) => {
                const is80 = p.acum <= 80.6 && (i === paretoData.length - 1 || paretoData[i + 1]?.acum > 80.6)
                return (
                  <>
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}40`, color: C.text }}>
                      <td style={{ padding: '9px 12px 9px 0' }}>{p.proveedor}</td>
                      <td style={{ padding: '9px 12px 9px 0', fontWeight: 600 }}>{p.gasto}</td>
                      <td style={{ padding: '9px 12px 9px 0', color: C.muted }}>{p.pct}%</td>
                      <td style={{ padding: '9px 12px 9px 0', color: p.acum <= 80 ? C.primary : C.muted }}>{p.acum}%</td>
                      <td style={{ padding: '9px 0 9px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 48, background: C.border, borderRadius: 4, height: 4 }}>
                            <div style={{ height: 4, borderRadius: 4, background: p.acuerdo >= 80 ? C.primary : C.gold, width: `${p.acuerdo}%` }} />
                          </div>
                          <span style={{ color: p.acuerdo >= 80 ? C.primary : C.gold }}>{p.acuerdo}%</span>
                        </div>
                      </td>
                    </tr>
                    {is80 && (
                      <tr key={`l${i}`}>
                        <td colSpan={5} style={{ padding: '4px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, borderTop: `1px dashed ${C.gold}` }} />
                            <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, background: `${C.gold}20`, color: C.gold, padding: '3px 10px', borderRadius: 4 }}>↑ 80% del gasto — Zona Pareto</span>
                            <div style={{ flex: 1, borderTop: `1px dashed ${C.gold}` }} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Spend Fragmentado Identificado', val: 'US$ 287,400', sub: '18% del gasto total · Oportunidad de consolidar en 3 categorías', icon: BarChart2, color: C.gold },
          { label: 'Compras de Emergencia', val: 'US$ 94,200', sub: '6% del gasto total · Objetivo: reducir a < 3%', icon: Zap, color: C.danger },
          { label: 'Proveedores Activos', val: '47', sub: 'Benchmark sector: 35 · Oportunidad de consolidar 12 proveedores', icon: Users, color: C.info },
        ].map(({ label, val, sub, icon: Icon, color }) => (
          <Card key={label} className="p-4" style={{ display: 'flex', gap: 14 }}>
            <div style={{ padding: 10, borderRadius: 8, background: `${color}15`, flexShrink: 0, alignSelf: 'flex-start' }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted }}>{label}</div>
              <div style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: 22, color, margin: '4px 0' }}>{val}</div>
              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted }}>{sub}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── INVENTARIO MRO ──────────────────────────────────────────────────────────
function Inventario() {
  const [filtro, setFiltro] = useState('Todos')
  const list = filtro === 'Todos' ? inventario : inventario.filter(i => i.estado === filtro)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { l: 'Ítems en Stock', v: '1,247', c: C.text },
          { l: 'Valor en Inventario', v: 'US$ 2.4M', c: C.text },
          { l: 'Stock Crítico', v: `${inventario.filter(i => i.estado === 'Crítico').length}`, c: C.danger, s: 'requieren reorden urgente' },
          { l: 'Stock Inmovilizado', v: '23', c: C.warn, s: 'sin movimiento 90+ días' },
        ].map(({ l, v, c, s }) => (
          <Card key={l} className="px-4 py-3">
            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted }}>{l}</div>
            <div style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: 26, color: c, marginTop: 4 }}>{v}</div>
            {s && <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: C.muted, marginTop: 2 }}>{s}</div>}
          </Card>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {['Todos', 'Crítico', 'Bajo', 'Normal'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ padding: '6px 14px', borderRadius: 8, fontFamily: 'IBM Plex Mono', fontSize: 12, background: filtro === f ? `${C.primary}20` : C.card, color: filtro === f ? C.primary : C.muted, border: `1px solid ${filtro === f ? C.primary : C.border}`, cursor: 'pointer' }}>
            {f}
          </button>
        ))}
        <button style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 8, fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 600, background: C.primary, color: C.bg, border: 'none', cursor: 'pointer' }}>
          <Plus size={13} /> Registrar Movimiento
        </button>
      </div>
      <Card className="p-4" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'IBM Plex Mono', fontSize: 12 }}>
          <thead>
            <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
              {['Código', 'Descripción', 'Categoría', 'Stock / Mín / Máx', 'Estado', 'Cobertura', 'Valor', 'Mov/mes'].map(h => (
                <th key={h} style={{ padding: '0 14px 8px 0', textAlign: 'left', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((item, i) => {
              const pct = Math.min((item.stock / item.max) * 100, 100)
              const color = item.estado === 'Crítico' ? C.danger : item.estado === 'Bajo' ? C.warn : C.primary
              const coberturaDias = item.mov > 0 ? Math.round(item.stock / (item.mov / 30)) : null
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}40`, color: C.text, background: item.estado === 'Crítico' ? `${C.danger}06` : 'transparent' }}>
                  <td style={{ padding: '10px 14px 10px 0', color: C.muted }}>{item.codigo}</td>
                  <td style={{ padding: '10px 14px 10px 0', fontWeight: 600 }}>{item.desc}</td>
                  <td style={{ padding: '10px 14px 10px 0', color: C.muted }}>{item.cat}</td>
                  <td style={{ padding: '10px 14px 10px 0', width: 150 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ color }}>{item.stock}</span>
                      <span style={{ color: C.muted, fontSize: 11 }}>/ {item.min} / {item.max} {item.unidad}</span>
                    </div>
                    <div style={{ background: C.border, borderRadius: 4, height: 5 }}>
                      <div style={{ height: 5, borderRadius: 4, background: color, width: `${pct}%` }} />
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px 10px 0' }}><Badge>{item.estado}</Badge></td>
                  <td style={{ padding: '10px 14px 10px 0' }}>
                    {item.estado === 'Crítico'
                      ? <span style={{ color: C.danger, fontWeight: 600 }}>{coberturaDias}d</span>
                      : <span style={{ color: C.muted }}>OK</span>}
                  </td>
                  <td style={{ padding: '10px 14px 10px 0', fontWeight: 600 }}>{fmt(item.valor)}</td>
                  <td style={{ padding: '10px 0 10px 0', color: C.muted }}>{item.mov}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ─── APP ─────────────────────────────────────────────────────────────────────
const VIEWS = {
  dashboard:   { comp: Dashboard,  title: 'Dashboard Ejecutivo' },
  solped:      { comp: Solped,     title: 'Procesamiento SOLPED' },
  proveedores: { comp: Proveedores, title: 'Maestro de Proveedores' },
  ordenes: { comp: Ordenes, title: 'Órdenes de Compra' },
  acuerdos: { comp: Acuerdos, title: 'Acuerdos Marco y Contratos' },
  spend: { comp: Spend, title: 'Spend Analysis' },
  inventario: { comp: Inventario, title: 'Inventario MRO' },
}

export default function App() {
  const [view, setView] = useState('dashboard')
  const { comp: View, title } = VIEWS[view]
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.bg, fontFamily: 'IBM Plex Mono, monospace' }}>
      <Sidebar active={view} onNav={setView} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <Topbar title={title} />
        <View />
      </div>
    </div>
  )
}
