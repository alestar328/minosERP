-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Minos ERP — Esquema inicial                                               ║
-- ║  Outsourcing estratégico de compras para minería (multi-cliente).          ║
-- ║                                                                            ║
-- ║  Derivado del prototipo (src/App.jsx, src/Solped.jsx, src/OrdenCompra.jsx).║
-- ║  Modelo: un operador de outsourcing (la instancia) compra por cuenta de    ║
-- ║  varias mineras = `clientes`. Los `proveedores` son compartidos.           ║
-- ║                                                                            ║
-- ║  Nota de tenancy: para multi-operador real, añadir `org_id` a las tablas   ║
-- ║  raíz y a las policies RLS. Aquí se asume un operador único.               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- ─── Trigger genérico de updated_at ───────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql
set search_path = ''            -- search_path inmutable (hardening; lint 0011)
as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ─── Tipos enumerados (conjuntos cerrados que usa la UI) ──────────────────────
create type estado_homologacion as enum ('Pendiente', 'Condicional', 'Homologado', 'Rechazado');
create type prioridad_solped    as enum ('Alta', 'Media', 'Baja');
create type estado_solped       as enum ('Pendiente', 'En proceso', 'Procesada', 'Rechazada');
create type estado_oc           as enum ('Borrador', 'Emitida', 'En tránsito', 'Entregada', 'Retrasada', 'Cerrada');
create type estado_acuerdo      as enum ('Vigente', 'Por Renovar', 'Vencido');
create type tipo_posicion        as enum ('L', 'F');   -- L = material, F = servicio
create type regla_campo         as enum ('textoBreve', 'grupoArticulos', 'tipoPos');
create type regla_tipo          as enum ('startsWith', 'contains', 'equals');

-- ══════════════════════════════════════════════════════════════════════════════
--  CLIENTES (empresas mineras atendidas por el outsourcing)
-- ══════════════════════════════════════════════════════════════════════════════
create table clientes (
  id           uuid primary key default gen_random_uuid(),
  razon_social text not null,
  ruc          char(11),
  unidad       text,                       -- p.ej. "Unidad Cerro Azul"
  -- Los 2 primeros dígitos del N° de OC identifican al cliente (45→C1, 46→C2…).
  prefijo_oc   text unique,                -- p.ej. '45'
  direccion    text,
  telefono     text,
  activo       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_clientes_updated before update on clientes
  for each row execute function set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
--  CATEGORÍAS (taxonomía única: proveedores + materiales SOLPED)
-- ══════════════════════════════════════════════════════════════════════════════
create table categorias (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null unique,
  color_bg  text,
  color_fg  text,
  orden     int  not null default 0,
  activo    boolean not null default true
);

-- Reglas de auto-clasificación DETERMINISTAS (sin IA). Se aplican en `orden`;
-- el primer match gana (igual que clasificarItem() en Solped.jsx).
create table categoria_reglas (
  id           uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references categorias(id) on delete cascade,
  campo        regla_campo not null,
  tipo         regla_tipo  not null,
  valores      text[]      not null,
  orden        int not null default 0
);
create index idx_categoria_reglas_cat on categoria_reglas(categoria_id);

-- ══════════════════════════════════════════════════════════════════════════════
--  PROVEEDORES
-- ══════════════════════════════════════════════════════════════════════════════
create table proveedores (
  id                  uuid primary key default gen_random_uuid(),
  razon_social        text not null,
  ruc                 char(11) unique,
  nombre_comercial    text,
  contacto_nombre     text,
  contacto_email      text,
  contacto_telefono   text,
  direccion           text,
  telefono            text,
  estado_homologacion estado_homologacion not null default 'Pendiente',
  score               int check (score between 0 and 100),
  otif                numeric(5,2) check (otif between 0 and 100),
  notas               text,
  fecha_alta          date not null default current_date,
  activo              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint ruc_11_digitos check (ruc is null or ruc ~ '^\d{11}$')
);
create trigger trg_proveedores_updated before update on proveedores
  for each row execute function set_updated_at();

-- M:N proveedor ↔ categoría
create table proveedor_categorias (
  proveedor_id uuid not null references proveedores(id) on delete cascade,
  categoria_id uuid not null references categorias(id)  on delete restrict,
  primary key (proveedor_id, categoria_id)
);
create index idx_provcat_cat on proveedor_categorias(categoria_id);

-- Documentos de homologación (el archivo vive en Supabase Storage; aquí va el metadato)
create table proveedor_documentos (
  id           uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id) on delete cascade,
  tipo_doc     text not null,   -- ficha-ruc | politicas | cargos | iso | sst | bancaria
  nombre       text not null,
  mime         text,
  size_bytes   bigint,
  storage_path text not null,   -- ruta en el bucket de Storage
  fecha        date not null default current_date,
  created_at   timestamptz not null default now(),
  unique (proveedor_id, tipo_doc)
);
create index idx_provdoc_prov on proveedor_documentos(proveedor_id);

