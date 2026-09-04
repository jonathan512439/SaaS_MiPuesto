begin;

do $$
declare
  cantidad integer;
  tablas_sin_rls text;
  funciones_expuestas text;
begin
  select string_agg(clase.relname, ', ' order by clase.relname)
  into tablas_sin_rls
  from pg_class as clase
  join pg_namespace as espacio on espacio.oid = clase.relnamespace
  where espacio.nspname = 'public'
    and clase.relkind in ('r', 'p')
    and clase.relrowsecurity = false;

  if tablas_sin_rls is not null then
    raise exception 'Fase 9: tablas públicas sin RLS: %', tablas_sin_rls;
  end if;

  if has_table_privilege('anon', 'public.pedidos', 'select')
     or has_table_privilege('anon', 'public.pedido_items', 'select')
     or has_table_privilege('anon', 'public.eventos_analitica', 'select') then
    raise exception 'Fase 9: anon puede leer pedidos, artículos o analítica';
  end if;

  if has_table_privilege('authenticated', 'public.pedidos', 'insert,update,delete')
     or has_table_privilege('authenticated', 'public.pedido_items', 'insert,update,delete')
     or has_table_privilege('authenticated', 'public.eventos_analitica', 'update,delete') then
    raise exception 'Fase 9: authenticated conserva escritura directa sensible';
  end if;

  select string_agg(procedimiento.oid::regprocedure::text, ', ')
  into funciones_expuestas
  from pg_proc as procedimiento
  where procedimiento.pronamespace = 'public'::regnamespace
    and procedimiento.prosecdef = true
    and (
      has_function_privilege('anon', procedimiento.oid, 'execute')
      or has_function_privilege('authenticated', procedimiento.oid, 'execute')
    )
    and procedimiento.oid <> 'public.slug_disponible(text)'::regprocedure;

  if funciones_expuestas is not null then
    raise exception 'Fase 9: funciones SECURITY DEFINER expuestas: %', funciones_expuestas;
  end if;

  if has_function_privilege('anon', 'public.slug_disponible(text)', 'execute')
     or not has_function_privilege('authenticated', 'public.slug_disponible(text)', 'execute') then
    raise exception 'Fase 9: privilegios inesperados en slug_disponible';
  end if;

  if not exists (
    select 1
    from cron.job
    where jobname = 'mipuesto-expirar-reservas'
      and schedule = '*/5 * * * *'
      and active = true
      and command = 'select public.expirar_reservas_vencidas();'
  ) then
    raise exception 'Fase 9: el cron de expiración no está activo cada cinco minutos';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.expirar_reservas_vencidas(integer)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.expirar_reservas_vencidas(integer)',
    'execute'
  ) then
    raise exception 'Fase 9: privilegios inesperados en expiración de reservas';
  end if;

  select count(*) into cantidad
  from public.pedidos
  where estado in ('confirmado', 'cancelado', 'expirado')
    and creado_en < now() - interval '6 months'
    and (cliente_nombre is not null or cliente_telefono is not null);
  if cantidad <> 0 then
    raise exception 'Fase 9: existen % pedidos antiguos sin anonimizar', cantidad;
  end if;

  select count(*) into cantidad
  from public.pedidos
  where estado = 'pendiente'
    and expira_en < now() - interval '10 minutes';
  if cantidad <> 0 then
    raise exception 'Fase 9: existen % reservas vencidas sin procesar', cantidad;
  end if;

  select count(*) into cantidad
  from storage.objects as objeto
  where objeto.bucket_id = 'productos'
    and not exists (
      select 1
      from public.productos as producto
      where objeto.name = any(producto.fotos)
    );
  if cantidad <> 0 then
    raise exception 'Fase 9: existen % imágenes de producto huérfanas', cantidad;
  end if;

  select count(*) into cantidad
  from public.productos as producto
  cross join lateral unnest(producto.fotos) as foto(ruta)
  where not exists (
    select 1
    from storage.objects as objeto
    where objeto.bucket_id = 'productos' and objeto.name = foto.ruta
  );
  if cantidad <> 0 then
    raise exception 'Fase 9: existen % referencias de producto sin archivo', cantidad;
  end if;

  select count(*) into cantidad
  from storage.objects as objeto
  where objeto.bucket_id = 'negocios'
    and not exists (
      select 1
      from public.negocios as negocio
      where objeto.name = negocio.logo_url
         or objeto.name = negocio.portada_url
         or objeto.name = negocio.qr_pago_url
    );
  if cantidad <> 0 then
    raise exception 'Fase 9: existen % imágenes de negocio huérfanas', cantidad;
  end if;

  select count(*) into cantidad
  from public.negocios as negocio
  cross join lateral unnest(array[
    negocio.logo_url,
    negocio.portada_url,
    negocio.qr_pago_url
  ]) as imagen(ruta)
  where imagen.ruta is not null
    and not exists (
      select 1
      from storage.objects as objeto
      where objeto.bucket_id = 'negocios' and objeto.name = imagen.ruta
    );
  if cantidad <> 0 then
    raise exception 'Fase 9: existen % referencias de negocio sin archivo', cantidad;
  end if;
end;
$$;

select
  0 as tablas_publicas_sin_rls,
  0 as reservas_vencidas_mas_de_diez_minutos,
  0 as pedidos_antiguos_con_datos_personales,
  0 as archivos_huerfanos,
  'ok' as resultado;

rollback;
