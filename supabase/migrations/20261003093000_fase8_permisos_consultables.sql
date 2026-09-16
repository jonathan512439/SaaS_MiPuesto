-- Leer los permisos de columna necesita el catalogo del sistema, y PostgREST no
-- lo expone. Una funcion acotada a esta tabla lo hace consultable sin abrir
-- information_schema entero.
create or replace function public.permisos_de_columnas_negocios()
returns table (grantee text, privilege_type text, column_name text)
language sql
security definer
set search_path = ''
as $$
  select cp.grantee::text, cp.privilege_type::text, cp.column_name::text
  from information_schema.column_privileges cp
  where cp.table_schema = 'public'
    and cp.table_name = 'negocios'
    and cp.grantee in ('anon', 'authenticated')
$$;

revoke all on function public.permisos_de_columnas_negocios() from public, anon, authenticated;

comment on function public.permisos_de_columnas_negocios() is
  'Para la guarda de permisos por columna. Solo la clave de servicio la puede llamar.';
