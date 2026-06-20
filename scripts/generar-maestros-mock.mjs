// ══════════════════════════════════════════════════════════════════════════════
//  Genera los dos Excel de MUESTRA que el socio cargará al ERP:
//    data_examples/proveedores_data.xlsx
//    data_examples/materiales_data.xlsx
//
//  Datos ficticios (mining Perú) que respetan el formato que el ERP sabe importar
//  (mismas cabeceras que src/maestrosExcel.js). El usuario los revisa/edita y los
//  carga desde las vistas Proveedores / Materiales.
//
//  Uso:  node scripts/generar-maestros-mock.mjs
// ══════════════════════════════════════════════════════════════════════════════

import * as XLSX from 'xlsx'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import { workbookProveedores, workbookMateriales } from '../src/maestrosExcel.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'data_examples')
mkdirSync(outDir, { recursive: true })

// ── Proveedores (clave: cabeceras canónicas de PROV_COLUMNS) ────────────────────
const proveedores = [
  { 'Razón Social': 'INSUMOS ANDINOS DEL SUR S.A.C.', 'RUC': '20512345671', 'Nombre Comercial': 'Insuandina', 'Nombre Contacto': 'Marco Tello',    'Email Contacto': 'ventas@insuandina.com.pe',   'Teléfono': '054-234567', 'Dirección': 'Av. Industrial 450, Arequipa',        'Categorías': 'Repuestos; Servicios',       'Estado Homologación': 'Homologado',  'Notas': 'Homologado para repuestos de desgaste y revestimientos.', 'Activo': 'Sí' },
  { 'Razón Social': 'ELECTRO ANDINO CENTRAL S.A.C.',  'RUC': '20512345672', 'Nombre Comercial': 'EAC',        'Nombre Contacto': 'Rosa Quispe',    'Email Contacto': 'rquispe@eacperu.com.pe',     'Teléfono': '01-4567890', 'Dirección': 'Calle Los Industriales 120, Lima',    'Categorías': 'Eléctrico / E&I; Repuestos', 'Estado Homologación': 'Homologado',  'Notas': 'Ferretería industrial y eléctricos. Lead time 3-5 días.', 'Activo': 'Sí' },
  { 'Razón Social': 'REACTIVOS Y QUIMICOS ANDINOS S.A.C.', 'RUC': '20512345673', 'Nombre Comercial': 'RQA',   'Nombre Contacto': 'Luis Paredes',   'Email Contacto': 'lparedes@rqagroup.pe',       'Teléfono': '054-345678', 'Dirección': 'Parque Industrial Río Seco, Arequipa', 'Categorías': 'Reactivos',                'Estado Homologación': 'Condicional', 'Notas': 'Reactivos para flotación. Pendiente certificado ISO.',   'Activo': 'Sí' },
  { 'Razón Social': 'LUBRICANTES MINEROS PERU S.A.',  'RUC': '20512345674', 'Nombre Comercial': 'Lubrimin',   'Nombre Contacto': 'Sandra Núñez',   'Email Contacto': 'ventas@lubrimin.com.pe',     'Teléfono': '01-5678901', 'Dirección': 'Av. Argentina 3200, Callao',          'Categorías': 'Lubricantes',              'Estado Homologación': 'Homologado',  'Notas': 'Distribuidor autorizado. Entrega a planta.',             'Activo': 'Sí' },
  { 'Razón Social': 'PIROTEC ANDINA S.A.',            'RUC': '20512345675', 'Nombre Comercial': 'Pirotec',    'Nombre Contacto': 'Carlos Mendoza', 'Email Contacto': 'ventas@pirotec.com.pe',      'Teléfono': '054-456789', 'Dirección': 'Km 12 Variante Uchumayo, Arequipa',   'Categorías': 'Explosivos',               'Estado Homologación': 'Homologado',  'Notas': 'Licencia SUCAMEC vigente. Requiere coordinación previa.','Activo': 'Sí' },
  { 'Razón Social': 'SEGURPRO PERU S.A.',             'RUC': '20512345676', 'Nombre Comercial': 'SegurPro',   'Nombre Contacto': 'Ana Flores',     'Email Contacto': 'ventas@segurpro.com.pe',     'Teléfono': '01-6789012', 'Dirección': 'Av. Colonial 1850, Lima',             'Categorías': 'EPP',                      'Estado Homologación': 'Homologado',  'Notas': 'EPP certificado. Stock permanente.',                     'Activo': 'Sí' },
  { 'Razón Social': 'METALMAQ INDUSTRIAL S.R.L.',     'RUC': '20512345677', 'Nombre Comercial': 'Metalmaq',   'Nombre Contacto': 'Diego Cárdenas', 'Email Contacto': 'compras@metalmaq.com.pe',    'Teléfono': '054-567890', 'Dirección': 'Av. Aviación 980, Arequipa',          'Categorías': 'Repuestos; Construcción',  'Estado Homologación': 'Pendiente',   'Notas': 'Maestranza y fabricación de estructuras.',               'Activo': 'Sí' },
  { 'Razón Social': 'CONSTRUCTORA Y SERVICIOS DEL ANDE S.A.C.', 'RUC': '20512345678', 'Nombre Comercial': 'Coserande', 'Nombre Contacto': 'Pedro Salas', 'Email Contacto': 'proyectos@coserande.pe', 'Teléfono': '01-7890123', 'Dirección': 'Jr. Construcción 220, Lima',     'Categorías': 'Construcción; Servicios',  'Estado Homologación': 'Condicional', 'Notas': 'Obras civiles menores y mantenimiento de salas.',        'Activo': 'Sí' },
  { 'Razón Social': 'RODAMIENTOS Y COMPONENTES SAC',  'RUC': '20512345679', 'Nombre Comercial': 'Rodacol',    'Nombre Contacto': 'Víctor Romero',  'Email Contacto': 'ventas@rodacol.com.pe',      'Teléfono': '054-678901', 'Dirección': 'Av. Parra 145, Arequipa',             'Categorías': 'Repuestos',                'Estado Homologación': 'Homologado',  'Notas': 'Rodamientos críticos de flota mina.',                    'Activo': 'Sí' },
  { 'Razón Social': 'GASES Y SOLDADURA INDUSTRIAL S.A.C.', 'RUC': '20512345680', 'Nombre Comercial': 'GasIndus', 'Nombre Contacto': 'Jorge Ríos',  'Email Contacto': 'despacho@gasindus.com.pe',  'Teléfono': '01-8901234', 'Dirección': 'Av. Néstor Gambetta 500, Callao',     'Categorías': 'Otros; Repuestos',         'Estado Homologación': 'Pendiente',   'Notas': 'Gases industriales y consumibles de soldadura.',         'Activo': 'No' },
  { 'Razón Social': 'SERVICIOS METALURGICOS LABORINDUS S.A.C.', 'RUC': '20512345681', 'Nombre Comercial': 'Laborindus', 'Nombre Contacto': 'Gabriela Loayza', 'Email Contacto': 'lab@laborindus.com.pe', 'Teléfono': '054-789012', 'Dirección': 'Calle Metalurgia 67, Arequipa', 'Categorías': 'Servicios; Reactivos', 'Estado Homologación': 'Condicional', 'Notas': 'Servicios de laboratorio metalúrgico y muestreo.',     'Activo': 'Sí' },
  { 'Razón Social': 'TUBERIAS Y GEOSINTETICOS HDPE PERU S.A.', 'RUC': '20512345682', 'Nombre Comercial': 'Tubandes', 'Nombre Contacto': 'Fernando Aguilar', 'Email Contacto': 'ventas@tubandes.com.pe', 'Teléfono': '01-9012345', 'Dirección': 'Panamericana Sur Km 25, Lima', 'Categorías': 'Construcción', 'Estado Homologación': 'Rechazado', 'Notas': 'No superó evaluación financiera 2025. Reevaluar.',     'Activo': 'No' },
]

