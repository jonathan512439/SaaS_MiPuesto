begin;

do $$
declare
  cantidad integer;
begin
  if not exists (
    select 1 from storage.buckets
    where id = 'negocios'
      and public = true
      and file_size_limit = 2097152
      and allowed_mime_types @> array['image/webp', 'image/jpeg', 'image/png']
  ) then
    raise exception 'Fase 7: el bucket negocios no tiene la configuración esperada';
  end if;

  select count(*) into cantidad
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = any(array[
      'admin_lee_imagenes_negocio',
      'admin_sube_imagenes_negocio',
      'admin_actualiza_imagenes_negocio',
      'admin_borra_imagenes_negocio'
    ]);
  if cantidad <> 4 then
    raise exception 'Fase 7: se esperaban 4 políticas de identidad y se encontraron %', cantidad;
  end if;

  select count(*) into cantidad
  from storage.objects as objeto
  where objeto.bucket_id = 'negocios'
    and not exists (
      select 1
      from public.negocios as negocio
      where negocio.logo_url = objeto.name
         or negocio.portada_url = objeto.name
         or negocio.qr_pago_url = objeto.name
    );
  if cantidad <> 0 then
    raise exception 'Fase 7: se encontraron % archivos de identidad huérfanos', cantidad;
  end if;

  if has_column_privilege('authenticated', 'public.negocios', 'activo', 'update') then
    raise exception 'Fase 7: un administrador de negocio puede modificar activo';
  end if;

  if has_column_privilege('authenticated', 'public.negocios', 'verificado', 'update') then
    raise exception 'Fase 7: un administrador de negocio puede modificar verificado';
  end if;

  if not has_column_privilege('authenticated', 'public.negocios', 'logo_url', 'update')
     or not has_column_privilege('authenticated', 'public.negocios', 'portada_url', 'update')
     or not has_column_privilege('authenticated', 'public.negocios', 'qr_pago_url', 'update')
     or not has_column_privilege('authenticated', 'public.negocios', 'redes_sociales', 'update') then
    raise exception 'Fase 7: faltan permisos de edición sobre la identidad propia';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.productos'::regclass
      and tgname = 'productos_registrar_cambio_precio'
      and not tgisinternal
  ) then
    raise exception 'Fase 7: falta el trigger de auditoría de precio';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.negocios'::regclass
      and tgname = 'negocios_registrar_cambio_activo'
      and not tgisinternal
  ) then
    raise exception 'Fase 7: falta el trigger de auditoría de activación';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.promociones'::regclass
      and tgname = 'promociones_validar_destino'
      and not tgisinternal
  ) then
    raise exception 'Fase 7: falta validar la pertenencia del destino promocional';
  end if;

  if has_function_privilege(
    'authenticated',
    'private.calcular_precio_producto(numeric,uuid,uuid,uuid,timestamp with time zone)',
    'execute'
  ) then
    raise exception 'Fase 7: authenticated puede ejecutar directamente el cálculo transaccional';
  end if;

  if not has_function_privilege(
    'service_role',
    'private.calcular_precio_producto(numeric,uuid,uuid,uuid,timestamp with time zone)',
    'execute'
  ) then
    raise exception 'Fase 7: service_role no puede calcular el precio transaccional';
  end if;
end;
$$;

insert into public.promociones (
  id, negocio_id, tipo, valor, producto_id, categoria_id, fecha_inicio, fecha_fin, activo
)
values
  (
    '70000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    'porcentaje', 10, null,
    '30000000-0000-4000-8000-000000000002',
    null, null, true
  ),
  (
    '70000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    'monto_fijo', 20,
    '50000000-0000-4000-8000-000000000002', null,
    null, null, true
  ),
  (
    '70000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    'monto_fijo', 200,
    '50000000-0000-4000-8000-000000000002', null,
    '2099-01-01T00:00:00Z', null, true
  );

do $$
declare
  precio numeric;
begin
  select private.calcular_precio_producto(
    95,
    '20000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    '2026-09-03T12:00:00Z'
  ) into precio;
  if precio <> 75 then
    raise exception 'Fase 7: se esperaba el mejor precio 75 y se obtuvo %', precio;
  end if;

  select private.calcular_precio_producto(
    95,
    '20000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    '2099-01-01T00:00:00Z'
  ) into precio;
  if precio <> 0 then
    raise exception 'Fase 7: el precio debía limitarse a cero y se obtuvo %', precio;
  end if;
end;
$$;

insert into auth.users (id, email, raw_user_meta_data)
values (
  '97000000-0000-4000-8000-000000000001',
  'fase7@mipuesto.local',
  '{}'::jsonb
);

insert into public.negocios (
  id, admin_user_id, slug, nombre, tipo_negocio, telefono_whatsapp, horario,
  reserva_minutos, activo
) values (
  '97100000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000001',
  'auditoria-fase-7',
  'Auditoría Fase 7',
  'tienda_virtual',
  '59170000007',
  '{"modo":"siempre_abierto"}'::jsonb,
  45,
  true
);

insert into public.categorias (id, negocio_id, nombre)
values (
  '97200000-0000-4000-8000-000000000001',
  '97100000-0000-4000-8000-000000000001',
  'Categoría promocional'
);

insert into public.productos (
  id, negocio_id, categoria_id, codigo, nombre, precio, controla_stock, cantidad_stock
) values (
  '97300000-0000-4000-8000-000000000001',
  '97100000-0000-4000-8000-000000000001',
  '97200000-0000-4000-8000-000000000001',
  'PRD-PROMO',
  'Producto promocional',
  95,
  true,
  3
);

insert into public.promociones (
  id, negocio_id, tipo, valor, producto_id, categoria_id, fecha_inicio, fecha_fin, activo
) values
  (
    '97400000-0000-4000-8000-000000000001',
    '97100000-0000-4000-8000-000000000001',
    'porcentaje', 10, null,
    '97200000-0000-4000-8000-000000000001',
    null, null, true
  ),
  (
    '97400000-0000-4000-8000-000000000002',
    '97100000-0000-4000-8000-000000000001',
    'monto_fijo', 20,
    '97300000-0000-4000-8000-000000000001', null,
    null, null, true
  );

create temp table resultado_fase7 as
select public.crear_pedido_reservado(
  'auditoria-fase-7',
  jsonb_build_array(
    jsonb_build_object(
      'producto_id', '97300000-0000-4000-8000-000000000001'::uuid,
      'cantidad', 1
    )
  ),
  'Cliente de prueba',
  '59170000007',
  '97500000-0000-4000-8000-000000000001'::uuid,
  repeat('b', 64)
) as datos;

do $$
declare
  v_pedido_id uuid;
begin
  select (datos ->> 'id')::uuid into v_pedido_id from resultado_fase7;

  if (select (datos ->> 'total')::numeric from resultado_fase7) <> 75 then
    raise exception 'Fase 7: el pedido no usó el mejor precio promocional';
  end if;

  if (
    select precio_unitario
    from public.pedido_items
    where pedido_items.pedido_id = v_pedido_id
  ) <> 75 then
    raise exception 'Fase 7: la copia del artículo no conservó el precio promocional';
  end if;
end;
$$;

rollback;

select
  4 as politicas_storage_identidad,
  0 as archivos_identidad_huerfanos,
  false as admin_puede_cambiar_activo,
  75 as total_promocional_servidor,
  'ok' as resultado;
