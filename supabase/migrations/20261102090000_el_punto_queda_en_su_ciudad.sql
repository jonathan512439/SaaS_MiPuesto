-- El punto de un negocio queda en su ciudad.
--
-- El mapa del directorio podía quedarse en el centro de Bolivia si la ciudad
-- se elegía antes de que terminara de cargar, y el negocio se guardaba «en
-- Oruro» a 418 km: el dueño tocaba el mapa que veía. La ruta ahora lo ataja con
-- un mensaje, y la base también, porque se puede escribir sin pasar por ella
-- (AGENTS.md: los topes van en la base).
--
-- El radio es de 100 km, holgado a propósito: un negocio de Caracollo o de
-- Huanuni elige «Oruro» y está a 40 o 50 km. «Otra ciudad» no tiene centro y no
-- se limita. Los centros son los de `CENTRO_DE_CIUDAD` en
-- `lib/negocios/coordenadas.ts`; una prueba compara las dos listas. Solo mira
-- lo que cambia: un negocio ya guardado no se toca hasta que se edite su
-- ubicación o su ciudad. Probada en ensayo con
-- `supabase/tests/remote/punto-en-su-ciudad.sql`.

create or replace function private.centro_de_ciudad(p_ciudad text)
returns table (lat double precision, lng double precision)
language sql
immutable
security definer
set search_path = ''
as $$
  select c.lat, c.lng
  from (values
      ('la_paz', -16.4955, -68.1336),
      ('el_alto', -16.5048, -68.1631),
      ('santa_cruz', -17.7833, -63.1821),
      ('cochabamba', -17.3895, -66.1568),
      ('sucre', -19.0476, -65.26),
      ('oruro', -17.9647, -67.1064),
      ('potosi', -19.5836, -65.7531),
      ('tarija', -21.5355, -64.7296),
      ('trinidad', -14.8333, -64.9),
      ('cobija', -11.0267, -68.7692)
  ) as c(ciudad, lat, lng)
  where c.ciudad = p_ciudad
$$;

revoke all on function private.centro_de_ciudad(text) from public, anon, authenticated;

create or replace function public.validar_punto_en_su_ciudad()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lat double precision;
  v_lng double precision;
  v_distancia double precision;
begin
  if new.ciudad is null or new.ubicacion_lat is null or new.ubicacion_lng is null then
    return new;
  end if;

  select centro.lat, centro.lng into v_lat, v_lng from private.centro_de_ciudad(new.ciudad) as centro;
  if v_lat is null then
    return new;
  end if;

  v_distancia := 2 * 6371 * asin(sqrt(
    power(sin(radians((new.ubicacion_lat - v_lat) / 2)), 2)
    + cos(radians(v_lat)) * cos(radians(new.ubicacion_lat))
      * power(sin(radians((new.ubicacion_lng - v_lng) / 2)), 2)
  ));

  if v_distancia > 100 then
    raise exception using
      errcode = 'check_violation',
      message = 'PUNTO_LEJOS_DE_SU_CIUDAD',
      detail = format('El local quedó a %s km del centro de su ciudad.', round(v_distancia::numeric));
  end if;

  return new;
end;
$$;

revoke all on function public.validar_punto_en_su_ciudad() from public, anon, authenticated;

create trigger negocios_punto_en_su_ciudad
  before insert or update of ciudad, ubicacion_lat, ubicacion_lng on public.negocios
  for each row
  execute function public.validar_punto_en_su_ciudad();