// ── Materiales (clave: cabeceras canónicas de MAT_COLUMNS) ──────────────────────
const materiales = [
  { 'Código': 'MAT-100001', 'Descripción': 'RODAMIENTO RIGIDO DE BOLAS 6309-2RS',        'Categoría': 'Repuestos',       'Unidad': 'UN', 'Fabricante': 'SKF',       'Modelo': '6309-2RS1',      'Último Precio': 85.50,   'Moneda': 'USD' },
  { 'Código': 'MAT-100002', 'Descripción': 'SELLO MECANICO CARTUCHO 2 PULG',             'Categoría': 'Repuestos',       'Unidad': 'UN', 'Fabricante': 'John Crane', 'Modelo': 'T21-50',         'Último Precio': 240.00,  'Moneda': 'USD' },
  { 'Código': 'MAT-100003', 'Descripción': 'MANGUERA HIDRAULICA SAE100R2 1 PULG',        'Categoría': 'Repuestos',       'Unidad': 'M',  'Fabricante': 'Gates',     'Modelo': '16G2',           'Último Precio': 18.90,   'Moneda': 'USD' },
  { 'Código': 'MAT-100004', 'Descripción': 'LINER DE JEBE PARA MOLINO SAG',              'Categoría': 'Repuestos',       'Unidad': 'UN', 'Fabricante': 'Metso',     'Modelo': 'SAG-LNR-32',     'Último Precio': 1250.00, 'Moneda': 'USD' },
  { 'Código': 'MAT-100005', 'Descripción': 'XANTATO ISOPROPILICO DE SODIO SIPX',         'Categoría': 'Reactivos',       'Unidad': 'KG', 'Fabricante': 'Orica',     'Modelo': 'SIPX-90',        'Último Precio': 3.40,    'Moneda': 'USD' },
  { 'Código': 'MAT-100006', 'Descripción': 'ESPUMANTE MIBC METIL ISOBUTIL CARBINOL',     'Categoría': 'Reactivos',       'Unidad': 'KG', 'Fabricante': 'Cytec',     'Modelo': 'MIBC',           'Último Precio': 2.85,    'Moneda': 'USD' },
  { 'Código': 'MAT-100007', 'Descripción': 'FLOCULANTE ANIONICO ALTO PESO MOLECULAR',    'Categoría': 'Reactivos',       'Unidad': 'KG', 'Fabricante': 'SNF',       'Modelo': 'AN-934',         'Último Precio': 5.10,    'Moneda': 'USD' },
  { 'Código': 'MAT-100008', 'Descripción': 'GRASA EP2 MULTIPROPOSITO LITIO',             'Categoría': 'Lubricantes',     'Unidad': 'KG', 'Fabricante': 'Mobil',     'Modelo': 'Mobilgrease XHP 222', 'Último Precio': 6.20, 'Moneda': 'USD' },
  { 'Código': 'MAT-100009', 'Descripción': 'ACEITE HIDRAULICO ISO VG 68',               'Categoría': 'Lubricantes',     'Unidad': 'L',  'Fabricante': 'Shell',     'Modelo': 'Tellus S2 MX 68','Último Precio': 4.75,    'Moneda': 'USD' },
  { 'Código': 'MAT-100010', 'Descripción': 'CASCO DE SEGURIDAD CON RATCHET BLANCO',      'Categoría': 'EPP',             'Unidad': 'UN', 'Fabricante': '3M',        'Modelo': 'H-700',          'Último Precio': 12.50,   'Moneda': 'USD' },
  { 'Código': 'MAT-100011', 'Descripción': 'GUANTE DE NITRILO RECUBIERTO TALLA L',       'Categoría': 'EPP',             'Unidad': 'PAR','Fabricante': 'Ansell',    'Modelo': 'HyFlex 11-840',  'Último Precio': 3.20,    'Moneda': 'USD' },
  { 'Código': 'MAT-100012', 'Descripción': 'RESPIRADOR MEDIA CARA DOBLE CARTUCHO',       'Categoría': 'EPP',             'Unidad': 'UN', 'Fabricante': '3M',        'Modelo': '6200',           'Último Precio': 22.00,   'Moneda': 'USD' },
  { 'Código': 'MAT-100013', 'Descripción': 'CABLE VULCANIZADO NLT 3x12 AWG',             'Categoría': 'Eléctrico / E&I', 'Unidad': 'M',  'Fabricante': 'Indeco',    'Modelo': 'NLT-3x12',       'Último Precio': 2.90,    'Moneda': 'USD' },
  { 'Código': 'MAT-100014', 'Descripción': 'CONTACTOR TRIPOLAR 65A BOBINA 220V',         'Categoría': 'Eléctrico / E&I', 'Unidad': 'UN', 'Fabricante': 'Schneider', 'Modelo': 'LC1D65',         'Último Precio': 145.00,  'Moneda': 'USD' },
  { 'Código': 'MAT-100015', 'Descripción': 'VARIADOR DE FRECUENCIA 22KW 380V',           'Categoría': 'Eléctrico / E&I', 'Unidad': 'UN', 'Fabricante': 'ABB',       'Modelo': 'ACS580-22KW',    'Último Precio': 1980.00, 'Moneda': 'USD' },
  { 'Código': 'MAT-100016', 'Descripción': 'EMULSION ENCARTUCHADA 1-1/4 x 8 PULG',       'Categoría': 'Explosivos',      'Unidad': 'KG', 'Fabricante': 'Famesa',    'Modelo': 'Emulnor 3000',   'Último Precio': 2.10,    'Moneda': 'USD' },
  { 'Código': 'MAT-100017', 'Descripción': 'CORDON DETONANTE PENTACORD 5G',              'Categoría': 'Explosivos',      'Unidad': 'M',  'Fabricante': 'Exsa',      'Modelo': 'Pentacord 5G',   'Último Precio': 0.95,    'Moneda': 'USD' },
  { 'Código': 'MAT-100018', 'Descripción': 'TUBERIA HDPE PE100 SDR11 110MM',             'Categoría': 'Construcción',    'Unidad': 'M',  'Fabricante': 'Pavco',     'Modelo': 'PE100-110',      'Último Precio': 14.30,   'Moneda': 'USD' },
  { 'Código': 'MAT-100019', 'Descripción': 'CEMENTO PORTLAND TIPO I 42.5KG',             'Categoría': 'Construcción',    'Unidad': 'BOL','Fabricante': 'Yura',      'Modelo': 'Tipo I',         'Último Precio': 8.40,    'Moneda': 'USD' },
  { 'Código': 'MAT-100020', 'Descripción': 'SERVICIO DE CALIBRACION DE BALANZAS',        'Categoría': 'Servicios',       'Unidad': 'SERV','Fabricante': '',         'Modelo': '',               'Último Precio': 350.00,  'Moneda': 'USD' },
  { 'Código': 'MAT-100021', 'Descripción': 'ELECTRODO REVESTIDO E6011 1/8 PULG',         'Categoría': 'Otros',           'Unidad': 'KG', 'Fabricante': 'Soldexsa',  'Modelo': 'Cellocord AP',   'Último Precio': 3.80,    'Moneda': 'USD' },
  { 'Código': 'MAT-100022', 'Descripción': 'VALVULA MARIPOSA WAFER 6 PULG',              'Categoría': 'Eléctrico / E&I', 'Unidad': 'UN', 'Fabricante': 'Bray',      'Modelo': 'Series 31',      'Último Precio': 320.00,  'Moneda': 'USD' },
]

XLSX.writeFile(workbookProveedores(proveedores), join(outDir, 'proveedores_data.xlsx'))
XLSX.writeFile(workbookMateriales(materiales),   join(outDir, 'materiales_data.xlsx'))

console.log(`OK  ${proveedores.length} proveedores -> data_examples/proveedores_data.xlsx`)
console.log(`OK  ${materiales.length} materiales  -> data_examples/materiales_data.xlsx`)
