-- Dos banners por negocio, superior e inferior
-- (`20261112090000_vuelve_el_banner_superior.sql`).
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:dos-banners:ensayo
--
-- Un único bloque que deshace todo lo que escribe.

do $prueba$
declare
  v_negocio uuid;
  v_banner jsonb := jsonb_build_object('imagen', 'x/banner/a.webp', 'alt', 'Prueba');
begin
  begin
    select id into v_negocio from public.negocios limit 1;
    if v_negocio is null then
      raise exception 'FALLO: la base de ensayo necesita un negocio.';
    end if;

    -- El inferior en el lugar 0 y el superior en el 1: entran los dos.
    update public.negocios set banners = jsonb_build_array(v_banner, v_banner) where id = v_negocio;

    -- Solo el superior, con el inferior vacío: también.
    update public.negocios set banners = jsonb_build_array(null, v_banner) where id = v_negocio;

    -- Un tercero, no.
    begin
      update public.negocios set banners = jsonb_build_array(v_banner, v_banner, v_banner) where id = v_negocio;
      raise exception 'FALLO: la base aceptó un tercer banner.';
    exception
      when check_violation then null;
    end;

    raise exception using errcode = 'P0001', message = 'DOS_BANNERS_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'DOS_BANNERS_EN_VERDE' then
        raise;
      end if;
      raise notice 'dos banners entran y un tercero no: todo en verde';
  end;
end
$prueba$;
