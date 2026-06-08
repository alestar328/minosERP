-- Al crear un usuario en auth.users, crea automáticamente su fila en perfiles.
-- SECURITY DEFINER para poder insertar saltando RLS durante el alta.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email));
  return new;
end; $$;

-- No exponer la función como RPC (evita los lints 0028/0029).
revoke execute on function public.handle_new_user() from anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
