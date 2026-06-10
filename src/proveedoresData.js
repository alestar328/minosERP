// ── Fuente única del maestro de proveedores ──────────────────────────────────
// App.jsx (CRUD) y SolpedAgrupado.jsx (sugerencia de proveedor por categoría)
// leen de aquí, de modo que ambos vean exactamente la misma lista.

export const PROV_KEY = 'minprocure_proveedores'

// ── MOCK desactivado para pruebas con Excel reales (borrar más adelante) ──────
// El socio arranca con el maestro vacío y registra/carga sus proveedores reales.
// export const SAMPLE_PROVEEDORES = [
//   { id: '1', razonSocial: 'INSUANDINA S.A.C.',          ruc: '20601240001', nombreComercial: 'Insuandina',  contactoNombre: 'Marco Tello',   contactoEmail: 'ventas@insuandina.com.pe',  contactoTelefono: '01-234-5678', categorias: ['Repuestos', 'Servicios'],        notas: 'Proveedor homologado para repuestos de desgaste y revestimientos.',   fechaAlta: '2024-01-15', activo: true, homologado: true  },
//   { id: '2', razonSocial: 'ELECTRO ANDINO CENTRAL S.A.C.',ruc: '20601240002', nombreComercial: 'EAC',         contactoNombre: 'Rosa Quispe',   contactoEmail: 'rquispe@eacperu.com.pe',    contactoTelefono: '01-456-7890', categorias: ['Eléctrico / E&I', 'Repuestos'], notas: 'Ferretería industrial y eléctricos. Lead time 3–5 días.',              fechaAlta: '2024-03-10', activo: true, homologado: true  },
//   { id: '3', razonSocial: 'REACTIVOS Y QUIMICOS ANDINOS S.A.C.', ruc: '20601240003', nombreComercial: 'RQA', contactoNombre: 'Luis Paredes',  contactoEmail: 'lparedes@rqagroup.pe',      contactoTelefono: '01-567-8901', categorias: ['Reactivos', 'Lubricantes'],      notas: 'Proveedor de reactivos para proceso de flotación.',                    fechaAlta: '2024-05-20', activo: true, homologado: false },
// ]
export const SAMPLE_PROVEEDORES = []

// Lee el maestro desde localStorage; si está vacío usa la muestra. Tolerante a
// almacenamiento no disponible / datos corruptos.
export function cargarProveedores() {
  try {
    const raw = localStorage.getItem(PROV_KEY)
    const lista = raw ? JSON.parse(raw) : null
    return Array.isArray(lista) && lista.length ? lista : SAMPLE_PROVEEDORES
  } catch {
    return SAMPLE_PROVEEDORES
  }
}

// Devuelve los proveedores que cubren una categoría, ordenados del más idóneo
// al menos idóneo. Criterio (explicable, sin IA):
//   1) activo  2) homologado  3) especialista (cubre menos categorías ⇒ más foco)
//   4) orden alfabético como desempate estable.
export function proveedoresParaCategoria(proveedores, categoria) {
  return proveedores
    .filter(p => p.activo !== false && Array.isArray(p.categorias) && p.categorias.includes(categoria))
    .map(p => {
      const motivos = []
      if (p.homologado) motivos.push('Homologado')
      motivos.push(`Cubre «${categoria}»`)
      if (p.categorias.length === 1) motivos.push('Especialista')
      return { ...p, _motivos: motivos }
    })
    .sort((a, b) =>
      (b.homologado ? 1 : 0) - (a.homologado ? 1 : 0) ||
      a.categorias.length - b.categorias.length ||
      a.razonSocial.localeCompare(b.razonSocial)
    )
}
