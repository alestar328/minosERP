-- ══════════════════════════════════════════════════════════════════════════════
--  oc_items: fabricante y modelo / N° de parte (Observaciones 22/06, pto 9)
-- ══════════════════════════════════════════════════════════════════════════════
--  La Orden de Compra debe mostrar toda la información del material, incluyendo
--  fabricante y modelo separados (espejo de solped_items). Se arrastran desde la
--  selección (COD.SELECT.SOLPED) al emitir la OC.
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.oc_items add column if not exists fabricante text;
alter table public.oc_items add column if not exists modelo     text;

comment on column public.oc_items.fabricante is 'Fabricante/marca del material (desde solped_items).';
comment on column public.oc_items.modelo     is 'Modelo / N° de parte del material (desde solped_items).';
