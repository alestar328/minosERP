import { useState, useEffect, useRef, Fragment } from 'react'
import Solped from './Solped.jsx'
import OrdenCompra from './OrdenCompra.jsx'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  LayoutDashboard, Users, ShoppingCart, FileText, Package,
  Bell, Plus, Eye, X, Calendar, CheckCircle, Search,
  ClipboardList, Monitor, Smartphone, MoreHorizontal,
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
  { tipo: 'warn',    icon: FileText,     msg: 'Contrato EPP Seguridad vence en 18 días',       sub: 'MSA Safety · Marco #FA-2025-008' },
  { tipo: 'danger',  icon: Package,      msg: 'Stock crítico: Cianuro de Sodio — 12 días',       sub: 'Mina Orcopampa · Reorden sugerido: 48 t' },
  { tipo: 'warn',    icon: Users,        msg: 'Evaluación anual pendiente — Grupo Ferreyros',    sub: 'Última evaluación: Nov 2024 · Score: 74' },
  { tipo: 'success', icon: CheckCircle,  msg: 'Acuerdo marco Explosivos renovado',               sub: 'Famesa Explosivos · Vigente hasta May 2026' },
]
const proveedoresStatic = [
  { id: 1, nombre: 'Famesa Explosivos S.A.', ruc: '20100084136', cats: ['Explosivos', 'Insumos'],       score: 92, estado: 'Homologado',  otif: 96 },
  { id: 2, nombre: 'Orica Mining Services',  ruc: '20389456123', cats: ['Reactivos', 'Explosivos'],     score: 88, estado: 'Homologado',  otif: 91 },
  { id: 3, nombre: 'Grupo Ferreyros S.A.',   ruc: '20100128056', cats: ['Repuestos OEM', 'Maquinaria'], score: 74, estado: 'Condicional', otif: 82 },
  { id: 4, nombre: 'Air Products Perú',      ruc: '20512345678', cats: ['Gases', 'Combustibles'],       score: 85, estado: 'Homologado',  otif: 94 },
  { id: 5, nombre: 'MSA Safety Perú',        ruc: '20456789012', cats: ['EPP', 'Seguridad'],            score: 79, estado: 'Homologado',  otif: 87 },
  { id: 6, nombre: 'SKF del Perú',           ruc: '20345678901', cats: ['Rodamientos', 'Repuestos'],    score: 55, estado: 'Condicional', otif: 71 },
  { id: 7, nombre: 'Exsa S.A.',              ruc: '20100234567', cats: ['Explosivos'],                  score: 38, estado: 'Pendiente',   otif: 0  },
  { id: 8, nombre: 'Komatsu Mitsui',         ruc: '20234567890', cats: ['Maquinaria', 'Repuestos OEM'], score: 95, estado: 'Homologado',  otif: 98 },
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
    { nombre: 'Suministro Explosivos ANFO', proveedor: 'Famesa Explosivos', cat: 'Explosivos',  valor: 2400000, vence: '15/05/2026', ejec: 38 },
    { nombre: 'Reactivos Flotación Cu',     proveedor: 'Orica Mining',       cat: 'Reactivos',   valor: 1800000, vence: '30/09/2025', ejec: 71 },
    { nombre: 'Repuestos Flota Mina',       proveedor: 'Komatsu Mitsui',     cat: 'Maquinaria',  valor: 3200000, vence: '31/12/2025', ejec: 44 },
    { nombre: 'EPP Estándar Corporativo',   proveedor: 'MSA Safety',         cat: 'EPP',         valor: 480000,  vence: '30/06/2025', ejec: 82 },
    { nombre: 'Combustibles Planta',        proveedor: 'Air Products',       cat: 'Combustibles',valor: 960000,  vence: '28/02/2026', ejec: 29 },
    { nombre: 'Rodamientos SKF Críticos',   proveedor: 'SKF del Perú',       cat: 'Repuestos',   valor: 240000,  vence: '31/10/2025', ejec: 56 },
    { nombre: 'Insumos Lab Metalurgia',     proveedor: 'Merck Perú',         cat: 'Reactivos',   valor: 180000,  vence: '15/11/2025', ejec: 48 },
    { nombre: 'Vestuario Industrial',       proveedor: 'Workteam SAC',       cat: 'EPP',         valor: 120000,  vence: '31/08/2025', ejec: 65 },
  ],
  porRenovar: [
    { nombre: 'Neumáticos Flota Mina',  proveedor: 'Bridgestone Perú', cat: 'Repuestos OEM', valor: 560000, vence: '30/06/2025', ejec: 91 },
    { nombre: 'Gases Industriales',     proveedor: 'Air Liquide',      cat: 'Gases',         valor: 320000, vence: '15/07/2025', ejec: 87 },
    { nombre: 'Aceites y Lubricantes',  proveedor: 'Mobil Perú',       cat: 'Insumos',       valor: 240000, vence: '20/07/2025', ejec: 79 },
  ],
  vencidos: [
    { nombre: 'Acero Estructural', proveedor: 'Aceros Arequipa', cat: 'Materiales', valor: 180000, vence: '30/04/2025', ejec: 100 },
  ],
}
const ahorroComp = [
  { name: 'Explosivos ANFO', acuerdo: 1800, spot: 2250 },
  { name: 'Reactivos Cu',    acuerdo: 2200, spot: 2650 },
  { name: 'Repuestos Komatsu',acuerdo: 3100, spot: 3800 },
  { name: 'EPP Estándar',    acuerdo: 420,  spot: 510  },
  { name: 'Combustibles',    acuerdo: 890,  spot: 1050 },
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

function Card({ children, className = '' }) {
  return <div className={`rounded-lg ${className}`} style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>{children}</div>
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
  { id: '1', razonSocial: 'VULCO PERU S.A.', ruc: '20100674000', nombreComercial: 'Vulco', contactoNombre: 'Marco Salinas', contactoEmail: 'ventas@vulco.com.pe', contactoTelefono: '01-234-5678', categorias: ['Repuestos', 'Servicios'], notas: 'Proveedor homologado para repuestos de desgaste y revestimientos.', fechaAlta: '2024-01-15', activo: true },
  { id: '2', razonSocial: 'ELECTRO FERRO CENTRO S.A.C.', ruc: '20503141380', nombreComercial: 'EFC', contactoNombre: 'Rosa Soto', contactoEmail: 'rsoto@efc.com.pe', contactoTelefono: '01-456-7890', categorias: ['Eléctrico / E&I', 'Repuestos'], notas: 'Ferretería industrial y eléctricos. Lead time 3–5 días.', fechaAlta: '2024-03-10', activo: true },
  { id: '3', razonSocial: 'MERCANTIL INTERAMERICANA S.A.C.', ruc: '20171545670', nombreComercial: 'Mercantil', contactoNombre: 'Luis Quispe', contactoEmail: 'lquispe@mercantil.pe', contactoTelefono: '01-567-8901', categorias: ['Reactivos', 'Lubricantes'], notas: 'Proveedor de reactivos para proceso de flotación.', fechaAlta: '2024-05-20', activo: true },
]

const PROV_KEY = 'minprocure_proveedores'

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
    <div className="no-print" style={{ height: 56, flexShrink: 0, background: C.card, borderTop: `1px solid ${C.border}`, display: 'flex', alignItems: 'stretch', boxShadow: '0 -2px 8px rgba(0,0,0,0.08)' }}>
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
  )
}

