-- La plataforma exige el segundo factor también en la base, no solo en la
-- pantalla (`20261111090000_segundo_factor_en_toda_la_plataforma.sql`).
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:plataforma-2fa:ensayo
--
-- Un único bloque que deshace todo lo que escribe, también el administrador de
-- plataforma de prueba que da de alta.

do $prueba$
declare
  v_admin uuid;
  v_negocio uuid;
  v_vistas integer;
  v_resultado jsonb;
  v_config text;
begin
  begin
    select id into v_negocio from public.negocios limit 1;
    select id into v_admin from auth.users
    where id not in (select admin_user_id from public.negocios where admin_user_id is not null)
    limit 1;
    if v_negocio is null or v_admin is null then
      raise exception 'FALLO: la base de ensayo necesita un negocio y un usuario que no sea dueño.';
    end if;
    insert into public.plataforma_admins (user_id, nota) values (v_admin, 'prueba de segundo factor')
    on conflict (user_id) do nothing;
    insert into public.etiquetas (codigo, negocio_id, nota) values ('ZZZ997', v_negocio, 'prueba de segundo factor');

    -- 1. Con la contraseña sola (aal1): está en la lista, pero no autoriza nada.
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal1')::text, true);
    set local role authenticated;

    if not public.es_admin_plataforma() then
      raise exception 'FALLO: es_admin_plataforma() dejó de reconocer al administrador; la pantalla la necesita para pedir el código.';
    end if;
    if public.es_admin_plataforma_con_2fa() then
      raise exception 'FALLO: es_admin_plataforma_con_2fa() dio verdadero sin segundo factor.';
    end if;

    begin
      perform public.admin_cambiar_publicacion(v_negocio, false, 'Prueba de segundo factor');
      raise exception 'FALLO: se suspendió un negocio sin segundo factor.';
    exception
      when insufficient_privilege then null;
    end;

    select count(*) into v_vistas from public.etiquetas where codigo = 'ZZZ997';
    if v_vistas <> 0 then
      raise exception 'FALLO: la plataforma leyó una etiqueta sin segundo factor.';
    end if;
    begin
      insert into public.etiquetas (codigo, nota) values ('ZZZ996', 'sin segundo factor');
      raise exception 'FALLO: la plataforma creó una etiqueta sin segundo factor.';
    exception
      when insufficient_privilege then null;
    end;
    begin
      insert into public.zonas (ciudad, nombre, latitud, longitud) values ('oruro', 'Zona sin segundo factor', -17.97, -67.11);
      raise exception 'FALLO: la plataforma creó una zona sin segundo factor.';
    exception
      when insufficient_privilege then null;
    end;
    reset role;

    -- 2. Con segundo factor (aal2): todo vuelve a funcionar.
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated', 'aal', 'aal2')::text, true);
    set local role authenticated;
    select count(*) into v_vistas from public.etiquetas where codigo = 'ZZZ997';
    if v_vistas <> 1 then
      raise exception 'FALLO: la plataforma con segundo factor no leyó su etiqueta.';
    end if;
    select count(*) into v_vistas from public.negocios where id = v_negocio;
    if v_vistas <> 1 then
      raise exception 'FALLO: la plataforma con segundo factor no ve los negocios.';
    end if;
    perform public.admin_cambiar_publicacion(v_negocio, false, 'Prueba de segundo factor');
    reset role;

    -- 3. Un visitante no puede llamar a la versión de pedidos con número de mesa.
    if has_function_privilege('anon', 'public.crear_pedido_reservado(text,jsonb,text,text,uuid,text,text)', 'execute') then
      raise exception 'FALLO: la clave pública puede llamar a crear_pedido_reservado con número de mesa.';
    end if;

    -- 4. contar_intento_publico ya no busca en public.
    select array_to_string(proconfig, ',') into v_config
    from pg_proc where oid = 'public.contar_intento_publico(uuid,text)'::regprocedure;
    if v_config is distinct from 'search_path=""' then
      raise exception 'FALLO: contar_intento_publico tiene search_path %; tiene que estar vacío.', v_config;
    end if;

    -- 5. La base no guarda un enlace que no sea https, aunque no pase por la ruta.
    begin
      update public.negocios set resenas_url = 'javascript:alert(1)' where id = v_negocio;
      raise exception 'FALLO: se guardó un enlace de reseñas que no es https.';
    exception
      when check_violation then null;
    end;
    begin
      update public.negocios set ubicacion_url = 'http://maps.google.com/?q=1,1' where id = v_negocio;
      raise exception 'FALLO: se guardó un enlace de ubicación que no es https.';
    exception
      when check_violation then null;
    end;

    raise exception using errcode = 'P0001', message = 'PLATAFORMA_2FA_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'PLATAFORMA_2FA_EN_VERDE' then
        raise;
      end if;
      raise notice 'la plataforma exige el segundo factor en la base, y los enlaces del negocio son https: todo en verde';
  end;
end
$prueba$;
