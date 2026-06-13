-- ══════════════════════════════════════════════════════════════════════════════
--  Documentos Solped — metadatos de carga + reconciliación de posiciones
-- ══════════════════════════════════════════════════════════════════════════════
--  Un "Documento Solped" = un Excel cargado = UNA solped (numero + cliente),
--  modelada sobre la tabla `solpeds` ya existente.
--
--  Re-cargar el mismo (cliente, numero) NO crea un duplicado: la app reconcilia
--  los `solped_items` por `posicion` (upsert) y marca como inactivas las
--  posiciones que ya no vienen en la recarga (conservadas, no borradas).
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.solpeds
  add column if not exists archivo_nombre text,
  add column if not exists fecha_carga    timestamptz not null default now();

alter table public.solped_items
  add column if not exists activo boolean not null default true;

comment on column public.solpeds.archivo_nombre   is 'Nombre del Excel cargado (Documento Solped).';
comment on column public.solpeds.fecha_carga       is 'Fecha de la última carga/recarga del documento.';
comment on column public.solped_items.activo       is 'false = la posición ya no vino en la última recarga (conservada, no borrada).';