-- Historial de evaluaciones (financiero / técnico / legal / ambiental)
create table evaluaciones_proveedor (
  id           uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references proveedores(id) on delete cascade,
  fecha        date not null,
  financiero   int check (financiero between 0 and 100),
  tecnico      int check (tecnico    between 0 and 100),
  legal        int check (legal      between 0 and 100),
  ambiental    int check (ambiental  between 0 and 100),
  created_at   timestamptz not null default now()
);
create index idx_eval_prov on evaluaciones_proveedor(proveedor_id);

-- ══════════════════════════════════════════════════════════════════════════════
--  SOLPEDs (solicitudes de pedido)
-- ══════════════════════════════════════════════════════════════════════════════
create table solpeds (
  id              uuid primary key default gen_random_uuid(),
  numero          text not null,           -- "SP-2025-0533" o "10050131"
  cliente_id      uuid references clientes(id) on delete set null,
  solicitante     text,
  area            text,
  fecha_solicitud date,
  prioridad       prioridad_solped not null default 'Media',
  estado          estado_solped    not null default 'Pendiente',
  moneda          char(3) default 'USD',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (cliente_id, numero)
);
create trigger trg_solpeds_updated before update on solpeds
  for each row execute function set_updated_at();
create index idx_solpeds_cliente on solpeds(cliente_id);

create table solped_items (
  id               uuid primary key default gen_random_uuid(),
  solped_id        uuid not null references solpeds(id) on delete cascade,
  posicion         text,
  codigo_material  text,
  texto_breve      text not null,
  especificacion   text,
  cantidad         numeric(14,3),
  unidad           text,
  tipo_pos         tipo_posicion,
  valor_total      numeric(16,2),
  moneda           char(3) default 'USD',
  grupo_articulos  text,
  grupo_compras    text,
  grupo_planif     text,
  area_necesidad   text,
  fecha_liberacion date,
  categoria_id     uuid references categorias(id) on delete set null,
  categoria_manual boolean not null default false   -- true ⇒ el usuario sobreescribió la auto-clasificación
);
create index idx_solpeditems_solped on solped_items(solped_id);
create index idx_solpeditems_cat    on solped_items(categoria_id);

