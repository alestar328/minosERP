-- ══════════════════════════════════════════════════════════════════════════════
--  Catálogo de materiales (híbrido, auto-alimentado desde el historial de OCs)
-- ══════════════════════════════════════════════════════════════════════════════
--  Maestro por `codigo` de material que el ERP mantiene solo: cada vez que se
--  registra una línea de OC (`oc_items`), un trigger actualiza aquí el "último
--  proveedor" / fecha / precio y hereda la categoría desde la línea de SOLPED de
--  origen. Sirve para (Fase 3) clasificar por código y para la columna
--  "Proveedor último pedido" que muestra la app.
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.materiales (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique,                                  -- clave de cruce con el SOLPED
  descripcion         text,                                                   -- última descripción conocida
  categoria_id        uuid references public.categorias(id)  on delete set null,
  -- Último pedido (autoalimentado desde OCs)
  ultimo_proveedor_id uuid references public.proveedores(id) on delete set null,
  ultima_fecha_compra date,
  ultimo_precio       numeric(16,2),
  ultima_moneda       char(3) default 'USD',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_materiales_proveedor on public.materiales(ultimo_proveedor_id);
create index if not exists idx_materiales_categoria on public.materiales(categoria_id);

create trigger trg_materiales_updated before update on public.materiales
  for each row execute function public.set_updated_at();

-- ── Auto-alimentación: upsert del material al registrar una línea de OC ─────────
create or replace function public.upsert_material_desde_oc_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_codigo text;
  v_prov   uuid;
  v_fecha  date;
  v_cat    uuid;
begin
  v_codigo := nullif(trim(coalesce(new.codigo, '')), '');
  if v_codigo is null then return new; end if;

  select o.proveedor_id, o.fecha_emision
    into v_prov, v_fecha
    from public.ordenes_compra o
   where o.id = new.oc_id;

  -- Categoría heredada de la línea de SOLPED de origen, si existe.
  if new.solped_item_id is not null then
    select si.categoria_id into v_cat
      from public.solped_items si where si.id = new.solped_item_id;
  end if;

  insert into public.materiales as m
      (codigo, descripcion, categoria_id, ultimo_proveedor_id, ultima_fecha_compra, ultimo_precio)
    values (v_codigo, new.descripcion, v_cat, v_prov, v_fecha, new.precio_unitario)
  on conflict (codigo) do update set
    descripcion  = coalesce(excluded.descripcion, m.descripcion),
    categoria_id = coalesce(excluded.categoria_id, m.categoria_id),
    -- Solo refresca el "último" si esta OC es igual o más reciente que la guardada.
    ultimo_proveedor_id = case when excluded.ultima_fecha_compra is not null
        and (m.ultima_fecha_compra is null or excluded.ultima_fecha_compra >= m.ultima_fecha_compra)
        then excluded.ultimo_proveedor_id else m.ultimo_proveedor_id end,
    ultimo_precio = case when excluded.ultima_fecha_compra is not null
        and (m.ultima_fecha_compra is null or excluded.ultima_fecha_compra >= m.ultima_fecha_compra)
        then excluded.ultimo_precio else m.ultimo_precio end,
    ultima_fecha_compra = case when excluded.ultima_fecha_compra is not null
        and (m.ultima_fecha_compra is null or excluded.ultima_fecha_compra >= m.ultima_fecha_compra)
        then excluded.ultima_fecha_compra else m.ultima_fecha_compra end;
  return new;
end $$;

create trigger trg_ocitems_material
  after insert or update on public.oc_items
  for each row execute function public.upsert_material_desde_oc_item();

-- ── Backfill desde OCs ya existentes (no-op si aún no hay historial) ────────────
insert into public.materiales (codigo, descripcion, categoria_id, ultimo_proveedor_id, ultima_fecha_compra, ultimo_precio)
select distinct on (upper(trim(oi.codigo)))
       trim(oi.codigo), oi.descripcion, si.categoria_id, o.proveedor_id, o.fecha_emision, oi.precio_unitario
  from public.oc_items oi
  join public.ordenes_compra o on o.id = oi.oc_id
  left join public.solped_items si on si.id = oi.solped_item_id
 where nullif(trim(coalesce(oi.codigo, '')), '') is not null
 order by upper(trim(oi.codigo)), o.fecha_emision desc nulls last
on conflict (codigo) do nothing;

-- ── RLS permisiva (mismo patrón que el resto; AJUSTAR antes de prod) ────────────
alter table public.materiales enable row level security;
create policy "auth_all_materiales" on public.materiales
  for all to authenticated using (true) with check (true);
