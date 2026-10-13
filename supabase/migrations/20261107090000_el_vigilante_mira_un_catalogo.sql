-- El vigilante mira también un catálogo, no solo si la base contesta.
--
-- `/api/salud` dice «ok» cuando la base responde y las tareas programadas
-- corren. Eso no ve lo que ve un cliente: un catálogo que carga en blanco, o
-- que carga sin productos, también responde 200. Lo pidió la auditoría del
-- 2026-09-30: vigilar contenido, no solo que la página conteste.
--
-- Si `url_catalogo` está puesta y la salud dio bien, el vigilante abre ese
-- catálogo —uno de demostración, que siempre tiene productos— y exige 200 y al
-- menos un enlace a la ficha de un producto (`/p/PRD-`, el código que pone la
-- base). Si falla, la medición queda como no sana con un estado propio, y el
-- aviso sale con la misma regla de siempre: a la segunda falla seguida, y la
-- vuelta solo si se avisó la caída.
--
-- Sin `url_catalogo`, el vigilante hace exactamente lo de antes. Se configura
-- con `npm run vigilancia:configurar -- --catalogo URL`.

alter table private.ajustes_vigilancia add column if not exists url_catalogo text;

-- La decisión, aparte de la red para poder probarla: `null` si el catálogo se
-- ve bien, o el motivo si no.
create or replace function public.evaluar_catalogo_testigo(p_http integer, p_contenido text)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select case
    when p_http is distinct from 200 then 'catalogo_caido'
    when coalesce(p_contenido, '') not like '%/p/PRD-%' then 'catalogo_vacio'
    else null
  end;
$$;

revoke all on function public.evaluar_catalogo_testigo(integer, text) from public, anon, authenticated;

create or replace function public.vigilar_salud()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ajustes private.ajustes_vigilancia%rowtype;
  v_inicio timestamptz := clock_timestamp();
  v_respuesta extensions.http_response;
  v_sano boolean := false;
  v_estado text;
  v_http integer := null;
  v_latencia integer;
  v_aviso text;
  v_problema text;
begin
  select * into v_ajustes from private.ajustes_vigilancia where id;
  if not found then
    return 'sin_configurar';
  end if;

  -- Ocho segundos por pregunta. La ruta contesta en menos de uno cuando está
  -- sana; más que esto ya es una caída para quien está mirando la pantalla.
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '8000');

  begin
    v_respuesta := extensions.http_get(v_ajustes.url_salud);
    v_http := v_respuesta.status;
    -- Sano es doscientos **y** que el cuerpo lo diga. Un intermediario puede
    -- devolver doscientos con una página de error.
    v_sano := v_respuesta.status = 200 and v_respuesta.content like '%"estado":"ok"%';
    v_estado := coalesce(
      substring(v_respuesta.content from '"estado":"([a-z_]+)"'),
      'respuesta_ilegible'
    );
  exception when others then
    v_sano := false;
    v_estado := 'sin_respuesta';
  end;

  -- El catálogo, solo si la salud dio bien: si la base no contesta, el aviso
  -- tiene que decir eso, no que el catálogo está vacío.
  if v_sano and v_ajustes.url_catalogo is not null then
    begin
      v_respuesta := extensions.http_get(v_ajustes.url_catalogo);
      v_problema := public.evaluar_catalogo_testigo(v_respuesta.status, v_respuesta.content);
      if v_problema is not null then
        v_http := v_respuesta.status;
      end if;
    exception when others then
      v_problema := 'catalogo_sin_respuesta';
      v_http := null;
    end;
    if v_problema is not null then
      v_sano := false;
      v_estado := v_problema;
    end if;
  end if;

  v_latencia := (extract(epoch from clock_timestamp() - v_inicio) * 1000)::integer;
  v_aviso := public.registrar_medicion_salud(v_sano, v_estado, v_http, v_latencia);

  if v_aviso is not null and v_ajustes.url_aviso is not null then
    begin
      perform extensions.http_post(
        v_ajustes.url_aviso,
        case
          when v_aviso = 'recuperado' then 'MiPuesto volvió a responder.'
          when v_estado like 'catalogo%' then
            'MiPuesto responde, pero el catálogo testigo no muestra productos: ' || v_estado
          else 'MiPuesto no responde: ' || v_estado
        end,
        'text/plain'
      );
    exception when others then
      -- Si el aviso no sale, la medición ya quedó anotada.
      null;
    end;
  end if;

  return coalesce(v_aviso, v_estado);
end;
$$;

revoke all on function public.vigilar_salud() from public, anon, authenticated;