-- Plantillas de ingesta: mapeo de cabeceras heterogéneas → campos canónicos.
-- Reconoce el formato de cada cliente por la "huella" de sus cabeceras (sin IA).
create table plantillas_ingesta (
  id         uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  nombre     text,
  huella     text not null unique,         -- cabeceras normalizadas y ordenadas
  mapeo      jsonb not null,               -- { campoCanonico: "Columna origen", ... }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_plantillas_updated before update on plantillas_ingesta
  for each row execute function set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
--  ÓRDENES DE COMPRA
-- ══════════════════════════════════════════════════════════════════════════════
create table ordenes_compra (
  id                 uuid primary key default gen_random_uuid(),
  numero_oc          text not null unique,          -- "4500047816" / "OC-2025-0341"
  cliente_id         uuid references clientes(id)    on delete set null,
  proveedor_id       uuid references proveedores(id) on delete set null,  -- una OC = UN proveedor
  -- SOLPED de origen (opcional). Una SOLPED puede FRACCIONARSE en varias OCs
  -- (una por proveedor); la trazabilidad fina vive en oc_items.solped_item_id.
  solped_id          uuid references solpeds(id)     on delete set null,
  fecha_emision      date not null default current_date,
  estado             estado_oc not null default 'Borrador',
  fecha_entrega      date,
  plazo_entrega_dias int,
  lugar_entrega      text,
  forma_pago_dias    int,                            -- crédito a N días
  comprador_nombre   text,
  comprador_email    text,
  comprador_telefono text,
  autorizado_por     text,
  fecha_autorizacion date,
  moneda             char(3) default 'USD',
  otif               numeric(5,2) check (otif between 0 and 100),
  motivo_retraso     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger trg_oc_updated before update on ordenes_compra
  for each row execute function set_updated_at();
create index idx_oc_cliente   on ordenes_compra(cliente_id);
create index idx_oc_proveedor on ordenes_compra(proveedor_id);
create index idx_oc_estado    on ordenes_compra(estado);

create table oc_items (
  id              uuid primary key default gen_random_uuid(),
  oc_id           uuid not null references ordenes_compra(id) on delete cascade,
  -- Trazabilidad línea→línea: el ítem de OC nace de una línea de SOLPED. Permite
  -- fraccionar una SOLPED entre varias OCs/proveedores y rastrear cada material.
  solped_item_id  uuid references solped_items(id) on delete set null,
  posicion        int,
  codigo          text,
  descripcion     text not null,
  especificacion  text,
  unidad          text default 'UN',
  cantidad        numeric(14,3) not null default 1,
  precio_unitario numeric(16,2) not null default 0,
  fecha_entrega   date,
  -- total por línea calculado (cantidad × precio_unitario)
  total           numeric(16,2) generated always as (cantidad * precio_unitario) stored
);
create index idx_ocitems_oc     on oc_items(oc_id);
create index idx_ocitems_solped on oc_items(solped_item_id);

-- ══════════════════════════════════════════════════════════════════════════════
--  ACUERDOS / CONTRATOS MARCO
-- ══════════════════════════════════════════════════════════════════════════════
create table acuerdos (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  proveedor_id       uuid references proveedores(id) on delete set null,
  categoria_id       uuid references categorias(id)  on delete set null,
  cliente_id         uuid references clientes(id)    on delete set null,
  valor              numeric(16,2),
  fecha_vencimiento  date,
  ejecucion_pct      int check (ejecucion_pct between 0 and 100),
  estado             estado_acuerdo not null default 'Vigente',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger trg_acuerdos_updated before update on acuerdos
  for each row execute function set_updated_at();
create index idx_acuerdos_prov on acuerdos(proveedor_id);

-- ══════════════════════════════════════════════════════════════════════════════
--  PERFILES (usuarios de la app, enlazados a Supabase Auth)
-- ══════════════════════════════════════════════════════════════════════════════
create table perfiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text,
  rol        text,                           -- "Jefe de Compras", "Comprador", …
  cliente_id uuid references clientes(id),   -- null = acceso a todos los clientes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_perfiles_updated before update on perfiles
  for each row execute function set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
--  SEED — Categorías + reglas de clasificación (espejo de CATEGORIAS_SOLPED)
-- ══════════════════════════════════════════════════════════════════════════════
insert into categorias (nombre, color_bg, color_fg, orden) values
  ('Servicios',       '#85B7EB', '#0C447C', 1),
  ('Repuestos',       '#F0997B', '#993C1D', 2),
  ('EPP',             '#AFA9EC', '#3C3489', 3),
  ('Eléctrico / E&I', '#5DCAA5', '#085041', 4),
  ('Reactivos',       '#97C459', '#27500A', 5),
  ('Lubricantes',     '#EF9F27', '#633806', 6),
  ('Explosivos',      '#F09595', '#791F1F', 7),
  ('Construcción',    '#888780', '#f0efe8', 8),
  ('Otros',           '#D3D1C7', '#444441', 9);

insert into categoria_reglas (categoria_id, campo, tipo, valores, orden)
select c.id, v.campo::regla_campo, v.tipo::regla_tipo, v.valores, v.orden
from (values
  ('Servicios',       'textoBreve',     'startsWith', array['SERV','CALI','REP/','CONT','FAB.'], 1),
  ('Servicios',       'tipoPos',        'equals',     array['F'], 2),
  ('Repuestos',       'textoBreve',     'contains',   array['REPUESTO','KIT','RODAMIENTO','SELLO','JUNTA','LINER','PLATO','CARRETE','POLEA','ROTOR','VENTILADOR','MANGUERA','NIPLE'], 1),
  ('Repuestos',       'grupoArticulos', 'startsWith', array['29','12','15'], 2),
  ('EPP',             'textoBreve',     'contains',   array['EPP','CASCO','LENTE','GUANTE','CHALECO','BOTAS','ARNÉS','ARNES','LÍNEA DE ANCLAJE','LINEA DE ANCLAJE','RESPIRADOR'], 1),
  ('EPP',             'grupoArticulos', 'startsWith', array['34'], 2),
  ('Eléctrico / E&I', 'textoBreve',     'contains',   array['AISLADOR','MOTOR','CONTACTOR','VARIADOR','CABLE','SENSOR','TRANSMISOR','VÁLVULA','VALVULA','DETECTOR','MÓDULO','MODULO','PLC','SWITCH'], 1),
  ('Eléctrico / E&I', 'grupoArticulos', 'startsWith', array['26','09'], 2),
  ('Reactivos',       'textoBreve',     'contains',   array['REACTIVO','XANTATO','ESPUMANTE','FLOCULANTE','CAL ','ANTIINCRUSTANTE','QUIMICO','QUÍMICO','ÁCIDO','ACIDO','MCT','MDC'], 1),
  ('Reactivos',       'grupoArticulos', 'startsWith', array['16'], 2),
  ('Lubricantes',     'textoBreve',     'contains',   array['LUBRICANTE','GRASA','ACEITE','OIL','GREASE'], 1),
  ('Lubricantes',     'grupoArticulos', 'startsWith', array['17'], 2),
  ('Explosivos',      'textoBreve',     'contains',   array['EXPLOSIVO','DETONANTE','CORDTEX','ANFO','EMULSIÓN','EMULSION'], 1),
  ('Explosivos',      'grupoArticulos', 'startsWith', array['11'], 2),
  ('Construcción',    'textoBreve',     'contains',   array['TUBERÍA','TUBERIA','HDPE','CONCRETO','CEMENTO','ACERO','ESTRUCTURA','SALA ELÉCTRICA','SALA ELECTRICA'], 1)
) as v(categoria, campo, tipo, valores, orden)
join categorias c on c.nombre = v.categoria;

-- ══════════════════════════════════════════════════════════════════════════════
--  RLS — habilitado en todas las tablas de negocio.
--  Las policies definitivas dependen del modelo de tenancy/roles; de momento se
--  deja una policy permisiva para usuarios autenticados. AJUSTAR antes de prod.
-- ══════════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'clientes','categorias','categoria_reglas','proveedores','proveedor_categorias',
    'proveedor_documentos','evaluaciones_proveedor','solpeds','solped_items',
    'plantillas_ingesta','ordenes_compra','oc_items','acuerdos','perfiles'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format($p$create policy "auth_all_%1$s" on %1$I
                       for all to authenticated using (true) with check (true);$p$, t);
  end loop;
end $$;
