-- ══════════════════════════════════════════════════════════════════════════════
--  Materiales ignorados — códigos que el usuario decidió NO catalogar
-- ══════════════════════════════════════════════════════════════════════════════
--  Al cargar una SOLPED, el ERP propone dar de alta los códigos que aún no están
--  en `materiales`. Si el usuario los rechaza (desmarca al guardar, o "No volver a
--  proponer"), su código se registra aquí para no volver a proponerlo en cada
--  recarga. No bloquea nada: si luego el código llega a `materiales` (alta manual
--  o desde una OC), esa tabla manda y la entrada aquí queda inerte.
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.materiales_ignorados (
  codigo     text primary key,
  created_at timestamptz not null default now()
);

alter table public.materiales_ignorados enable row level security;
create policy "auth_all_materiales_ignorados" on public.materiales_ignorados
  for all to authenticated using (true) with check (true);
