// ══════════════════════════════════════════════════════════════════════════════
//  Round-trip Excel de Documentos Solped
// ══════════════════════════════════════════════════════════════════════════════
//  El ERP exporta el documento ya procesado (con cabecera agrupada "Características
//  del material", la categoría autodetectada y el proveedor del último pedido) y
//  una columna editable "Categoría corregida". El usuario corrige en Excel los que
//  el ERP no pudo clasificar y vuelve a cargar el archivo: el ERP lo reconoce por
//  el marcador y aplica las correcciones.
// ══════════════════════════════════════════════════════════════════════════════

import * as XLSX from 'xlsx'

// Marcador técnico que identifica un Excel generado por el ERP (clave de re-import).
const MARCADOR = 'ID ERP (no editar)'

const COLUMNAS = [
  'N° SOLPED', 'Posición',
  'Código', 'Descripción', 'Fabricante', 'Modelo / N° parte', 'Grupo / Familia', 'Cantidad', 'Unidad',
  'Categoría (ERP)', 'Categoría corregida', 'Proveedor último pedido',
  MARCADOR,
]

// Construye y descarga el Excel procesado del documento.
export function exportarDocumentoExcel({ numero, archivo, items }) {
  // Fila 0: cabeceras agrupadas (combinadas). Fila 1: columnas reales.
  const grupoRow = ['Identificación', '', 'Características del material', '', '', '', '', '', '', '', '', '', '']
  const aoa = [grupoRow, COLUMNAS]
  for (const it of items) {
    aoa.push([
      it.solped || numero || '', it.posicion || '',
      it.codigoMaterial || '', it.textoBreve || '', it.fabricante || '', it.modelo || '', it.grupoArticulos || '',
      it.cantidad ?? '', it.unidad || '',
      it.categoria || 'No categoria', '', it.proveedorUltimo || '',
      it.id || '',
    ])
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },    // "Identificación" sobre N° SOLPED + Posición
    { s: { r: 0, c: 2 }, e: { r: 0, c: 12 } },   // "Características del material" sobre el resto
  ]
  ws['!cols'] = [
    { wch: 14 }, { wch: 9 }, { wch: 14 }, { wch: 42 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 9 },
    { wch: 7 }, { wch: 16 }, { wch: 18 }, { wch: 24 }, { wch: 38 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'SOLPED procesado')
  const safe = (numero || archivo || 'solped').toString().replace(/[^\w.-]+/g, '_').slice(0, 50)
  XLSX.writeFile(wb, `MinosERP_${safe}.xlsx`)
}

// ¿Las filas crudas corresponden a un Excel generado por el ERP (round-trip)?
export function esExcelERP(rows) {
  return (rows || []).slice(0, 6).some(r => (r || []).some(c => String(c).trim() === MARCADOR))
}

// Lee las correcciones de categoría de un Excel ERP. Devuelve [{ id, categoria }]
// solo para filas con corrección válida (categoría reconocida y distinta de vacío).
export function leerCorrecciones(rows, categoriasValidas) {
  const validas = new Set(categoriasValidas)
  let hIdx = -1
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    if ((rows[i] || []).some(c => String(c).trim() === MARCADOR)) { hIdx = i; break }
  }
  if (hIdx < 0) return []
  const head = rows[hIdx].map(c => String(c).trim())
  const idCol  = head.indexOf(MARCADOR)
  const corCol = head.findIndex(c => /categor.a corregida/i.test(c))
  if (idCol < 0 || corCol < 0) return []
  const out = []
  for (let i = hIdx + 1; i < rows.length; i++) {
    const row = rows[i] || []
    const id  = String(row[idCol] ?? '').trim()
    const cat = String(row[corCol] ?? '').trim()
    if (!id || !cat) continue           // fila sin id o sin corrección
    if (!validas.has(cat)) continue     // categoría no reconocida ⇒ ignorar
    out.push({ id, categoria: cat })
  }
  return out
}
