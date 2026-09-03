do $$
declare
  tablas text[] := array[
    'negocios',
    'categorias',
    'subcategorias',
    'productos',
    'promociones',
    'pedidos',
    'pedido_items',
    'eventos_analitica',
    'limites_pedidos_ip'
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
    'public.pedido_items'::regclass,
    'public.eventos_analitica'::regclass,
    'public.limites_pedidos_ip'::regclass
  )
  and relrowsecurity = true;

  if cantidad <> 9 then
    raise exception 'Auditoría RLS: se esperaban 9 tablas protegidas y se encontraron %', cantidad;
  end if;

  select count(distinct tablename)
  into cantidad
  from pg_policies
  where schemaname = 'public' and tablename = any(tablas);

  if cantidad <> 8 then
    raise exception 'Auditoría RLS: se esperaban políticas en 8 tablas y se encontraron %', cantidad;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'limites_pedidos_ip'
  ) then
    raise exception 'Auditoría RLS: la tabla interna de límites no debe tener políticas públicas';
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

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.negocios'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%plantilla_id%'
      and pg_get_constraintdef(oid) like '%clasica%'
      and pg_get_constraintdef(oid) like '%moderna%'
      and pg_get_constraintdef(oid) like '%minimal%'
  ) then
    raise exception 'Auditoría de restricciones: falta el conjunto permitido de plantillas';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.negocios'::regclass
      and conname = 'negocios_paleta_id_check'
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%mercado%'
      and pg_get_constraintdef(oid) like '%tierra%'
      and pg_get_constraintdef(oid) like '%oceano%'
      and pg_get_constraintdef(oid) like '%noche%'
  ) then
    raise exception 'Auditoría de restricciones: falta el conjunto permitido de paletas';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.productos'::regclass
      and conname = 'productos_contenido_valido_check'
      and contype = 'c'
  ) then
    raise exception 'Auditoría de catálogo: falta validar el contenido de productos';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.productos'::regclass
      and conname = 'productos_stock_coherente_check'
      and contype = 'c'
  ) then
    raise exception 'Auditoría de catálogo: falta validar la coherencia de stock';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'productos'
      and policyname = 'administra_productos_propios'
      and with_check like '%categoria_id%'
      and with_check like '%subcategoria_id%'
  ) then
    raise exception 'Auditoría de catálogo: la política de productos no valida sus relaciones';
  end if;

  if not exists (
    select 1 from storage.buckets
    where id = 'productos'
      and public = true
      and file_size_limit = 2097152
      and allowed_mime_types @> array['image/webp', 'image/jpeg', 'image/png']
  ) then
    raise exception 'Auditoría de Storage: el bucket productos no tiene la configuración esperada';
  end if;

  select count(*)
  into cantidad
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = any(array[
      'admin_lee_imagenes_productos',
      'admin_sube_imagenes_productos',
      'admin_actualiza_imagenes_productos',
      'admin_borra_imagenes_productos'
    ]);

  if cantidad <> 4 then
    raise exception 'Auditoría de Storage: se esperaban 4 políticas y se encontraron %', cantidad;
  end if;

  select count(*)
  into cantidad
  from public.negocios
  where id in (
    '20000000-0000-4000-8000-000000000001'::uuid,
    '20000000-0000-4000-8000-000000000002'::uuid,
    '20000000-0000-4000-8000-000000000003'::uuid
  );

  if cantidad <> 3 then
    raise exception 'Auditoría seed: faltan negocios base; se encontraron % de 3', cantidad;
  end if;

  select count(distinct tipo_negocio)
  into cantidad
  from public.negocios
  where id in (
    '20000000-0000-4000-8000-000000000001'::uuid,
    '20000000-0000-4000-8000-000000000002'::uuid,
    '20000000-0000-4000-8000-000000000003'::uuid
  );

  if cantidad <> 3 then
    raise exception 'Auditoría seed: los negocios base no representan las 3 modalidades';
  end if;
end;
$$;

select
  9 as tablas_con_rls,
  8 as tablas_con_politicas,
  2 as usuarios_prueba_requeridos,
  3 as negocios_seed,
  3 as modalidades_seed,
  4 as politicas_storage,
  'ok' as resultado;
