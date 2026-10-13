-- El vigilante mira también un catálogo testigo.
--
-- Corre SOLO contra la base de ensayo:
--   npm run test:vigilancia-catalogo:ensayo
--
-- Sale a la red de verdad: le pregunta al sitio de producción, que es lo único
-- que hay para preguntar. Dentro de la prueba el aviso queda apagado —ningún
-- teléfono suena— y todo se deshace al final, ajustes y mediciones.

do $prueba$
declare
  v_sitio constant text := 'https://mipuesto-dev.mipuesto-app.workers.dev';
  v_fila public.vigilancia_salud%rowtype;
begin
  begin
    -- 1. La decisión, sin red.
    if public.evaluar_catalogo_testigo(200, '<a href="/tienda/p/PRD-AB12CD34">') is not null then
      raise exception 'FALLO: un catálogo con productos no se dio por bueno.';
    end if;
    if public.evaluar_catalogo_testigo(200, '<html><body></body></html>') is distinct from 'catalogo_vacio' then
      raise exception 'FALLO: un catálogo sin productos no se dio por vacío.';
    end if;
    if public.evaluar_catalogo_testigo(404, '/p/PRD-AB12CD34') is distinct from 'catalogo_caido' then
      raise exception 'FALLO: un 404 no se dio por caído.';
    end if;
    if public.evaluar_catalogo_testigo(null, null) is distinct from 'catalogo_caido' then
      raise exception 'FALLO: sin respuesta no se dio por caído.';
    end if;

    -- 2. Nadie con la clave del navegador ni con sesión la llama.
    if has_function_privilege('anon', 'public.evaluar_catalogo_testigo(integer, text)', 'execute')
       or has_function_privilege('authenticated', 'public.evaluar_catalogo_testigo(integer, text)', 'execute') then
      raise exception 'FALLO: la decisión del vigilante quedó al alcance de la API.';
    end if;

    -- 3. De punta a punta, con el aviso apagado.
    insert into private.ajustes_vigilancia (id, url_salud, url_aviso, url_catalogo)
    values (true, v_sitio || '/api/salud', null, null)
    on conflict (id) do update
      set url_salud = excluded.url_salud, url_aviso = null, url_catalogo = null;
    delete from public.vigilancia_salud;

    -- Sin catálogo configurado, lo de siempre.
    perform public.vigilar_salud();
    select * into v_fila from public.vigilancia_salud order by id desc limit 1;
    if not v_fila.sano then
      raise exception 'FALLO: sin catálogo, el sitio sano se anotó como %', v_fila.estado;
    end if;

    -- Un catálogo con productos.
    update private.ajustes_vigilancia set url_catalogo = v_sitio || '/kantuta-moda' where id;
    perform public.vigilar_salud();
    select * into v_fila from public.vigilancia_salud order by id desc limit 1;
    if not v_fila.sano then
      raise exception 'FALLO: un catálogo con productos se anotó como %', v_fila.estado;
    end if;

    -- Una página que carga pero no tiene productos.
    update private.ajustes_vigilancia set url_catalogo = v_sitio || '/terminos' where id;
    perform public.vigilar_salud();
    select * into v_fila from public.vigilancia_salud order by id desc limit 1;
    if v_fila.sano or v_fila.estado <> 'catalogo_vacio' then
      raise exception 'FALLO: una página sin productos se anotó como % (sano: %)', v_fila.estado, v_fila.sano;
    end if;

    -- Un catálogo que no existe.
    update private.ajustes_vigilancia set url_catalogo = v_sitio || '/no-existe-este-catalogo-xyz' where id;
    perform public.vigilar_salud();
    select * into v_fila from public.vigilancia_salud order by id desc limit 1;
    if v_fila.sano or v_fila.estado <> 'catalogo_caido' then
      raise exception 'FALLO: un catálogo inexistente se anotó como % (sano: %)', v_fila.estado, v_fila.sano;
    end if;

    raise exception using errcode = 'P0001', message = 'VIGILANCIA_CATALOGO_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'VIGILANCIA_CATALOGO_EN_VERDE' then
        raise;
      end if;
      raise notice 'el vigilante mira el catálogo testigo: todo en verde';
  end;
end
$prueba$;
