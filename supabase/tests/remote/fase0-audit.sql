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
  tabla text;
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

  if has_function_privilege('anon', 'public.rls_auto_enable()', 'execute') then
    raise exception 'Auditoría de funciones: anon puede ejecutar rls_auto_enable';
  end if;

  if has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute') then
    raise exception 'Auditoría de funciones: authenticated puede ejecutar rls_auto_enable';
  end if;

  select count(*)
  into cantidad
  from pg_indexes
  where schemaname = 'public'
    and indexname = any(array[
      'idx_negocios_admin_user',
      'idx_productos_categoria',
      'idx_productos_subcategoria',
      'idx_promociones_producto',
      'idx_promociones_categoria',
      'idx_analitica_producto'
    ]);

  if cantidad <> 6 then
    raise exception 'Auditoría de índices: se esperaban 6 índices de FK y se encontraron %', cantidad;
  end if;

  foreach tabla in array tablas loop
    if not (
      has_table_privilege('service_role', format('public.%I', tabla), 'select')
      and has_table_privilege('service_role', format('public.%I', tabla), 'insert')
      and has_table_privilege('service_role', format('public.%I', tabla), 'update')
      and has_table_privilege('service_role', format('public.%I', tabla), 'delete')
    ) then
      raise exception 'Auditoría RLS: service_role no tiene permisos completos en %', tabla;
    end if;
  end loop;

  select count(*) into cantidad from public.negocios;
  if cantidad <> 3 then
    raise exception 'Auditoría seed: se esperaban 3 negocios y se encontraron %', cantidad;
  end if;

  select count(distinct tipo_negocio) into cantidad from public.negocios;
  if cantidad <> 3 then
    raise exception 'Auditoría seed: no están representadas las 3 modalidades';
  end if;

  select count(*) into cantidad from public.categorias;
  if cantidad <> 3 then
    raise exception 'Auditoría seed: se esperaban 3 categorías y se encontraron %', cantidad;
  end if;

  select count(*) into cantidad from public.productos;
  if cantidad <> 3 then
    raise exception 'Auditoría seed: se esperaban 3 productos y se encontraron %', cantidad;
  end if;
end;
$$;

select
  7 as tablas_con_rls,
  7 as tablas_con_politicas,
  6 as indices_fk_agregados,
  3 as negocios_seed,
  3 as modalidades_seed,
  'ok' as resultado;
