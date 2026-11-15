-- El dueño no elige su plan: da de alta su negocio con las columnas del alta y
-- nada más, y no puede borrarlo (`20261119090000_el_dueno_no_elige_su_plan.sql`).
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:alta-columnas:ensayo
--
-- Un único bloque que deshace todo lo que escribe: termina lanzando una
-- excepción propia, que revierte la transacción, y la atrapa para decir que
-- todo pasó.

do $prueba$
declare
  v_usuario uuid;
  v_negocio public.negocios%rowtype;
  v_columna text;
  v_borrados integer;
begin
  begin
    -- Alguien con cuenta y sin negocio: es quien llega al alta.
    select id into v_usuario from auth.users
    where id not in (select admin_user_id from public.negocios where admin_user_id is not null)
    limit 1;
    if v_usuario is null then
      raise exception 'FALLO: la base de ensayo necesita un usuario que todavía no tenga negocio.';
    end if;

    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', v_usuario, 'role', 'authenticated', 'aal', 'aal1')::text,
      true
    );
    set local role authenticated;

    -- -----------------------------------------------------------------------
    -- 1. Ninguna columna que decide la plataforma se puede poner al dar de alta.
    --    Cada una por separado: si alguna entrara, el mensaje dice cuál.
    -- -----------------------------------------------------------------------
    foreach v_columna in array array[
      'plan_id', 'suscripcion_vence_en', 'activo', 'verificado',
      'suspendido_en', 'foto_ia_habilitada', 'creado_en'
    ] loop
      begin
        execute format(
          'insert into public.negocios (admin_user_id, nombre, slug, tipo_negocio, telefono_whatsapp, %I)
           values ($1, ''Alta con trampa'', ''alta-con-trampa'', ''tienda_virtual'', ''59170000001'', %s)',
          v_columna,
          case v_columna
            when 'plan_id' then '''activo'''
            when 'suscripcion_vence_en' then '''2099-01-01''::timestamptz'
            when 'suspendido_en' then 'null'
            when 'creado_en' then '''2020-01-01''::timestamptz'
            else 'true'
          end
        ) using v_usuario;
        raise exception 'FALLO: el dueño pudo elegir «%» al dar de alta su negocio.', v_columna;
      exception
        when insufficient_privilege then null;
      end;
    end loop;

    -- -----------------------------------------------------------------------
    -- 2. El alta de siempre sigue andando, con las nueve columnas que manda la
    --    ruta, y el negocio nace como decide la base: en prueba, a quince días,
    --    sin verificar.
    -- -----------------------------------------------------------------------
    insert into public.negocios (
      admin_user_id, nombre, slug, descripcion, subnombre, tipo_negocio,
      telefono_whatsapp, rubro, pide_numero_mesa
    ) values (
      v_usuario, 'Alta de prueba', 'alta-de-prueba-auditoria', 'Una descripción', 'Un renglón',
      'tienda_virtual', '59170000001', null, false
    );

    -- Se lee como la base y no como el dueño: él no tiene por qué poder leer
    -- todas las columnas de su fila, y acá interesa cómo quedó guardada.
    reset role;
    select * into v_negocio from public.negocios where admin_user_id = v_usuario;
    if v_negocio.id is null then
      raise exception 'FALLO: el alta con las nueve columnas no guardó el negocio.';
    end if;
    set local role authenticated;

    if v_negocio.plan_id <> 'prueba' then
      raise exception 'FALLO: el negocio nació en el plan «%» y no en la prueba.', v_negocio.plan_id;
    end if;
    if v_negocio.suscripcion_vence_en > now() + interval '15 days 1 minute'
       or v_negocio.suscripcion_vence_en < now() + interval '14 days 23 hours' then
      raise exception 'FALLO: el negocio nació con vencimiento %, y la prueba dura quince días.', v_negocio.suscripcion_vence_en;
    end if;
    if v_negocio.verificado then
      raise exception 'FALLO: el negocio nació verificado.';
    end if;

    -- -----------------------------------------------------------------------
    -- 3. No puede poner el negocio a nombre de otro, ni tener dos.
    -- -----------------------------------------------------------------------
    begin
      insert into public.negocios (admin_user_id, nombre, slug, tipo_negocio, telefono_whatsapp)
      values (gen_random_uuid(), 'De otro', 'alta-de-otro', 'tienda_virtual', '59170000001');
      raise exception 'FALLO: se creó un negocio a nombre de otro usuario.';
    exception
      when insufficient_privilege then null;
      when foreign_key_violation then null;
    end;
    begin
      insert into public.negocios (admin_user_id, nombre, slug, tipo_negocio, telefono_whatsapp)
      values (v_usuario, 'El segundo', 'alta-el-segundo', 'tienda_virtual', '59170000001');
      raise exception 'FALLO: un dueño creó un segundo negocio.';
    exception
      when unique_violation then null;
    end;

    -- -----------------------------------------------------------------------
    -- 4. No puede borrarlo: sin borrado no hay segunda prueba de quince días.
    -- -----------------------------------------------------------------------
    begin
      delete from public.negocios where id = v_negocio.id;
      get diagnostics v_borrados = row_count;
      raise exception 'FALLO: el dueño borró su negocio (% fila).', v_borrados;
    exception
      when insufficient_privilege then null;
    end;

    -- -----------------------------------------------------------------------
    -- 5. Lo que ya tenía prohibido sigue prohibido, y lo suyo lo sigue editando.
    -- -----------------------------------------------------------------------
    begin
      update public.negocios set plan_id = 'activo' where id = v_negocio.id;
      raise exception 'FALLO: el dueño se cambió el plan con un update.';
    exception
      when insufficient_privilege then null;
    end;
    update public.negocios set nombre = 'Alta de prueba, editada' where id = v_negocio.id;

    reset role;

    -- -----------------------------------------------------------------------
    -- 6. El permiso, mirado en el catálogo de la base: insertar, las nueve
    --    columnas del alta y ninguna más; borrar, no.
    -- -----------------------------------------------------------------------
    if (
      select array_agg(column_name::text order by column_name::text)
      from information_schema.column_privileges
      where table_schema = 'public' and table_name = 'negocios'
        and grantee = 'authenticated' and privilege_type = 'INSERT'
    ) is distinct from (
      select array_agg(columna order by columna)
      from unnest(array[
        'admin_user_id', 'nombre', 'slug', 'descripcion', 'subnombre',
        'tipo_negocio', 'telefono_whatsapp', 'rubro', 'pide_numero_mesa'
      ]) as columna
    ) then
      raise exception 'FALLO: las columnas que el dueño puede insertar no son las nueve del alta.';
    end if;
    if has_table_privilege('authenticated', 'public.negocios', 'delete') then
      raise exception 'FALLO: authenticated conserva el permiso de borrar negocios.';
    end if;
    if has_table_privilege('anon', 'public.negocios', 'insert')
       or has_table_privilege('anon', 'public.negocios', 'delete') then
      raise exception 'FALLO: la clave pública puede escribir en negocios.';
    end if;
    -- La plataforma y el servidor siguen pudiendo las dos cosas.
    if not has_table_privilege('service_role', 'public.negocios', 'insert')
       or not has_table_privilege('service_role', 'public.negocios', 'delete') then
      raise exception 'FALLO: la clave de servicio perdió permisos sobre negocios.';
    end if;

    raise exception using errcode = 'P0001', message = 'ALTA_POR_COLUMNAS_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'ALTA_POR_COLUMNAS_EN_VERDE' then
        raise;
      end if;
      raise notice 'el dueño da de alta su negocio con las columnas del alta y no puede borrarlo: todo en verde';
  end;
end
$prueba$;
