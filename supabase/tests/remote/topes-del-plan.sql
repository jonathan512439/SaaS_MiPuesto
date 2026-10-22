-- Topes de productos y fotos por plan: pruebas de base.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:topes-plan:ensayo
--
-- Un único bloque que deshace todo lo que escribe: termina lanzando una
-- excepción propia, que revierte la transacción, y la atrapa para decir que
-- todo pasó.

do $prueba$
declare
  v_negocio uuid;
  v_vivos integer;
  v_producto uuid;
  v_papelera uuid;
  v_i integer;
begin
  begin
    select id into v_negocio
    from public.negocios
    where activo = true
    order by creado_en
    limit 1;
    if v_negocio is null then
      raise exception 'FALLO: la base de ensayo no tiene negocios activos.';
    end if;

    -- -----------------------------------------------------------------------
    -- 1. Plan Catálogo: se llena hasta 150 y el siguiente se rechaza.
    -- -----------------------------------------------------------------------
    update public.negocios set plan_id = 'catalogo' where id = v_negocio;
    select count(*) into v_vivos
    from public.productos where negocio_id = v_negocio and eliminado_en is null;
    if v_vivos > 150 then
      raise exception 'FALLO: el negocio de ensayo ya tiene % productos; la prueba necesita menos de 150.', v_vivos;
    end if;

    for v_i in 1 .. (150 - v_vivos) loop
      insert into public.productos (negocio_id, nombre, precio, visible)
      values (v_negocio, 'Tope de plan ' || v_i, 1, true);
    end loop;

    begin
      insert into public.productos (negocio_id, nombre, precio, visible)
      values (v_negocio, 'El 151', 1, true);
      raise exception 'FALLO: el plan Catálogo aceptó el producto 151.';
    exception
      when raise_exception then
        if sqlerrm <> 'LIMITE_PRODUCTOS' then raise; end if;
    end;

    -- -----------------------------------------------------------------------
    -- 2. La papelera no cuenta, y recuperar sí: se manda uno a la papelera,
    --    entra otro en su lugar, y el de la papelera ya no puede volver.
    -- -----------------------------------------------------------------------
    select id into v_papelera
    from public.productos
    where negocio_id = v_negocio and nombre = 'Tope de plan 1';
    if v_papelera is null then
      -- El negocio ya tenía 150: se usa cualquiera de los suyos.
      select id into v_papelera
      from public.productos
      where negocio_id = v_negocio and eliminado_en is null
      limit 1;
    end if;

    update public.productos set eliminado_en = now() where id = v_papelera;
    insert into public.productos (negocio_id, nombre, precio, visible)
    values (v_negocio, 'En el lugar del de la papelera', 1, true);

    begin
      update public.productos set eliminado_en = null where id = v_papelera;
      raise exception 'FALLO: recuperar de la papelera pasó el tope de 150.';
    exception
      when raise_exception then
        if sqlerrm <> 'LIMITE_PRODUCTOS' then raise; end if;
    end;

    -- -----------------------------------------------------------------------
    -- 3. Plan Activo: el mismo negocio sube a 300 y vuelve a poder crear.
    -- -----------------------------------------------------------------------
    update public.negocios set plan_id = 'activo' where id = v_negocio;
    insert into public.productos (negocio_id, nombre, precio, visible)
    values (v_negocio, 'Con el plan Activo', 1, true)
    returning id into v_producto;

    -- -----------------------------------------------------------------------
    -- 4. Bajar de plan no borra nada: con 152 vivos y plan Catálogo, editar
    --    uno sigue andando; crear otro, no.
    -- -----------------------------------------------------------------------
    update public.negocios set plan_id = 'catalogo' where id = v_negocio;
    update public.productos set nombre = 'Editado después de bajar de plan' where id = v_producto;

    begin
      insert into public.productos (negocio_id, nombre, precio, visible)
      values (v_negocio, 'Otro más, ya con el Catálogo', 1, true);
      raise exception 'FALLO: con el plan Catálogo y 152 productos se pudo crear otro.';
    exception
      when raise_exception then
        if sqlerrm <> 'LIMITE_PRODUCTOS' then raise; end if;
    end;

    -- -----------------------------------------------------------------------
    -- 5. Fotos: 3 en el Catálogo, 4 en el Activo. Quien quedó con 4 por bajar
    --    de plan las conserva y puede quitar, pero no sumar.
    -- -----------------------------------------------------------------------
    update public.productos
    set fotos = array['a/1.webp', 'a/2.webp', 'a/3.webp']
    where id = v_producto;

    begin
      update public.productos
      set fotos = array['a/1.webp', 'a/2.webp', 'a/3.webp', 'a/4.webp']
      where id = v_producto;
      raise exception 'FALLO: el plan Catálogo aceptó una cuarta foto.';
    exception
      when raise_exception then
        if sqlerrm <> 'LIMITE_FOTOS' then raise; end if;
    end;

    update public.negocios set plan_id = 'activo' where id = v_negocio;
    update public.productos
    set fotos = array['a/1.webp', 'a/2.webp', 'a/3.webp', 'a/4.webp']
    where id = v_producto;

    update public.negocios set plan_id = 'catalogo' where id = v_negocio;
    -- Conserva las cuatro al editar otra cosa...
    update public.productos set precio = 2 where id = v_producto;
    -- ...y puede quitar una.
    update public.productos
    set fotos = array['a/1.webp', 'a/2.webp', 'a/3.webp']
    where id = v_producto;

    -- -----------------------------------------------------------------------
    -- 6. El techo físico: ni el plan Activo pasa de 4.
    -- -----------------------------------------------------------------------
    update public.negocios set plan_id = 'activo' where id = v_negocio;
    begin
      update public.productos
      set fotos = array['a/1.webp', 'a/2.webp', 'a/3.webp', 'a/4.webp', 'a/5.webp']
      where id = v_producto;
      raise exception 'FALLO: se aceptó una quinta foto.';
    exception
      when raise_exception then
        if sqlerrm <> 'LIMITE_FOTOS' then raise; end if;
      when check_violation then null;
    end;

    -- -----------------------------------------------------------------------
    -- 7. La prueba gratis (2026-10-22): 15 productos. Con más de 15 vivos no
    --    entra otro, y editar los que ya están sigue andando. Y es el plan, con
    --    su vencimiento a 15 días, con que nace un negocio.
    -- -----------------------------------------------------------------------
    update public.negocios set plan_id = 'prueba' where id = v_negocio;
    update public.productos set precio = 3 where id = v_producto;

    begin
      insert into public.productos (negocio_id, nombre, precio, visible)
      values (v_negocio, 'Uno más en la prueba', 1, true);
      raise exception 'FALLO: la prueba aceptó un producto por encima de 15.';
    exception
      when raise_exception then
        if sqlerrm <> 'LIMITE_PRODUCTOS' then raise; end if;
    end;

    if (select productos from private.topes_del_plan('prueba')) <> 15 then
      raise exception 'FALLO: la prueba no tiene un tope de 15 productos.';
    end if;

    if (
      select column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'negocios' and column_name = 'plan_id'
    ) not like '%prueba%' then
      raise exception 'FALLO: un negocio nuevo no nace en la prueba.';
    end if;

    if (
      select column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'negocios' and column_name = 'suscripcion_vence_en'
    ) not like '%15 days%' then
      raise exception 'FALLO: la prueba no vence a los 15 días.';
    end if;

    raise exception using errcode = 'P0001', message = 'TOPES_PLAN_TODO_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'TOPES_PLAN_TODO_EN_VERDE' then
        raise;
      end if;
      raise notice 'topes del plan: todas las pruebas pasaron';
  end;
end
$prueba$;
