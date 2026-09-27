-- Un negocio sin local aparece en el directorio de su ciudad.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:sin-local:ensayo
--
-- Hay negocios que venden solo por internet, con envíos o entregas: no tienen
-- una puerta que marcar en el mapa. Aparecen con su ciudad, sin punto; en el
-- filtro por zona salen en todas las de su ciudad, porque entregan en toda
-- ella; y en «Cerca de mí» solo si el visitante está en su ciudad. Un único
-- bloque que deshace todo lo que escribe.

do $prueba$
declare
  v_negocio uuid;
  v_zona uuid;
  v_fila record;
begin
  begin
    select id into v_negocio from public.negocios order by id limit 1;
    if v_negocio is null then
      raise exception 'FALLO: la base de ensayo no tiene negocios.';
    end if;

    select id into v_zona from public.zonas where ciudad = 'oruro' limit 1;
    if v_zona is null then
      insert into public.zonas (ciudad, nombre, latitud, longitud)
      values ('oruro', 'Zona de prueba', -17.9647, -67.1064)
      returning id into v_zona;
    end if;

    -- Solo este negocio en el directorio.
    update public.negocios set aparece_en_directorio = false where aparece_en_directorio is true;
    update public.negocios
    set activo = true, aparece_en_directorio = false,
        ubicacion_lat = null, ubicacion_lng = null, zona_id = null
    where id = v_negocio;

    -- 1. Sin local: aparece con su ciudad y sin punto.
    update public.negocios
    set sin_local = true, ciudad = 'oruro', aparece_en_directorio = true
    where id = v_negocio;

    -- 2. Sin local no guarda un punto: no hay nada que ubicar.
    begin
      update public.negocios set ubicacion_lat = -17.96, ubicacion_lng = -67.10 where id = v_negocio;
      raise exception 'FALLO: un negocio sin local guardó un punto.';
    exception
      when check_violation then null;
    end;

    -- 3. Con local sigue exigiendo el punto para aparecer.
    begin
      update public.negocios set sin_local = false where id = v_negocio;
      raise exception 'FALLO: un negocio con local apareció sin punto.';
    exception
      when check_violation then null;
    end;

    -- 4. La búsqueda lo trae, dice que no tiene local y no inventa distancia.
    select * into v_fila from public.buscar_en_directorio(p_ciudad => 'oruro') where id = v_negocio;
    if v_fila.id is null then
      raise exception 'FALLO: el negocio sin local no salió en su ciudad.';
    end if;
    if v_fila.sin_local is not true or v_fila.distancia_km is not null then
      raise exception 'FALLO: sin local=%, distancia=%', v_fila.sin_local, v_fila.distancia_km;
    end if;

    -- 5. En el filtro por zona sale en las zonas de su ciudad.
    if not exists (select 1 from public.buscar_en_directorio(p_ciudad => 'oruro', p_zona_id => v_zona) where id = v_negocio) then
      raise exception 'FALLO: el negocio sin local no salió al filtrar por una zona de su ciudad.';
    end if;

    -- 6. «Cerca de mí»: desde Oruro sale; desde La Paz, a más de 100 km, no.
    if not exists (select 1 from public.buscar_en_directorio(p_lat => -17.97, p_lng => -67.11) where id = v_negocio) then
      raise exception 'FALLO: desde Oruro, «Cerca de mí» no trajo al negocio sin local de Oruro.';
    end if;
    if exists (select 1 from public.buscar_en_directorio(p_lat => -16.50, p_lng => -68.13) where id = v_negocio) then
      raise exception 'FALLO: desde La Paz, «Cerca de mí» trajo un negocio sin local de Oruro.';
    end if;

    raise exception using errcode = 'P0001', message = 'SIN_LOCAL_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'SIN_LOCAL_EN_VERDE' then
        raise;
      end if;
      raise notice 'un negocio sin local aparece en el directorio de su ciudad: todo en verde';
  end;
end
$prueba$;
