-- El directorio no revela dónde queda un negocio.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:directorio-punto:ensayo
--
-- `buscar_en_directorio` está abierta a cualquiera con la clave pública, así
-- que el redondeo de la ubicación del visitante no puede vivir solo en la
-- página: quien llame a la función directo movería el punto de a metros y,
-- mirando dónde salta la distancia redondeada, ubicaría el local. La función
-- redondea el punto que recibe; desde dos lugares de la misma celda de ~1 km,
-- la respuesta tiene que ser la misma. Un único bloque que deshace todo.

do $prueba$
declare
  v_negocio uuid;
  v_cerca numeric;
  v_lejos numeric;
begin
  begin
    select id into v_negocio from public.negocios order by id limit 1;
    if v_negocio is null then
      raise exception 'FALLO: la base de ensayo no tiene negocios.';
    end if;

    -- Solo este negocio en el directorio, en Cobija, en un punto conocido.
    update public.negocios set aparece_en_directorio = false where aparece_en_directorio is true;
    update public.negocios
    set activo = true,
        ciudad = 'cobija',
        zona_id = null,
        ubicacion_lat = -11.030000,
        ubicacion_lng = -68.770000,
        aparece_en_directorio = true
    where id = v_negocio;

    -- Dos consultas desde la misma celda de 0,01° (≈ 1 km), a 450 m una de
    -- otra. Sin redondear el punto, una ve el negocio «a 0,5 km» y la otra «a
    -- 1,0 km»: el salto entre las dos es lo que permite triangular.
    select distancia_km into v_cerca
    from public.buscar_en_directorio(p_ciudad => 'cobija', p_lat => -11.0351, p_lng => -68.77)
    where id = v_negocio;
    select distancia_km into v_lejos
    from public.buscar_en_directorio(p_ciudad => 'cobija', p_lat => -11.0394, p_lng => -68.77)
    where id = v_negocio;

    if v_cerca is null or v_lejos is null then
      raise exception 'FALLO: el negocio de prueba no salió en el directorio.';
    end if;
    if v_cerca <> v_lejos then
      raise exception 'FALLO: desde la misma celda la distancia cambia (% km y % km): el punto del visitante no se redondea.', v_cerca, v_lejos;
    end if;

    -- Sin punto del visitante, no hay distancia.
    if (select distancia_km from public.buscar_en_directorio(p_ciudad => 'cobija') where id = v_negocio) is not null then
      raise exception 'FALLO: sin punto del visitante apareció una distancia.';
    end if;

    raise exception using errcode = 'P0001', message = 'DIRECTORIO_PUNTO_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'DIRECTORIO_PUNTO_EN_VERDE' then
        raise;
      end if;
      raise notice 'el directorio redondea el punto del visitante: todo en verde';
  end;
end
$prueba$;
