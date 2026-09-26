-- Las tallas encienden y apagan el control de existencias.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:tallas-cuenta:ensayo
--
-- `guardar_presentaciones` recibe `p_controla_stock`: el editor de tallas activa
-- «llevar la cuenta» en el mismo guardado, sin pasar antes por el formulario del
-- producto con una cantidad que después se descarta. Un único bloque que deshace
-- todo lo que escribe; las comprobaciones diferidas se disparan a mano.

do $prueba$
declare
  v_negocio uuid;
  v_duenio uuid;
  v_producto uuid;
  v_s uuid;
  v_m uuid;
  v_controla boolean;
  v_stock integer;
  v_estado text;
begin
  begin
    select negocio.id, negocio.admin_user_id into v_negocio, v_duenio
    from public.negocios as negocio
    where exists (
      select 1
      from public.productos as producto
      join public.categorias as categoria on categoria.id = producto.categoria_id
      where producto.negocio_id = negocio.id and categoria.vende = 'cosas' and producto.eliminado_en is null
    )
    limit 1;
    if v_negocio is null then
      raise exception 'FALLO: la base de ensayo no tiene un negocio con productos que vendan cosas.';
    end if;

    select producto.id into v_producto
    from public.productos as producto
    join public.categorias as categoria on categoria.id = producto.categoria_id
    where producto.negocio_id = v_negocio and categoria.vende = 'cosas' and producto.eliminado_en is null
    order by producto.id
    limit 1;

    -- Punto de partida: sin tallas, sin control de existencias y sin nada apartado.
    update public.pedido_items set reserva_activa = false where reserva_activa = true;
    update public.pedidos set estado = 'expirado' where estado = 'pendiente';
    update public.variantes_producto set cantidad_reservada = 0 where cantidad_reservada > 0;
    update public.productos set cantidad_reservada = 0 where cantidad_reservada > 0;
    delete from public.variantes_producto where producto_id = v_producto;
    update public.productos
    set controla_stock = false, cantidad_stock = null, estado = 'disponible'
    where id = v_producto;
    set constraints all immediate;
    set constraints all deferred;

    perform set_config('request.jwt.claims', json_build_object('sub', v_duenio, 'role', 'authenticated')::text, true);

    -- -----------------------------------------------------------------------
    -- 1. Encender desde las tallas: el producto pasa a controlar existencias
    --    y cada talla lleva las suyas, en un solo guardado.
    -- -----------------------------------------------------------------------
    perform public.guardar_presentaciones(
      v_producto, 'talla',
      jsonb_build_array(
        jsonb_build_object('nombre', 'S', 'cantidad_stock', 3),
        jsonb_build_object('nombre', 'M', 'cantidad_stock', 0)
      ),
      null,
      true
    );
    set constraints all immediate;
    set constraints all deferred;

    select controla_stock, cantidad_stock, estado into v_controla, v_stock, v_estado
    from public.productos where id = v_producto;
    if v_controla is not true or v_stock is not null or v_estado <> 'disponible' then
      raise exception 'FALLO: encender desde las tallas dejó controla=%, stock=%, estado=%', v_controla, v_stock, v_estado;
    end if;
    select id into v_s from public.variantes_producto where producto_id = v_producto and nombre = 'S';
    select id into v_m from public.variantes_producto where producto_id = v_producto and nombre = 'M';
    if (select cantidad_stock from public.variantes_producto where id = v_s) <> 3 then
      raise exception 'FALLO: la talla S no quedó con sus existencias.';
    end if;

    -- -----------------------------------------------------------------------
    -- 2. Sin decir nada (nulo), el control de existencias queda como estaba.
    -- -----------------------------------------------------------------------
    perform public.guardar_presentaciones(
      v_producto, 'talla',
      jsonb_build_array(
        jsonb_build_object('id', v_s, 'nombre', 'S', 'cantidad_stock', 2),
        jsonb_build_object('id', v_m, 'nombre', 'M', 'cantidad_stock', 1)
      )
    );
    set constraints all immediate;
    set constraints all deferred;
    if (select controla_stock from public.productos where id = v_producto) is not true then
      raise exception 'FALLO: guardar sin decir nada apagó el control de existencias.';
    end if;

    -- -----------------------------------------------------------------------
    -- 3. Con unidades apartadas no se apaga: hay un comprador esperando.
    -- -----------------------------------------------------------------------
    update public.variantes_producto set cantidad_reservada = 1 where id = v_s;
    begin
      perform public.guardar_presentaciones(
        v_producto, 'talla',
        jsonb_build_array(
          jsonb_build_object('id', v_s, 'nombre', 'S'),
          jsonb_build_object('id', v_m, 'nombre', 'M')
        ),
        null,
        false
      );
      raise exception 'FALLO: se apagó el control de existencias con una talla apartada.';
    exception
      when raise_exception then
        if sqlerrm <> 'PRODUCTO_RESERVADO' then raise; end if;
    end;
    update public.variantes_producto set cantidad_reservada = 0 where id = v_s;

    -- -----------------------------------------------------------------------
    -- 4. Apagar: el producto deja de controlar y las tallas se quedan sin
    --    existencias; ya no puede quedar «agotado» por stock.
    -- -----------------------------------------------------------------------
    update public.variantes_producto set cantidad_stock = 0 where producto_id = v_producto;
    update public.productos set con_presentaciones = con_presentaciones where id = v_producto;
    perform public.guardar_presentaciones(
      v_producto, 'talla',
      jsonb_build_array(
        jsonb_build_object('id', v_s, 'nombre', 'S'),
        jsonb_build_object('id', v_m, 'nombre', 'M')
      ),
      null,
      false
    );
    set constraints all immediate;
    set constraints all deferred;

    select controla_stock, cantidad_stock, estado into v_controla, v_stock, v_estado
    from public.productos where id = v_producto;
    if v_controla is not false or v_stock is not null or v_estado <> 'disponible' then
      raise exception 'FALLO: apagar dejó controla=%, stock=%, estado=%', v_controla, v_stock, v_estado;
    end if;
    if exists (select 1 from public.variantes_producto where producto_id = v_producto and cantidad_stock is not null) then
      raise exception 'FALLO: apagar dejó tallas con existencias.';
    end if;

    -- -----------------------------------------------------------------------
    -- 5. Encender sin tallas pide las existencias del producto.
    -- -----------------------------------------------------------------------
    begin
      perform public.guardar_presentaciones(v_producto, 'talla', '[]'::jsonb, null, true);
      raise exception 'FALLO: se encendió sin tallas y sin existencias del producto.';
    exception
      when raise_exception then
        if sqlerrm <> 'EXISTENCIAS_REQUERIDAS' then raise; end if;
    end;
    perform public.guardar_presentaciones(v_producto, 'talla', '[]'::jsonb, 5, true);
    set constraints all immediate;
    set constraints all deferred;
    select controla_stock, cantidad_stock into v_controla, v_stock from public.productos where id = v_producto;
    if v_controla is not true or v_stock <> 5 then
      raise exception 'FALLO: encender sin tallas dejó controla=%, stock=%', v_controla, v_stock;
    end if;

    raise exception using errcode = 'P0001', message = 'TALLAS_CUENTA_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'TALLAS_CUENTA_EN_VERDE' then
        raise;
      end if;
      raise notice 'las tallas encienden y apagan el control de existencias: todo en verde';
  end;
end
$prueba$;
