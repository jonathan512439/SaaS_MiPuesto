alter table public.negocios
add constraint negocios_admin_user_id_unico unique (admin_user_id);

alter table public.negocios
add constraint negocios_slug_longitud_check
check (char_length(slug) between 3 and 48);

alter table public.negocios
add constraint negocios_slug_reservado_check
check (
  slug <> all (
    array[
      'admin',
      'api',
      'actualizar-clave',
      'auth',
      'dashboard',
      'directorio',
      'estilos',
      'login',
      'recuperar-clave',
      'registro'
    ]::text[]
  )
);

create or replace function public.slug_disponible(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select auth.uid()) is not null
    and p_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(p_slug) between 3 and 48
    and p_slug <> all (
      array[
        'admin',
        'api',
        'actualizar-clave',
        'auth',
        'dashboard',
        'directorio',
        'estilos',
        'login',
        'recuperar-clave',
        'registro'
      ]::text[]
    )
    and not exists (
      select 1
      from public.negocios
      where negocios.slug = p_slug
        and negocios.admin_user_id <> (select auth.uid())
    ),
    false
  );
$$;

comment on function public.slug_disponible(text) is
  'Indica disponibilidad de un slug sin revelar filas de otros negocios.';

revoke all on function public.slug_disponible(text) from public, anon;
grant execute on function public.slug_disponible(text) to authenticated;
