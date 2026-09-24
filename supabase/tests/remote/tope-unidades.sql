-- Tope de unidades por pedido: pruebas de base.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:tope-unidades:ensayo
--
-- Un único bloque que deshace todo lo que escribe: termina lanzando una
-- excepción propia, que revierte la transacción, y la atrapa para decir que
-- todo pasó.

do $prueba$
declare
  v_negocio uuid;
  v_slug text;
  v_uno uuid;
  v_dos uuid;
  v_pedido jsonb;
  v_idempotencia uuid := gen_random_uuid();

begin
  begin
    -- -----------------------------------------------------------------------
    -- Banco: una tienda con carrito y dos productos sin presentaciones. Se les
    -- apaga el control de existencias dentro de la prueba, para que lo único
    -- que pueda rechazar un pedido sea el tope.
    -- -----------------------------------------------------------------------
    select negocio.id, negocio.slug
    into v_negocio, v_slug
    from public.negocios as negocio
    where negocio.activo = true
      and negocio.tipo_negocio = 'tienda_virtual'
      and (
        select count(*)
        from public.productos as producto
        where producto.negocio_id = negocio.id
          and producto.eliminado_en is null
          and producto.visible = true
          and not exists (
            select 1 from public.variantes_producto as variante
            where variante.producto_id = producto.id
          )
      ) >= 2
    limit 1;

    if v_negocio is null then
      raise exception 'FALLO: la base de ensayo no tiene una tienda con dos productos sin presentaciones.';
    end if;

    select producto.id into v_uno
    from public.productos as producto
    where producto.negocio_id = v_negocio and producto.eliminado_en is null and producto.visible = true
      and not exists (select 1 from public.variantes_producto as variante where variante.producto_id = producto.id)
    order by producto.id
    limit 1;

    select producto.id into v_dos
    from public.productos as producto
    where producto.negocio_id = v_negocio and producto.eliminado_en is null and producto.visible = true
      and producto.id <> v_uno
      and not exists (select 1 from public.variantes_producto as variante where variante.producto_id = producto.id)
    order by producto.id
    limit 1;

    update public.productos set controla_stock = false, cantidad_stock = null
    where id in (v_uno, v_dos);

    -- -----------------------------------------------------------------------
    -- 1. Sin tope propio, como todo negocio que ya existía: pasa lo de siempre.
    -- -----------------------------------------------------------------------
    update public.negocios set tope_unidades_pedido = null where id = v_negocio;
    v_pedido := public.crear_pedido_reservado(
      v_slug,
      jsonb_build_array(
        jsonb_build_object('producto_id', v_uno, 'cantidad', 40),
        jsonb_build_object('producto_id', v_dos, 'cantidad', 40)
      ),
      null, null, gen_random_uuid(),
      encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
    );
    if v_pedido->>'codigo' is null then
      raise exception 'FALLO: sin tope propio, un pedido de 80 unidades no se creó.';
    end if;

    -- -----------------------------------------------------------------------
    -- 2. Con tope de 5: cuenta unidades, no renglones. 3 + 2 entra justo.
    -- -----------------------------------------------------------------------
    update public.negocios set tope_unidades_pedido = 5 where id = v_negocio;
    v_pedido := public.crear_pedido_reservado(
      v_slug,
      jsonb_build_array(
        jsonb_build_object('producto_id', v_uno, 'cantidad', 3),
        jsonb_build_object('producto_id', v_dos, 'cantidad', 2)
      ),
      null, null, v_idempotencia,
      encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
    );
    if v_pedido->>'codigo' is null then
      raise exception 'FALLO: un pedido justo en el tope (5 de 5) no se creó.';
    end if;

    -- 3 + 3 son seis: se rechaza, aunque cada renglón solo esté debajo.
    begin
      perform public.crear_pedido_reservado(
        v_slug,
        jsonb_build_array(
          jsonb_build_object('producto_id', v_uno, 'cantidad', 3),
          jsonb_build_object('producto_id', v_dos, 'cantidad', 3)
        ),
        null, null, gen_random_uuid(),
        encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
      );
      raise exception 'FALLO: se aceptó un pedido de 6 unidades con tope de 5.';
    exception
      when raise_exception then
        if sqlerrm <> 'TOPE_UNIDADES' then raise; end if;
    end;

    -- -----------------------------------------------------------------------
    -- 3. Bajar el tope no rompe un reintento: el pedido que ya se creó vuelve
    --    tal cual. Si no, el carrito que reintenta por un corte de red le
    --    mostraría un error al cliente cuyo pedido sí existe.
    -- -----------------------------------------------------------------------
    update public.negocios set tope_unidades_pedido = 1 where id = v_negocio;
    v_pedido := public.crear_pedido_reservado(
      v_slug,
      jsonb_build_array(
        jsonb_build_object('producto_id', v_uno, 'cantidad', 3),
        jsonb_build_object('producto_id', v_dos, 'cantidad', 2)
      ),
      null, null, v_idempotencia,
      encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
    );
    if coalesce((v_pedido->>'repetido')::boolean, false) is not true then
      raise exception 'FALLO: el reintento de un pedido ya creado no volvió como repetido tras bajar el tope.';
    end if;

    -- -----------------------------------------------------------------------
    -- 4. La columna se defiende sola: fuera de 1..2970 no entra ni con la
    --    clave privilegiada.
    -- -----------------------------------------------------------------------
    begin
      update public.negocios set tope_unidades_pedido = 0 where id = v_negocio;
      raise exception 'FALLO: la base aceptó un tope de 0 unidades.';
    exception
      when check_violation then null;
    end;
    begin
      update public.negocios set tope_unidades_pedido = 2971 where id = v_negocio;
      raise exception 'FALLO: la base aceptó un tope de 2971 unidades.';
    exception
      when check_violation then null;
    end;

    -- -----------------------------------------------------------------------
    -- 5. Permisos por columna: el catálogo la lee, el dueño la escribe, el
    --    visitante no.
    -- -----------------------------------------------------------------------
    if not has_column_privilege('anon', 'public.negocios', 'tope_unidades_pedido', 'SELECT') then
      raise exception 'FALLO: el catálogo público no puede leer el tope.';
    end if;
    if not has_column_privilege('authenticated', 'public.negocios', 'tope_unidades_pedido', 'UPDATE') then
      raise exception 'FALLO: el dueño no puede guardar el tope.';
    end if;
    if has_column_privilege('anon', 'public.negocios', 'tope_unidades_pedido', 'UPDATE') then
      raise exception 'FALLO: un visitante podría cambiar el tope.';
    end if;

    raise exception using errcode = 'P0001', message = 'TOPE_UNIDADES_TODO_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'TOPE_UNIDADES_TODO_EN_VERDE' then
        raise;
      end if;
      raise notice 'tope de unidades: todas las pruebas pasaron';
  end;
end
$prueba$;