// ─── SIDEBAR (desktop) ────────────────────────────────────────────────────────
function Sidebar({ active, onNav }) {
  return (
    <div className="no-print" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: 220, background: C.card, borderRight: `1px solid ${C.border}`, flexShrink: 0 }}>
      {/* Shell brand strip */}
      <div style={{ background: C.shell, padding: '14px 18px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 18, color: '#fff', letterSpacing: '-0.3px' }}>
          Min<span style={{ color: '#7EC8FF' }}>Procure</span>
        </div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>Outsourcing Estratégico</div>
      </div>
      {/* Tenant selector */}
      <div style={{ margin: '10px 12px', padding: '8px 12px', borderRadius: 6, background: C.bg, border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: C.text }}>Minera Buenaventura</div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>S.A. — Unidad Orcopampa</div>
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
function Topbar({ title, isMobile, viewMode, onToggleViewMode }) {
  return (
    <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 14px' : '0 20px', height: isMobile ? 50 : 48, background: C.shell, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.18)' }}>
      {isMobile ? (
        <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 17, color: '#fff', letterSpacing: '-0.3px' }}>
          Min<span style={{ color: '#7EC8FF' }}>Procure</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '-0.2px' }}>MinProcure</span>
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
      </div>
    </div>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ isMobile }) {
  const P = isMobile ? '14px 14px' : 24
  const gap = isMobile ? 12 : 20
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: P, display: 'flex', flexDirection: 'column', gap }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: isMobile ? 10 : 16 }}>
        {[
          { label: 'Ahorro Generado YTD', value: 'US$ 1,247,800', sub: 'meta US$ 1,500,000', pct: 83, color: C.primary },
          { label: 'Compras Bajo Acuerdo', value: '73%',           sub: 'meta: 80% del gasto', pct: 91, color: C.primary },
          { label: 'OTIF Proveedores',     value: '88.4%',         sub: 'últimos 90 días',     pct: 93, color: C.gold   },
          null,
        ].map((k, i) => k ? (
          <Card key={i} className="p-4">
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: isMobile ? 9 : 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k.label}</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: isMobile ? 18 : 24, color: C.text, margin: '6px 0' }}>{k.value}</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginBottom: 8 }}>{k.sub}</div>
            <ScoreBar value={k.pct} />
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, marginTop: 4 }}>
              <span style={{ color: k.color }}>{k.pct}% de meta</span>
            </div>
          </Card>
        ) : (
          <Card key={i} className="p-4">
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: isMobile ? 9 : 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Contratos Activos</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, fontSize: isMobile ? 22 : 28, color: C.text, margin: '6px 0' }}>42</div>
            <Badge>Pendiente</Badge>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.warn, marginLeft: 6 }}>3 vencen en 30d</span>
          </Card>
        ))}
      </div>

      {/* Area chart */}
      <Card className="p-5">
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
          Gasto Mensual vs. Ahorro Generado (US$ miles)
        </div>
        <ResponsiveContainer width="100%" height={isMobile ? 150 : 210}>
          <AreaChart data={spendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.info} stopOpacity={0.3} /><stop offset="95%" stopColor={C.info} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.primary} stopOpacity={0.4} /><stop offset="95%" stopColor={C.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="mes" tick={{ fill: C.muted, fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: C.muted, fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={false} tickLine={false} />
            <Tooltip content={<TooltipContent />} />
            <Area type="monotone" dataKey="gasto"  name="Gasto"  stroke={C.info}    fill="url(#gG)" strokeWidth={2} />
            <Area type="monotone" dataKey="ahorro" name="Ahorro" stroke={C.primary} fill="url(#gA)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 16 }}>
        <Card className="p-4" style={{ overflowX: 'auto' }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Últimas Órdenes de Compra</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
            <thead>
              <tr style={{ color: C.muted, borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: '0 10px 8px 0', textAlign: 'left', fontWeight: 500 }}>N° OC</th>
                <th style={{ padding: '0 10px 8px 0', textAlign: 'left', fontWeight: 500 }}>Proveedor</th>
                {!isMobile && <th style={{ padding: '0 10px 8px 0', textAlign: 'left', fontWeight: 500 }}>Monto</th>}
                <th style={{ padding: '0 0 8px 0', textAlign: 'left', fontWeight: 500 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentOCs.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}40` }}>
                  <td style={{ padding: '9px 10px 9px 0', color: C.primary, whiteSpace: 'nowrap', fontSize: isMobile ? 11 : 12 }}>{r.oc}</td>
                  <td style={{ padding: '9px 10px 9px 0', color: C.text }}>
                    <div>{r.proveedor}</div>
                    {isMobile && <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{fmt(r.monto)}</div>}
                  </td>
                  {!isMobile && <td style={{ padding: '9px 10px 9px 0', color: C.text, fontWeight: 600 }}>{fmt(r.monto)}</td>}
                  <td style={{ padding: '9px 0 9px 0' }}><Badge>{r.estado}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="p-4">
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Alertas Activas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {alertas.map((a, i) => {
              const Icon = a.icon
              const color = a.tipo === 'danger' ? C.danger : a.tipo === 'warn' ? C.warn : C.primary
              return (
                <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 12, borderBottom: i < alertas.length - 1 ? `1px solid ${C.border}50` : 'none' }}>
                  <Icon size={14} style={{ color, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: C.text }}>{a.msg}</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, marginTop: 2 }}>{a.sub}</div>
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
  const [expandedId,    setExpandedId]    = useState(null)
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

  const toggleActivo = id => setLista(prev => prev.map(p => p.id === id ? { ...p, activo: !p.activo } : p))
  const handleDelete = id => { setLista(prev => prev.filter(p => p.id !== id)); setConfirmDelete(null) }

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
              <div key={p.id} style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}30`, background: expandedId === p.id ? C.card : 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, flex: 1, marginRight: 10 }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13, color: expandedId === p.id ? C.primary : C.text }}>{p.razonSocial}</div>
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

                {expandedId === p.id && (
                  <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: C.bg, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>{p.contactoEmail}</div>
                    {p.contactoTelefono && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted }}>{p.contactoTelefono}</div>}
                    {p.contactoNombre   && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.text }}>{p.contactoNombre}</div>}
                    {p.notas && <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, fontStyle: 'italic' }}>{p.notas}</div>}
                  </div>
                )}

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
                <Fragment key={p.id}>
                  <tr style={{ borderBottom: expandedId === p.id ? 'none' : `1px solid ${C.border}40`, background: expandedId === p.id ? C.card : 'transparent', color: C.text }}>
                    <td style={{ padding: '12px 12px 12px 0' }}>
                      <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                        <div style={{ fontWeight: 700, color: expandedId === p.id ? C.primary : C.text, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>{p.razonSocial}</div>
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
                  {expandedId === p.id && (
                    <tr style={{ background: C.card, borderBottom: `1px solid ${C.border}40` }}>
                      <td colSpan={6} style={{ padding: '10px 0 16px 0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, fontFamily: 'Inter, sans-serif', fontSize: 12 }}>
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

      <Card className="p-5">
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
          Precio Acuerdo vs. Precio Spot — Top 5 Contratos (US$ miles)
        </div>
        <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
          <BarChart data={ahorroComp} layout="vertical" margin={{ left: 10, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
            <XAxis type="number" tick={{ fill: C.muted, fontSize: 10, fontFamily: 'Inter, sans-serif' }} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" tick={{ fill: C.muted, fontSize: isMobile ? 9 : 11, fontFamily: 'Inter, sans-serif' }} axisLine={false} tickLine={false} width={isMobile ? 90 : 130} />
            <Tooltip formatter={(v, n) => [`US$ ${v}K`, n === 'acuerdo' ? 'Precio Acuerdo' : 'Precio Spot']} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, fontFamily: 'Inter, sans-serif', fontSize: 11, color: C.text }} />
            <Bar dataKey="spot"    name="Spot"    fill={`${C.danger}50`} radius={[0, 4, 4, 0]} />
            <Bar dataKey="acuerdo" name="Acuerdo" fill={C.primary}       radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
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
  const [viewMode, setViewMode] = useState(() => {
    try { const s = localStorage.getItem('mp_viewmode'); if (s) return s } catch {}
    return window.innerWidth < 900 ? 'mobile' : 'desktop'
  })

  const isMobile = viewMode === 'mobile'

  const toggleViewMode = () => {
    const next = isMobile ? 'desktop' : 'mobile'
    setViewMode(next)
    try { localStorage.setItem('mp_viewmode', next) } catch {}
  }

  const { comp: View, title } = VIEWS[view]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.bg, fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif' }}>
      {!isMobile && <Sidebar active={view} onNav={setView} />}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <Topbar title={title} isMobile={isMobile} viewMode={viewMode} onToggleViewMode={toggleViewMode} />
        <div className="print-content" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <View isMobile={isMobile} />
        </div>
        {isMobile && <BottomNav active={view} onNav={setView} />}
      </div>
    </div>
  )
}
