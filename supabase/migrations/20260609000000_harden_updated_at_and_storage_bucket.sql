-- Hardening: fija search_path inmutable en el trigger de updated_at (lint 0011).
alter function public.set_updated_at() set search_path = '';

-- Storage: bucket privado para los documentos de homologación de proveedores.
-- proveedor_documentos.storage_path apunta a objetos en este bucket.
insert into storage.buckets (id, name, public)
values ('proveedor-docs', 'proveedor-docs', false)
on conflict (id) do nothing;

-- Política permisiva (coherente con la postura "permisiva ahora"): cualquier
-- usuario autenticado opera sobre los objetos de ESTE bucket. AJUSTAR antes de prod.
create policy "auth_all_proveedor_docs"
  on storage.objects for all to authenticated
  using (bucket_id = 'proveedor-docs')
  with check (bucket_id = 'proveedor-docs');
