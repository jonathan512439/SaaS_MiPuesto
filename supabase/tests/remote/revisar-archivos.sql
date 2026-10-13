-- La revisión de archivos de Storage: rotas y sin uso.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:archivos:ensayo
--
-- Arma el escenario —un archivo que existe, uno que falta, uno sin uso viejo y
-- uno recién subido— y lo deshace todo al final.

do $prueba$
declare
  v_negocio uuid;
  v_producto uuid;
  v_base text;
begin
  begin
    select producto.negocio_id, producto.id into v_negocio, v_producto
    from public.productos as producto
    order by producto.id
    limit 1;
    if v_producto is null then
      raise exception 'FALLO: la base de ensayo no tiene productos.';
    end if;
    v_base := v_negocio::text || '/' || v_producto::text || '/';

    update public.productos
    set fotos = array[v_base || 'existe.webp', v_base || 'falta.webp']
    where id = v_producto;
    -- Una dirección completa no es de nuestro Storage: no cuenta como rota.
    update public.negocios set logo_url = 'https://ejemplo.com/logo.png' where id = v_negocio;

    insert into storage.objects (bucket_id, name, created_at)
    values
      ('productos', v_base || 'existe.webp', now() - interval '2 hours'),
      ('productos', v_base || 'huerfano.webp', now() - interval '2 hours'),
      ('productos', v_base || 'reciente.webp', now());

    if not exists (select 1 from public.revisar_archivos_storage() r
                   where r.tipo = 'rota' and r.ruta = v_base || 'falta.webp') then
      raise exception 'FALLO: una foto sin archivo no salió como rota.';
    end if;
    if exists (select 1 from public.revisar_archivos_storage() r where r.ruta = v_base || 'existe.webp') then
      raise exception 'FALLO: una foto con su archivo salió como problema.';
    end if;
    if not exists (select 1 from public.revisar_archivos_storage() r
                   where r.tipo = 'sin_uso' and r.ruta = v_base || 'huerfano.webp') then
      raise exception 'FALLO: un archivo que nadie usa no salió como sin uso.';
    end if;
    if exists (select 1 from public.revisar_archivos_storage() r where r.ruta = v_base || 'reciente.webp') then
      raise exception 'FALLO: un archivo recién subido salió como sin uso.';
    end if;
    if exists (select 1 from public.revisar_archivos_storage() r where r.ruta like 'https://%') then
      raise exception 'FALLO: una dirección externa salió como rota.';
    end if;
    if not exists (select 1 from public.revisar_archivos_storage() r
                   where r.ruta = v_base || 'falta.webp'
                     and r.negocio = (select slug from public.negocios where id = v_negocio)) then
      raise exception 'FALLO: la rota no dice de qué negocio es.';
    end if;

    if has_function_privilege('anon', 'public.revisar_archivos_storage()', 'execute')
       or has_function_privilege('authenticated', 'public.revisar_archivos_storage()', 'execute') then
      raise exception 'FALLO: la revisión quedó al alcance de la API pública.';
    end if;
    if not has_function_privilege('service_role', 'public.revisar_archivos_storage()', 'execute') then
      raise exception 'FALLO: la clave de servicio no puede correrla.';
    end if;

    raise exception using errcode = 'P0001', message = 'ARCHIVOS_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'ARCHIVOS_EN_VERDE' then
        raise;
      end if;
      raise notice 'la revisión de archivos: todo en verde';
  end;
end
$prueba$;
