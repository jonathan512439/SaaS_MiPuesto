-- Fase 13 — pruebas de base del motor de compra con presentaciones.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:fase13:motor:ensayo
--
-- Un único bloque que deshace todo lo que escribe (ver fase13-presentaciones.sql
-- para el porqué de la forma). Las comprobaciones diferidas de existencias se
-- disparan a mano con `set constraints … immediate`: dentro de la prueba la
-- transacción nunca llega a confirmarse, así que sin eso no se verían.

do $prueba$
declare
  v_negocio uuid;
  v_slug text;
  v_duenio uuid;
  v_producto uuid;
  v_suelto uuid;
  v_ajeno uuid;
  v_40 uuid;
  v_41 uuid;
  v_40_despues uuid;
  v_pedido jsonb;
  v_pedido_id uuid;
  v_fila record;
  v_total numeric;
  v_cantidad integer;
  v_estado text;
  v_precio_producto numeric := 200;

begin
  begin
    -- -----------------------------------------------------------------------
    -- Banco: una tienda con carrito y dos productos que venden cosas.
    -- -----------------------------------------------------------------------
    select negocio.id, negocio.slug, negocio.admin_user_id
    into v_negocio, v_slug, v_duenio
    from public.negocios as negocio
    where negocio.activo = true
      and negocio.tipo_negocio = 'tienda_virtual'
      and exists (
        select 1
        from public.productos as producto
        join public.categorias as categoria on categoria.id = producto.categoria_id
        where producto.negocio_id = negocio.id
          and categoria.vende = 'cosas'
          and producto.eliminado_en is null
        group by producto.negocio_id
        having count(*) >= 2
      )
    limit 1;

    if v_negocio is null then
      raise exception 'FALLO: la base de ensayo no tiene una tienda con dos productos que vendan cosas.';
    end if;

    select producto.id into v_producto
    from public.productos as producto
    join public.categorias as categoria on categoria.id = producto.categoria_id
    where producto.negocio_id = v_negocio and categoria.vende = 'cosas' and producto.eliminado_en is null
    order by producto.id
    limit 1;

    select producto.id into v_suelto
    from public.productos as producto
    join public.categorias as categoria on categoria.id = producto.categoria_id
    where producto.negocio_id = v_negocio and categoria.vende = 'cosas' and producto.eliminado_en is null
      and producto.id <> v_producto
    order by producto.id
    limit 1;

    -- Otro producto cualquiera, para las presentaciones ajenas.
    select id into v_ajeno from public.productos where id not in (v_producto, v_suelto) order by id limit 1;

    -- Los pedidos pendientes de la copia no pueden estorbar: se cierran.
    update public.pedido_items set reserva_activa = false where reserva_activa = true;
    update public.pedidos set estado = 'expirado' where estado = 'pendiente';
    update public.variantes_producto set cantidad_reservada = 0 where cantidad_reservada > 0;
    update public.productos set cantidad_reservada = 0 where cantidad_reservada > 0;

    delete from public.variantes_producto where producto_id in (v_producto, v_suelto);
    update public.productos
    set controla_stock = true, cantidad_stock = 10, cantidad_reservada = 0, estado = 'disponible',
        visible = true, precio = v_precio_producto
    where id in (v_producto, v_suelto);
    delete from public.promociones where negocio_id = v_negocio;

    -- El dueño, para las operaciones del panel.
    perform set_config('request.jwt.claims', json_build_object('sub', v_duenio, 'role', 'authenticated')::text, true);

    -- -----------------------------------------------------------------------
    -- 1. Guardar presentaciones: las existencias pasan del producto a cada una.
    -- -----------------------------------------------------------------------
    perform public.guardar_presentaciones(
      v_producto, 'numero',
      jsonb_build_array(
        jsonb_build_object('nombre', '40', 'cantidad_stock', 5),
        jsonb_build_object('nombre', '41', 'cantidad_stock', 3)
      )
    );
    set constraints all immediate;
    set constraints all deferred;

    select id into v_40 from public.variantes_producto where producto_id = v_producto and nombre = '40';
    select id into v_41 from public.variantes_producto where producto_id = v_producto and nombre = '41';

    if v_40 is null or v_41 is null then
      raise exception 'FALLO: no se crearon el 40 y el 41.';
    end if;

    if exists (
      select 1 from public.productos
      where id = v_producto
        and (cantidad_stock is not null or con_presentaciones is not true or estado <> 'disponible')
    ) then
      raise exception 'FALLO: el producto no pasó a llevar las existencias por presentación.';
    end if;

    -- 1.1 Guardar otra vez con los identificadores conserva cada uno, aunque se
    --     intercambien los nombres (la unicidad se mira al final).
    perform public.guardar_presentaciones(
      v_producto, 'numero',
      jsonb_build_array(
        jsonb_build_object('id', v_40, 'nombre', '41', 'cantidad_stock', 5),
        jsonb_build_object('id', v_41, 'nombre', '40', 'cantidad_stock', 3)
      )
    );
    set constraints all immediate;
    set constraints all deferred;

    if (select nombre from public.variantes_producto where id = v_40) <> '41'
       or (select nombre from public.variantes_producto where id = v_41) <> '40' then
      raise exception 'FALLO: guardar con identificadores no conservó las presentaciones.';
    end if;

    -- Se vuelven a su lugar.
    perform public.guardar_presentaciones(
      v_producto, 'numero',
      jsonb_build_array(
        jsonb_build_object('id', v_40, 'nombre', '40', 'cantidad_stock', 5),
        jsonb_build_object('id', v_41, 'nombre', '41', 'cantidad_stock', 3, 'precio', 250)
      )
    );
    set constraints all immediate;
    set constraints all deferred;

    -- 1.2 Otro usuario no puede tocarlas.
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    begin
      perform public.guardar_presentaciones(v_producto, 'numero', '[]'::jsonb, 1);
      raise exception 'FALLO: otro usuario guardó presentaciones de un producto ajeno.';
    exception
      when raise_exception then
        if sqlerrm <> 'PRODUCTO_NO_ENCONTRADO' then raise; end if;
    end;
    perform set_config('request.jwt.claims', json_build_object('sub', v_duenio, 'role', 'authenticated')::text, true);

    -- 1.3 Una presentación de otro producto no se puede traer por este camino.
    -- Coherente con su producto: si controla existencias, lleva las suyas.
    -- Sin eso, la comprobación diferida la rechazaba con razón, y la prueba
    -- dependía de cuál producto de ensayo saliera primero.
    insert into public.variantes_producto (negocio_id, producto_id, nombre, orden, cantidad_stock)
    select negocio_id, id, 'Ajena de prueba', 20, case when controla_stock then 1 end
    from public.productos where id = v_ajeno;
    update public.productos set tipo_presentacion = 'presentacion' where id = v_ajeno;
    begin
      perform public.guardar_presentaciones(
        v_producto, 'numero',
        jsonb_build_array(jsonb_build_object(
          'id', (select id from public.variantes_producto where nombre = 'Ajena de prueba' and producto_id = v_ajeno),
          'nombre', '42', 'cantidad_stock', 1))
      );
      raise exception 'FALLO: se trajo una presentación de otro producto.';
    exception
      when raise_exception then
        if sqlerrm <> 'PRESENTACION_NO_ENCONTRADA' then raise; end if;
    end;

    -- 1.4 Cada presentación de un producto que controla existencias necesita
    --     las suyas: la comprobación diferida lo rechaza.
    begin
      perform public.guardar_presentaciones(
        v_producto, 'numero',
        jsonb_build_array(
          jsonb_build_object('id', v_40, 'nombre', '40', 'cantidad_stock', 5),
          jsonb_build_object('id', v_41, 'nombre', '41', 'cantidad_stock', null)
        )
      );
      set constraints all immediate;
      raise exception 'FALLO: se aceptó una presentación sin existencias en un producto que las controla.';
    exception
      when check_violation then
        if sqlerrm <> 'EXISTENCIAS_POR_PRESENTACION' then raise; end if;
    end;
    set constraints all deferred;

    -- 1.5 Escribirle existencias al producto por la API no tiene efecto: la base
    --     las deja en nulo.
    update public.productos set cantidad_stock = 99 where id = v_producto;
    if (select cantidad_stock from public.productos where id = v_producto) is not null then
      raise exception 'FALLO: el producto con presentaciones aceptó existencias propias.';
    end if;

    -- -----------------------------------------------------------------------
    -- 2. Crear pedidos.
    -- -----------------------------------------------------------------------

    -- 2.1 Un producto con presentaciones no se pide sin elegir una.
    begin
      perform public.crear_pedido_reservado(
        v_slug, jsonb_build_array(jsonb_build_object('producto_id', v_producto, 'cantidad', 1)),
        'Prueba', '59170000000', gen_random_uuid(),
        encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
      );
      raise exception 'FALLO: se pidió un producto con presentaciones sin elegir una.';
    exception
      when raise_exception then
        if sqlerrm <> 'PRESENTACION_REQUERIDA' then raise; end if;
    end;

    -- 2.2 Ni con la presentación de otro producto.
    begin
      perform public.crear_pedido_reservado(
        v_slug,
        jsonb_build_array(jsonb_build_object(
          'producto_id', v_producto,
          'variante_id', (select id from public.variantes_producto where nombre = 'Ajena de prueba' and producto_id = v_ajeno),
          'cantidad', 1)),
        'Prueba', '59170000000', gen_random_uuid(),
        encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
      );
      raise exception 'FALLO: se pidió con la presentación de otro producto.';
    exception
      when raise_exception then
        if sqlerrm <> 'PRESENTACION_NO_DISPONIBLE' then raise; end if;
    end;

    -- 2.3 La misma presentación dos veces en un pedido, no.
    begin
      perform public.crear_pedido_reservado(
        v_slug,
        jsonb_build_array(
          jsonb_build_object('producto_id', v_producto, 'variante_id', v_40, 'cantidad', 1),
          jsonb_build_object('producto_id', v_producto, 'variante_id', v_40, 'cantidad', 1)
        ),
        'Prueba', '59170000000', gen_random_uuid(),
        encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
      );
      raise exception 'FALLO: se aceptó el 40 dos veces en el mismo pedido.';
    exception
      when raise_exception then
        if sqlerrm <> 'PEDIDO_INVALIDO' then raise; end if;
    end;

    -- 2.4 Un precio mandado desde afuera no cambia nada: la base lo ignora.
    -- 2.5 El 40 dos veces y el 41 una: dos renglones, cada uno con su precio.
    v_pedido := public.crear_pedido_reservado(
      v_slug,
      jsonb_build_array(
        jsonb_build_object('producto_id', v_producto, 'variante_id', v_40, 'cantidad', 2, 'precio_unitario', 1),
        jsonb_build_object('producto_id', v_producto, 'variante_id', v_41, 'cantidad', 1, 'precio_unitario', 1),
        jsonb_build_object('producto_id', v_suelto, 'cantidad', 1)
      ),
      'Prueba', '59170000000', gen_random_uuid(),
      encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
    );
    v_pedido_id := (v_pedido ->> 'id')::uuid;

    -- 40: precio del producto (200) × 2; 41: el suyo (250) × 1; suelto: 200.
    if (v_pedido ->> 'total')::numeric <> 200 * 2 + 250 + 200 then
      raise exception 'FALLO: el total fue %, se esperaba %.', v_pedido ->> 'total', 200 * 2 + 250 + 200;
    end if;

    if (select count(*) from public.pedido_items where pedido_id = v_pedido_id) <> 3 then
      raise exception 'FALLO: el pedido no tiene tres renglones.';
    end if;

    if not exists (
      select 1 from public.pedido_items
      where pedido_id = v_pedido_id and variante_id = v_41
        and variante_nombre = '41' and tipo_presentacion = 'numero'
        and precio_unitario = 250 and reserva_activa
    ) then
      raise exception 'FALLO: el renglón del 41 no guardó su presentación, su tipo o su precio.';
    end if;

    if not exists (
      select 1 from jsonb_array_elements(v_pedido -> 'items') as renglon
      where renglon ->> 'variante_nombre' = '40' and (renglon ->> 'cantidad')::integer = 2
    ) then
      raise exception 'FALLO: el pedido devuelto no dice que el 40 va dos veces.';
    end if;

    -- 2.6 Se reservó en cada presentación, no en el producto.
    if (select cantidad_reservada from public.variantes_producto where id = v_40) <> 2
       or (select cantidad_reservada from public.variantes_producto where id = v_41) <> 1
       or (select cantidad_reservada from public.productos where id = v_producto) <> 0
       or (select cantidad_reservada from public.productos where id = v_suelto) <> 1 then
      raise exception 'FALLO: las reservas no quedaron donde van.';
    end if;

    -- 2.7 Pedir más de lo que queda del 41 (3 − 1 = 2).
    begin
      perform public.crear_pedido_reservado(
        v_slug,
        jsonb_build_array(jsonb_build_object('producto_id', v_producto, 'variante_id', v_41, 'cantidad', 3)),
        'Prueba', '59170000000', gen_random_uuid(),
        encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
      );
      raise exception 'FALLO: se reservaron más unidades del 41 de las que quedan.';
    exception
      when raise_exception then
        if sqlerrm <> 'STOCK_INSUFICIENTE' then raise; end if;
    end;

    -- 2.8 Una presentación con unidades apartadas no se puede sacar.
    begin
      perform public.guardar_presentaciones(
        v_producto, 'numero',
        jsonb_build_array(jsonb_build_object('id', v_41, 'nombre', '41', 'cantidad_stock', 3))
      );
      raise exception 'FALLO: se sacó el 40, que tiene unidades apartadas.';
    exception
      when raise_exception then
        if sqlerrm <> 'PRESENTACION_RESERVADA' then raise; end if;
    end;

    -- 2.9 Tampoco bajarle las existencias por debajo de lo apartado.
    begin
      perform public.guardar_presentaciones(
        v_producto, 'numero',
        jsonb_build_array(
          jsonb_build_object('id', v_40, 'nombre', '40', 'cantidad_stock', 1),
          jsonb_build_object('id', v_41, 'nombre', '41', 'cantidad_stock', 3, 'precio', 250)
        )
      );
      raise exception 'FALLO: se dejaron menos existencias del 40 que las apartadas.';
    exception
      when check_violation then null;
    end;

    -- -----------------------------------------------------------------------
    -- 3. Confirmar descuenta de cada presentación.
    -- -----------------------------------------------------------------------
    perform public.cambiar_estado_pedido_admin(v_pedido_id, v_duenio, 'confirmado');

    if (select cantidad_stock from public.variantes_producto where id = v_40) <> 3
       or (select cantidad_reservada from public.variantes_producto where id = v_40) <> 0
       or (select cantidad_stock from public.variantes_producto where id = v_41) <> 2
       or (select cantidad_reservada from public.variantes_producto where id = v_41) <> 0
       or (select cantidad_stock from public.productos where id = v_suelto) <> 9
       or (select cantidad_reservada from public.productos where id = v_suelto) <> 0 then
      raise exception 'FALLO: confirmar no descontó bien las existencias.';
    end if;

    if exists (select 1 from public.pedido_items where pedido_id = v_pedido_id and reserva_activa) then
      raise exception 'FALLO: confirmar dejó reservas activas.';
    end if;

    -- -----------------------------------------------------------------------
    -- 4. Cancelar devuelve la reserva sin tocar las existencias.
    -- -----------------------------------------------------------------------
    v_pedido := public.crear_pedido_reservado(
      v_slug,
      jsonb_build_array(jsonb_build_object('producto_id', v_producto, 'variante_id', v_40, 'cantidad', 2)),
      'Prueba', '59170000000', gen_random_uuid(),
      encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
    );
    perform public.cambiar_estado_pedido_admin((v_pedido ->> 'id')::uuid, v_duenio, 'cancelado');

    if (select cantidad_stock from public.variantes_producto where id = v_40) <> 3
       or (select cantidad_reservada from public.variantes_producto where id = v_40) <> 0 then
      raise exception 'FALLO: cancelar no devolvió la reserva del 40.';
    end if;

    -- -----------------------------------------------------------------------
    -- 5. Expirar devuelve la reserva, y una sola vez.
    -- -----------------------------------------------------------------------
    v_pedido := public.crear_pedido_reservado(
      v_slug,
      jsonb_build_array(jsonb_build_object('producto_id', v_producto, 'variante_id', v_41, 'cantidad', 2)),
      'Prueba', '59170000000', gen_random_uuid(),
      encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
    );
    v_pedido_id := (v_pedido ->> 'id')::uuid;

    -- Con el 41 entero apartado (2 de 2), el producto sigue disponible por el 40.
    if (select estado from public.productos where id = v_producto) <> 'disponible' then
      raise exception 'FALLO: apartar todo el 41 cambió el estado del producto, y el 40 sigue a la venta.';
    end if;

    update public.pedidos set expira_en = now() - interval '1 minute' where id = v_pedido_id;
    perform public.expirar_reservas_vencidas(100);
    perform public.expirar_reservas_vencidas(100);

    if (select cantidad_reservada from public.variantes_producto where id = v_41) <> 0
       or (select cantidad_stock from public.variantes_producto where id = v_41) <> 2
       or (select estado from public.pedidos where id = v_pedido_id) <> 'expirado' then
      raise exception 'FALLO: expirar no devolvió la reserva del 41 una sola vez.';
    end if;

    -- Un pedido expirado ya no se puede confirmar.
    begin
      perform public.cambiar_estado_pedido_admin(v_pedido_id, v_duenio, 'confirmado');
      raise exception 'FALLO: se confirmó un pedido expirado.';
    exception
      when raise_exception then
        if sqlerrm <> 'PEDIDO_NO_PENDIENTE' then raise; end if;
    end;

    -- -----------------------------------------------------------------------
    -- 6. Agotar la M no agota la L; agotar todas agota el producto.
    -- -----------------------------------------------------------------------
    perform public.guardar_presentaciones(
      v_producto, 'numero',
      jsonb_build_array(
        jsonb_build_object('id', v_40, 'nombre', '40', 'cantidad_stock', 0),
        jsonb_build_object('id', v_41, 'nombre', '41', 'cantidad_stock', 2, 'precio', 250)
      )
    );
    set constraints all immediate;
    set constraints all deferred;

    if (select estado from public.productos where id = v_producto) <> 'disponible' then
      raise exception 'FALLO: agotar el 40 agotó el producto, y el 41 sigue a la venta.';
    end if;

    begin
      perform public.crear_pedido_reservado(
        v_slug,
        jsonb_build_array(jsonb_build_object('producto_id', v_producto, 'variante_id', v_40, 'cantidad', 1)),
        'Prueba', '59170000000', gen_random_uuid(),
        encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
      );
      raise exception 'FALLO: se pidió el 40, que está en cero.';
    exception
      when raise_exception then
        if sqlerrm <> 'STOCK_INSUFICIENTE' then raise; end if;
    end;

    perform public.guardar_presentaciones(
      v_producto, 'numero',
      jsonb_build_array(
        jsonb_build_object('id', v_40, 'nombre', '40', 'cantidad_stock', 0),
        jsonb_build_object('id', v_41, 'nombre', '41', 'cantidad_stock', 0, 'precio', 250)
      )
    );
    set constraints all immediate;
    set constraints all deferred;

    if (select estado from public.productos where id = v_producto) <> 'agotado' then
      raise exception 'FALLO: con todas las presentaciones en cero, el producto no quedó agotado.';
    end if;

    -- -----------------------------------------------------------------------
    -- 7. Sacar todas las presentaciones: el producto vuelve a llevar las suyas.
    -- -----------------------------------------------------------------------
    begin
      perform public.guardar_presentaciones(v_producto, 'numero', '[]'::jsonb);
      raise exception 'FALLO: se sacaron las presentaciones sin decir cuántas existencias quedan.';
    exception
      when raise_exception then
        if sqlerrm <> 'EXISTENCIAS_REQUERIDAS' then raise; end if;
    end;

    perform public.guardar_presentaciones(v_producto, 'presentacion', '[]'::jsonb, 7);
    set constraints all immediate;
    set constraints all deferred;

    if not exists (
      select 1 from public.productos
      where id = v_producto and cantidad_stock = 7 and con_presentaciones = false and estado = 'disponible'
    ) then
      raise exception 'FALLO: sin presentaciones, el producto no volvió a llevar sus existencias.';
    end if;

    -- -----------------------------------------------------------------------
    -- 8. Un producto con unidades apartadas no pasa a llevarlas por
    --    presentación: esas reservas no tendrían a dónde volver.
    -- -----------------------------------------------------------------------
    v_pedido := public.crear_pedido_reservado(
      v_slug,
      jsonb_build_array(jsonb_build_object('producto_id', v_suelto, 'cantidad', 1)),
      'Prueba', '59170000000', gen_random_uuid(),
      encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
    );

    begin
      perform public.guardar_presentaciones(
        v_suelto, 'talla',
        jsonb_build_array(jsonb_build_object('nombre', 'M', 'cantidad_stock', 4))
      );
      raise exception 'FALLO: un producto con unidades apartadas pasó a llevarlas por presentación.';
    exception
      when raise_exception then
        if sqlerrm <> 'PRODUCTO_RESERVADO' then raise; end if;
    end;

    -- El pedido de siempre, sin presentaciones, sigue funcionando igual.
    perform public.cambiar_estado_pedido_admin((v_pedido ->> 'id')::uuid, v_duenio, 'confirmado');
    if (select cantidad_stock from public.productos where id = v_suelto) <> 8
       or (select cantidad_reservada from public.productos where id = v_suelto) <> 0 then
      raise exception 'FALLO: el pedido de un producto sin presentaciones dejó de descontar bien.';
    end if;

    -- -----------------------------------------------------------------------
    -- 9. Un número que no es número, rechazado al final de la transacción.
    -- -----------------------------------------------------------------------
    begin
      perform public.guardar_presentaciones(
        v_suelto, 'numero',
        jsonb_build_array(jsonb_build_object('nombre', 'M', 'cantidad_stock', 4))
      );
      set constraints all immediate;
      raise exception 'FALLO: se aceptó «M» en un producto de números.';
    exception
      when check_violation then
        if sqlerrm <> 'NUMERO_INVALIDO' then raise; end if;
    end;
    set constraints all deferred;

    raise exception using errcode = 'P0001', message = 'FASE13_TODO_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'FASE13_TODO_EN_VERDE' then
        raise;
      end if;
      raise notice 'fase 13.2: el motor de compra pasó todas las pruebas';
  end;
end
$prueba$;
