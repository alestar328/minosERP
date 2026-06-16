-- ══════════════════════════════════════════════════════════════════════════════
--  COD.SELECT.SOLPED — agrupación de líneas de SOLPED para generar una Orden
-- ══════════════════════════════════════════════════════════════════════════════
--  En la ventana SOLPED el usuario selecciona N líneas (checkbox) y pulsa
--  «Generar orden»: se crea una "selección" con un código interno legible
--  (CSS-DDMMYYYY-NNN). Ese código se busca luego en la ventana Órdenes → Items
--  para cargar de golpe todas las líneas del grupo (código, descripción,
--  especificación = modelo, cantidad y unidad).
--
--  La membresía referencia `solped_items` (trazabilidad línea→línea, igual que
--  oc_items.solped_item_id). Borrar la línea o la selección cascadea la membresía.
-- ══════════════════════════════════════════════════════════════════════════════

create table public.solped_selecciones (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null unique,                       -- CSS-DDMMYYYY-NNN
  etiqueta    text,                                       -- nombre opcional dado por el usuario
  cliente_id  uuid references public.clientes(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.solped_seleccion_items (
  id             uuid primary key default gen_random_uuid(),
  seleccion_id   uuid not null references public.solped_selecciones(id) on delete cascade,
  solped_item_id uuid not null references public.solped_items(id)       on delete cascade,
  unique (seleccion_id, solped_item_id)
);
create index idx_selitems_sel  on public.solped_seleccion_items(seleccion_id);
create index idx_selitems_item on public.solped_seleccion_items(solped_item_id);

comment on table public.solped_selecciones      is 'Grupo de líneas de SOLPED (COD.SELECT.SOLPED) para alimentar una Orden de Compra.';
comment on column public.solped_selecciones.codigo is 'Código interno legible CSS-DDMMYYYY-NNN, buscable en la ventana Órdenes.';
comment on table public.solped_seleccion_items  is 'Líneas (solped_items) que pertenecen a una selección.';

-- RLS permisivo para autenticados (mismo patrón que el resto de tablas de negocio).
alter table public.solped_selecciones      enable row level security;
alter table public.solped_seleccion_items  enable row level security;
create policy "auth_all_solped_selecciones"     on public.solped_selecciones
  for all to authenticated using (true) with check (true);
create policy "auth_all_solped_seleccion_items" on public.solped_seleccion_items
  for all to authenticated using (true) with check (true);
