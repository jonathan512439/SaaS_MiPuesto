-- Productos sin precio: pruebas de base (`20261121090000_productos_sin_precio.sql`).
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:sin-precio:ensayo
--
-- Lo que se comprueba es lo que la pantalla no puede garantizar: que un
-- producto sin precio se guarda y se lee, y que **no se puede comprar**, ni con
-- una petición armada a mano. Un único bloque que deshace todo lo que escribe:
-- termina lanzando una excepción propia, que revierte la transacción, y la
-- atrapa para decir que todo pasó.

do $prueba$
declare
  v_negocio uuid;
  v_slug text;
  v_duenio uuid;
  v_producto uuid;
  v_otro uuid;
  v_talla uuid;
  v_leidos integer;
  v_pedidos_antes integer;
  v_pedido jsonb;
  v_items jsonb;
  v_ajustados integer;
  v_precio numeric;
begin
  begin
    -- -----------------------------------------------------------------------
    -- Banco: una tienda con carrito y un producto sin presentaciones que hoy se
    -- puede pedir. Se le apaga el control de existencias y el tope, para que lo
    -- único en juego sea el precio.
    -- -----------------------------------------------------------------------
    select negocio.id, negocio.slug, negocio.admin_user_id
    into v_negocio, v_slug, v_duenio
    from public.negocios as negocio
    where negocio.activo = true
      and negocio.tipo_negocio = 'tienda_virtual'
      and negocio.admin_user_id is not null
      and exists (
        select 1
        from public.productos as producto
        where producto.negocio_id = negocio.id
          and producto.eliminado_en is null
          and producto.visible = true
          and producto.estado not in ('agotado', 'vendido')
          and producto.precio > 0
          and not producto.con_presentaciones
          and not exists (
            select 1 from public.categorias as categoria
            where categoria.id = producto.categoria_id and categoria.vende = 'tiempo'
          )
      )
    limit 1;

    if v_negocio is null then
      raise exception 'FALLO: la base de ensayo no tiene una tienda con un producto con precio y sin presentaciones.';
    end if;

    select producto.id into v_producto
    from public.productos as producto
    where producto.negocio_id = v_negocio and producto.eliminado_en is null and producto.visible = true
      and producto.estado not in ('agotado', 'vendido')
      and producto.precio > 0
      and not producto.con_presentaciones
      and not exists (
        select 1 from public.categorias as categoria
        where categoria.id = producto.categoria_id and categoria.vende = 'tiempo'
      )
    order by producto.id
    limit 1;

    update public.productos set controla_stock = false, cantidad_stock = null
    where id = v_producto;
    update public.negocios set tope_unidades_pedido = null where id = v_negocio;
    v_items := jsonb_build_array(jsonb_build_object('producto_id', v_producto, 'cantidad', 1));

    -- -----------------------------------------------------------------------
    -- 1. El precio admite nulo y 0; negativo, no. Ninguna columna cambió de
    --    tipo.
    -- -----------------------------------------------------------------------
    if (
      select is_nullable from information_schema.columns
      where table_schema = 'public' and table_name = 'productos' and column_name = 'precio'
    ) <> 'YES' then
      raise exception 'FALLO: productos.precio sigue sin admitir nulo.';
    end if;
    if (
      select data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
      from information_schema.columns
      where table_schema = 'public' and table_name = 'productos' and column_name = 'precio'
    ) <> 'numeric(10,2)' then
      raise exception 'FALLO: productos.precio cambió de tipo.';
    end if;

    update public.productos set precio = null where id = v_producto;
    if (select precio from public.productos where id = v_producto) is not null then
      raise exception 'FALLO: un producto con precio nulo no se guardó así.';
    end if;
    update public.productos set precio = 0 where id = v_producto;
    begin
      update public.productos set precio = -1 where id = v_producto;
      raise exception 'FALLO: se guardó un precio negativo.';
    exception
      when check_violation then null;
    end;

    -- -----------------------------------------------------------------------
    -- 2. La promoción no rebaja lo que no tiene precio: sin precio, nulo.
    -- -----------------------------------------------------------------------
    if private.calcular_precio_producto(null, v_negocio, v_producto, null, now()) is not null then
      raise exception 'FALLO: calcular_precio_producto con precio nulo no devolvió nulo.';
    end if;
    if private.calcular_precio_producto(0, v_negocio, v_producto, null, now()) is not null then
      raise exception 'FALLO: calcular_precio_producto con precio 0 no devolvió nulo.';
    end if;
    if private.calcular_precio_producto(10, v_negocio, gen_random_uuid(), null, now()) <> 10 then
      raise exception 'FALLO: calcular_precio_producto cambió el precio de un producto sin promoción.';
    end if;

    -- -----------------------------------------------------------------------
    -- 3. El pedido que trae un producto sin precio se rechaza y no se crea:
    --    con 0 y con nulo.
    -- -----------------------------------------------------------------------
    select count(*) into v_pedidos_antes from public.pedidos where negocio_id = v_negocio;

    foreach v_precio in array array[0, null]::numeric[] loop
      update public.productos set precio = v_precio where id = v_producto;
      begin
        perform public.crear_pedido_reservado(
          v_slug, v_items, null, null, gen_random_uuid(),
          encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
        );
        raise exception 'FALLO: se creó un pedido con un producto de precio %.', coalesce(v_precio::text, 'nulo');
      exception
        when raise_exception then
          if sqlerrm <> 'PRODUCTO_SIN_PRECIO' then raise; end if;
      end;
    end loop;

    if (select count(*) from public.pedidos where negocio_id = v_negocio) <> v_pedidos_antes then
      raise exception 'FALLO: el pedido rechazado dejó un pedido guardado.';
    end if;

    -- Mezclado con uno que sí tiene precio, también se rechaza entero.
    select producto.id into v_otro
    from public.productos as producto
    where producto.negocio_id = v_negocio and producto.id <> v_producto
      and producto.eliminado_en is null and producto.visible = true
      and producto.estado not in ('agotado', 'vendido')
      and producto.precio > 0 and not producto.con_presentaciones
    limit 1;
    if v_otro is not null then
      update public.productos set controla_stock = false, cantidad_stock = null where id = v_otro;
      begin
        perform public.crear_pedido_reservado(
          v_slug,
          v_items || jsonb_build_array(jsonb_build_object('producto_id', v_otro, 'cantidad', 1)),
          null, null, gen_random_uuid(),
          encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
        );
        raise exception 'FALLO: un pedido con un renglón sin precio y otro con precio se creó.';
      exception
        when raise_exception then
          if sqlerrm <> 'PRODUCTO_SIN_PRECIO' then raise; end if;
      end;
    end if;

    -- Con el mismo producto con precio, el pedido sale y cobra ese precio.
    update public.productos set precio = 25 where id = v_producto;
    v_pedido := public.crear_pedido_reservado(
      v_slug, v_items, null, null, gen_random_uuid(),
      encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
    );
    if v_pedido->>'codigo' is null then
      raise exception 'FALLO: con precio, el pedido no se creó.';
    end if;
    if (v_pedido->>'total')::numeric <> 25 then
      raise exception 'FALLO: con precio 25, el pedido cobró %.', v_pedido->>'total';
    end if;

    -- -----------------------------------------------------------------------
    -- 4. El visitante lee el producto sin precio: se publica igual.
    -- -----------------------------------------------------------------------
    set local role anon;
    select count(*) into v_leidos from public.productos where id = v_producto;
    reset role;
    if v_leidos <> 1 then
      raise exception 'FALLO: el visitante no lee el producto de prueba ni con precio (base mal elegida).';
    end if;

    update public.productos set precio = null where id = v_producto;
    set local role anon;
    select count(*) into v_leidos from public.productos where id = v_producto and precio is null;
    reset role;
    if v_leidos <> 1 then
      raise exception 'FALLO: el visitante no lee un producto sin precio.';
    end if;

    -- -----------------------------------------------------------------------
    -- 5. Con tallas de precio propio y sin precio base: se consulta, no se
    --    pide (decisión 4). Y el visitante lee sus tallas.
    -- -----------------------------------------------------------------------
    -- Ensayo no tiene productos con tallas: se le ponen al de prueba por el
    -- camino del panel, como su dueño. Con precio la M se pide; sin precio
    -- base, no.
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', v_duenio, 'role', 'authenticated')::text,
      true
    );
    select variante.id into v_talla
    from public.guardar_presentaciones(
      v_producto, 'talla',
      jsonb_build_array(
        jsonb_build_object('nombre', 'M', 'precio', 40),
        jsonb_build_object('nombre', 'L', 'precio', null)
      ),
      null, false
    ) as variante
    where variante.nombre = 'M';

    update public.productos set precio = 30 where id = v_producto;
    v_pedido := public.crear_pedido_reservado(
      v_slug,
      jsonb_build_array(jsonb_build_object('producto_id', v_producto, 'variante_id', v_talla, 'cantidad', 1)),
      null, null, gen_random_uuid(),
      encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
    );
    if (v_pedido->>'total')::numeric <> 40 then
      raise exception 'FALLO: la talla con precio propio no cobró el suyo (%).', v_pedido->>'total';
    end if;

    update public.productos set precio = null where id = v_producto;

    begin
      perform public.crear_pedido_reservado(
        v_slug,
        jsonb_build_array(jsonb_build_object('producto_id', v_producto, 'variante_id', v_talla, 'cantidad', 1)),
        null, null, gen_random_uuid(),
        encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
      );
      raise exception 'FALLO: se pidió una talla con precio propio de un producto sin precio base.';
    exception
      when raise_exception then
        if sqlerrm <> 'PRODUCTO_SIN_PRECIO' then raise; end if;
    end;

    set local role anon;
    select count(*) into v_leidos from public.variantes_producto where id = v_talla;
    reset role;
    if v_leidos <> 1 then
      raise exception 'FALLO: el visitante no lee las tallas de un producto sin precio.';
    end if;

    -- -----------------------------------------------------------------------
    -- 6. El ajuste masivo no toca los sin precio, aunque se los mande.
    -- -----------------------------------------------------------------------
    update public.productos set precio = 0 where id = v_producto;
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', v_duenio, 'role', 'authenticated')::text,
      true
    );
    v_ajustados := public.aplicar_ajuste_de_precios(
      gen_random_uuid(), 10,
      jsonb_build_array(jsonb_build_object('id', v_producto, 'precio_actual', 0, 'precio_nuevo', 10))
    );
    if v_ajustados <> 0 or (select precio from public.productos where id = v_producto) <> 0 then
      raise exception 'FALLO: el ajuste masivo le puso precio a un producto sin precio.';
    end if;

    -- Y con precio sí lo ajusta: la guardia no apagó el ajuste.
    update public.productos set precio = 20 where id = v_producto;
    v_ajustados := public.aplicar_ajuste_de_precios(
      gen_random_uuid(), 10,
      jsonb_build_array(jsonb_build_object('id', v_producto, 'precio_actual', 20, 'precio_nuevo', 22))
    );
    if v_ajustados <> 1 or (select precio from public.productos where id = v_producto) <> 22 then
      raise exception 'FALLO: el ajuste masivo dejó de ajustar un producto con precio.';
    end if;

    -- -----------------------------------------------------------------------
    -- 7. Los permisos de la función de pedidos no se abrieron al reemplazarla.
    -- -----------------------------------------------------------------------
    if has_function_privilege('anon', 'public.crear_pedido_reservado(text, jsonb, text, text, uuid, text, text, text)', 'execute')
       or has_function_privilege('authenticated', 'public.crear_pedido_reservado(text, jsonb, text, text, uuid, text, text, text)', 'execute') then
      raise exception 'FALLO: anon o authenticated pueden crear pedidos sin pasar por el servidor.';
    end if;
    if has_function_privilege('anon', 'public.aplicar_ajuste_de_precios(uuid, numeric, jsonb)', 'execute') then
      raise exception 'FALLO: un visitante puede ajustar precios.';
    end if;

    raise exception using errcode = 'P0001', message = 'SIN_PRECIO_TODO_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'SIN_PRECIO_TODO_EN_VERDE' then
        raise;
      end if;
      raise notice 'productos sin precio: se guardan, se leen y no se piden; todo en verde';
  end;
end
$prueba$;
