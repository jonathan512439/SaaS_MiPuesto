-- El punto de un negocio queda en su ciudad.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:punto-ciudad:ensayo
--
-- El mapa podía quedarse en el centro de Bolivia si la ciudad se elegía antes
-- de que terminara de cargar, y el negocio se guardaba «en Oruro» a 418 km. La
-- ruta lo ataja, y la base también: se puede escribir sin pasar por la ruta.
-- Un único bloque que deshace todo lo que escribe.

do $prueba$
declare
  v_negocio uuid;
begin
  begin
    select id into v_negocio from public.negocios order by id limit 1;
    if v_negocio is null then
      raise exception 'FALLO: la base de ensayo no tiene negocios.';
    end if;

    -- 1. En Oruro, pero en el centro de Bolivia: no.
    begin
      update public.negocios
      set ciudad = 'oruro', ubicacion_lat = -16.290000, ubicacion_lng = -63.590000
      where id = v_negocio;
      raise exception 'FALLO: se guardó un negocio «en Oruro» a más de 400 km.';
    exception
      when check_violation then
        if sqlerrm <> 'PUNTO_LEJOS_DE_SU_CIUDAD' then raise; end if;
    end;

    -- 2. En Huanuni, a unos 45 km del centro de Oruro: sí.
    update public.negocios
    set ciudad = 'oruro', ubicacion_lat = -18.289300, ubicacion_lng = -66.838600
    where id = v_negocio;

    -- 3. «Otra ciudad» no tiene centro contra qué medir: sí.
    update public.negocios
    set ciudad = 'otra', ubicacion_lat = -16.290000, ubicacion_lng = -63.590000
    where id = v_negocio;

    -- 4. Cambiar solo la ciudad también se mira: de «otra» a «oruro» con el
    --    punto en el centro del país, no.
    begin
      update public.negocios set ciudad = 'oruro' where id = v_negocio;
      raise exception 'FALLO: al cambiar la ciudad quedó un punto a más de 400 km.';
    exception
      when check_violation then
        if sqlerrm <> 'PUNTO_LEJOS_DE_SU_CIUDAD' then raise; end if;
    end;

    raise exception using errcode = 'P0001', message = 'PUNTO_CIUDAD_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'PUNTO_CIUDAD_EN_VERDE' then
        raise;
      end if;
      raise notice 'el punto de un negocio queda en su ciudad: todo en verde';
  end;
end
$prueba$;
