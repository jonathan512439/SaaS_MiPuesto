do $$
declare
  tablas text[] := array[
    'negocios',
    'categorias',
    'subcategorias',
    'productos',
    'promociones',
    'pedidos',
    'eventos_analitica'
  ];
  cantidad integer;
begin
  select count(*)
  into cantidad
  from pg_class
  where oid in (
    'public.negocios'::regclass,
    'public.categorias'::regclass,
    'public.subcategorias'::regclass,
    'public.productos'::regclass,
    'public.promociones'::regclass,
    'public.pedidos'::regclass,
    'public.eventos_analitica'::regclass
  )
  and relrowsecurity = true;

  if cantidad <> 7 then
    raise exception 'Auditoría RLS: se esperaban 7 tablas protegidas y se encontraron %', cantidad;
  end if;

  select count(distinct tablename)
  into cantidad
  from pg_policies
  where schemaname = 'public' and tablename = any(tablas);

  if cantidad <> 7 then
    raise exception 'Auditoría RLS: se esperaban políticas en 7 tablas y se encontraron %', cantidad;
  end if;

  if has_column_privilege('anon', 'public.negocios', 'admin_user_id', 'select') then
    raise exception 'Auditoría RLS: anon puede leer negocios.admin_user_id';
  end if;

  if has_table_privilege('anon', 'public.pedidos', 'select') then
    raise exception 'Auditoría RLS: anon puede leer pedidos';
  end if;

  if has_table_privilege('anon', 'public.eventos_analitica', 'select') then
    raise exception 'Auditoría RLS: anon puede leer eventos_analitica';
  end if;

  if has_function_privilege('anon', 'public.slug_disponible(text)', 'execute') then
    raise exception 'Auditoría de funciones: anon puede ejecutar slug_disponible';
  end if;

  if not has_function_privilege('authenticated', 'public.slug_disponible(text)', 'execute') then
    raise exception 'Auditoría de funciones: authenticated no puede ejecutar slug_disponible';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.negocios'::regclass
      and conname = 'negocios_admin_user_id_unico'
      and contype = 'u'
  ) then
    raise exception 'Auditoría de restricciones: falta el administrador único por negocio';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.negocios'::regclass
      and conname = 'negocios_slug_reservado_check'
      and contype = 'c'
  ) then
    raise exception 'Auditoría de restricciones: falta la protección de slugs reservados';
  end if;

  select count(*) into cantidad from public.negocios;
  if cantidad <> 3 then
    raise exception 'Auditoría seed: se esperaban 3 negocios y se encontraron %', cantidad;
  end if;

  select count(distinct tipo_negocio) into cantidad from public.negocios;
  if cantidad <> 3 then
    raise exception 'Auditoría seed: no están representadas las 3 modalidades';
  end if;
end;
$$;

select
  7 as tablas_con_rls,
  7 as tablas_con_politicas,
  2 as usuarios_prueba_requeridos,
  3 as negocios_seed,
  3 as modalidades_seed,
  'ok' as resultado;
