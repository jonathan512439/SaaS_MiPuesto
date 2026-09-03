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

select
  4 as politicas_storage_identidad,
  false as admin_puede_cambiar_activo,
  'ok' as resultado;
