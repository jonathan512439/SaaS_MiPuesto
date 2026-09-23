-- Fase 13 — pruebas de base de las presentaciones.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run ensayo:estructura -- supabase/tests/remote/fase13-presentaciones.sql
--
-- Es un único bloque porque el CLI manda el archivo como una sola sentencia.
-- Todo corre en un sub-bloque que termina lanzando la marca
-- FASE13_TODO_EN_VERDE: la excepción deshace cada fila que se escribió, y el
-- bloque de afuera la reconoce y termina bien. Cualquier otra excepción —un
-- «FALLO» de acá, o un error de la base que no se esperaba— se propaga y el
-- comando termina con error.
--
-- Los casos de normalización de las dos listas marcadas son los mismos que
-- Vitest corre contra `lib/catalogo/variantes.ts`
-- (`lib/catalogo/variantes-normalizacion.test.ts` los lee de este archivo): la
-- regla de la base y la de la aplicación no pueden separarse sin que una de las
-- dos pruebas se ponga en rojo.

do $prueba$
declare
  caso record;
  v_producto uuid;
  v_negocio uuid;
  v_pedido uuid;
  v_ajena uuid;
begin
  begin
    -- -----------------------------------------------------------------------
    -- 1. El número de calzado, escrito siempre igual.
    -- -----------------------------------------------------------------------
    for caso in
      select * from (values
        -- casos:numero:inicio
        ('38', '38'),
        ('38,5', '38,5'),
        ('38.5', '38,5'),
        ('38½', '38,5'),
        (' 40 ', '40'),
        ('40,0', '40'),
        ('40.0', '40'),
        ('16', '16'),
        ('50', '50'),
        ('4 1', '41'),
        ('15', null),
        ('51', null),
        ('50,5', null),
        ('38,3', null),
        ('38,55', null),
        ('385', null),
        ('3', null),
        ('treinta', null),
        ('US 8', null),
        ('', null)
        -- casos:numero:fin
      ) as t(entrada, esperado)
    loop
      if public.normalizar_numero_calzado(caso.entrada) is distinct from caso.esperado then
        raise exception 'FALLO: normalizar_numero_calzado(%) dio %, se esperaba %',
          quote_literal(caso.entrada), public.normalizar_numero_calzado(caso.entrada), caso.esperado;
      end if;
    end loop;

    -- -----------------------------------------------------------------------
    -- 2. La talla, en mayúsculas si es una de las de siempre.
    -- -----------------------------------------------------------------------
    for caso in
      select * from (values
        -- casos:talla:inicio
        ('m', 'M'),
        (' xl ', 'XL'),
        ('Xxl', 'XXL'),
        ('unica', 'Única'),
        ('ÚNICA', 'Única'),
        ('2 años', '2 años'),
        (' Talla 10 ', 'Talla 10')
        -- casos:talla:fin
      ) as t(entrada, esperado)
    loop
      if public.normalizar_talla(caso.entrada) is distinct from caso.esperado then
        raise exception 'FALLO: normalizar_talla(%) dio %, se esperaba %',
          quote_literal(caso.entrada), public.normalizar_talla(caso.entrada), caso.esperado;
      end if;
    end loop;

    -- -----------------------------------------------------------------------
    -- 3. Un producto real de la base de ensayo como banco de pruebas.
    -- -----------------------------------------------------------------------
    select producto.id, producto.negocio_id into v_producto, v_negocio
    from public.productos as producto
    join public.categorias as categoria on categoria.id = producto.categoria_id
    where categoria.vende = 'cosas'
      and producto.eliminado_en is null
    order by producto.creado_en
    limit 1;

    if v_producto is null then
      raise exception 'FALLO: la base de ensayo no tiene un producto que venda cosas para probar.';
    end if;

    delete from public.variantes_producto where producto_id = v_producto;

    -- 3.1 Un producto «número» normaliza al guardar y rechaza lo que no es.
    update public.productos set tipo_presentacion = 'numero' where id = v_producto;
    insert into public.variantes_producto (negocio_id, producto_id, nombre, orden)
    values (v_negocio, v_producto, '38.5', 0);

    if not exists (
      select 1 from public.variantes_producto where producto_id = v_producto and nombre = '38,5'
    ) then
      raise exception 'FALLO: «38.5» no se guardó como «38,5».';
    end if;

    begin
      insert into public.variantes_producto (negocio_id, producto_id, nombre, orden)
      values (v_negocio, v_producto, 'treinta', 1);
      raise exception 'FALLO: se aceptó «treinta» como número de calzado.';
    exception
      when check_violation then
        if sqlerrm <> 'NUMERO_INVALIDO' then raise; end if;
    end;

    insert into public.variantes_producto (negocio_id, producto_id, nombre, orden)
    values (v_negocio, v_producto, '40', 1);

    -- `40,0` es `40`: la unicidad lo reconoce como repetido. Desde el paso 2
    -- se comprueba al final de la transacción (para que el editor pueda
    -- intercambiar nombres), así que acá se fuerza en el momento.
    begin
      insert into public.variantes_producto (negocio_id, producto_id, nombre, orden)
      values (v_negocio, v_producto, '40,0', 2);
      set constraints public.variantes_nombre_unico immediate;
      raise exception 'FALLO: se aceptó «40,0» junto a «40».';
    exception
      when unique_violation then null;
    end;
    set constraints public.variantes_nombre_unico deferred;

    -- 3.2 El tope es 24: la número 25 se rechaza.
    delete from public.variantes_producto where producto_id = v_producto;
    insert into public.variantes_producto (negocio_id, producto_id, nombre, orden)
    select v_negocio, v_producto, (26 + serie)::text, serie
    from generate_series(0, 23) as serie;

    begin
      insert into public.variantes_producto (negocio_id, producto_id, nombre, orden)
      values (v_negocio, v_producto, '16', 24);
      raise exception 'FALLO: se aceptó la presentación número 25.';
    exception
      when check_violation then
        if sqlerrm not like 'Un producto admite hasta 24 presentaciones%' then raise; end if;
    end;

    -- 3.3 Pasar a «número» con presentaciones que no son números se rechaza.
    delete from public.variantes_producto where producto_id = v_producto;
    update public.productos set tipo_presentacion = 'talla' where id = v_producto;
    insert into public.variantes_producto (negocio_id, producto_id, nombre, orden)
    values (v_negocio, v_producto, 'm', 0);

    if not exists (
      select 1 from public.variantes_producto where producto_id = v_producto and nombre = 'M'
    ) then
      raise exception 'FALLO: la talla «m» no se guardó como «M».';
    end if;

    -- Desde el paso 2 lo comprueba la validación diferida del producto.
    begin
      update public.productos set tipo_presentacion = 'numero' where id = v_producto;
      set constraints public.productos_existencias_coherentes immediate;
      raise exception 'FALLO: se pasó a «número» un producto con la talla «M».';
    exception
      when check_violation then
        if sqlerrm <> 'NUMERO_INVALIDO' then raise; end if;
    end;
    set constraints public.productos_existencias_coherentes deferred;

    -- 3.4 Nunca más reservado que las existencias; la reservada no se borra.
    update public.variantes_producto set cantidad_stock = 10 where producto_id = v_producto;

    begin
      update public.variantes_producto set cantidad_reservada = 11 where producto_id = v_producto;
      raise exception 'FALLO: se reservaron 11 de 10.';
    exception
      when check_violation then null;
    end;

    begin
      update public.variantes_producto
      set cantidad_stock = null, cantidad_reservada = 1
      where producto_id = v_producto;
      raise exception 'FALLO: se reservó en una presentación sin control de existencias.';
    exception
      when check_violation then null;
    end;

    update public.variantes_producto set cantidad_reservada = 3 where producto_id = v_producto;

    begin
      delete from public.variantes_producto where producto_id = v_producto;
      raise exception 'FALLO: se borró una presentación con unidades apartadas.';
    exception
      when raise_exception then
        if sqlerrm <> 'PRESENTACION_RESERVADA' then raise; end if;
    end;

    -- 3.5 El dueño no toca las reservas; sí sus columnas.
    begin
      set local role authenticated;
      update public.variantes_producto set cantidad_reservada = 0 where false;
      raise exception 'FALLO: el rol authenticated puede escribir cantidad_reservada.';
    exception
      when insufficient_privilege then null;
    end;
    reset role;

    begin
      set local role authenticated;
      update public.variantes_producto
      set nombre = nombre, precio = precio, cantidad_stock = cantidad_stock, visible = visible, orden = orden
      where false;
      reset role;
    exception
      when insufficient_privilege then
        reset role;
        raise exception 'FALLO: el editor perdió permiso sobre sus propias columnas.';
    end;
    reset role;

    update public.variantes_producto set cantidad_reservada = 0 where producto_id = v_producto;

    -- -----------------------------------------------------------------------
    -- 4. El renglón del pedido con su presentación.
    -- -----------------------------------------------------------------------
    select id into v_pedido from public.pedidos order by creado_en limit 1;
    if v_pedido is null then
      raise exception 'FALLO: la base de ensayo no tiene pedidos para probar los renglones.';
    end if;

    delete from public.variantes_producto where producto_id = v_producto;
    insert into public.variantes_producto (negocio_id, producto_id, nombre, orden)
    values (v_negocio, v_producto, 'M', 0), (v_negocio, v_producto, 'L', 1);

    -- 4.1 La M y la L del mismo producto, en el mismo pedido: dos renglones.
    insert into public.pedido_items (
      pedido_id, producto_id, producto_codigo, nombre, precio_unitario, cantidad, subtotal,
      controla_stock, variante_id, variante_nombre, tipo_presentacion
    )
    select v_pedido, v_producto, 'FASE13-PRUEBA', 'Prueba', 10, 1, 10, false, id, nombre, 'talla'
    from public.variantes_producto
    where producto_id = v_producto;

    -- 4.2 La misma talla dos veces en el mismo pedido, no.
    begin
      insert into public.pedido_items (
        pedido_id, producto_id, producto_codigo, nombre, precio_unitario, cantidad, subtotal,
        controla_stock, variante_id, variante_nombre, tipo_presentacion
      )
      select v_pedido, v_producto, 'FASE13-PRUEBA', 'Prueba', 10, 1, 10, false, id, nombre, 'talla'
      from public.variantes_producto
      where producto_id = v_producto and nombre = 'M';
      raise exception 'FALLO: se aceptó la M dos veces en el mismo pedido.';
    exception
      when unique_violation then null;
    end;

    -- 4.3 El mismo producto sin presentación, dos veces, tampoco (como antes).
    insert into public.pedido_items (
      pedido_id, producto_id, producto_codigo, nombre, precio_unitario, cantidad, subtotal, controla_stock
    )
    values (v_pedido, null, 'FASE13-SUELTO', 'Suelto', 5, 1, 5, false);

    begin
      insert into public.pedido_items (
        pedido_id, producto_id, producto_codigo, nombre, precio_unitario, cantidad, subtotal, controla_stock
      )
      values (v_pedido, null, 'FASE13-SUELTO', 'Suelto', 5, 1, 5, false);
      raise exception 'FALLO: se repitió un producto sin presentación en el mismo pedido.';
    exception
      when unique_violation then null;
    end;

    -- 4.4 Una presentación de OTRO producto no entra: la exige la clave
    --     compuesta, no la aplicación.
    select producto.id into v_ajena
    from public.productos as producto
    where producto.id <> v_producto
    limit 1;

    insert into public.variantes_producto (negocio_id, producto_id, nombre, orden)
    select negocio_id, id, 'Ajena de prueba', 23
    from public.productos
    where id = v_ajena
    returning id into v_ajena;

    begin
      insert into public.pedido_items (
        pedido_id, producto_id, producto_codigo, nombre, precio_unitario, cantidad, subtotal,
        controla_stock, variante_id, variante_nombre, tipo_presentacion
      )
      values (
        v_pedido, v_producto, 'FASE13-AJENA', 'Prueba', 10, 1, 10,
        false, v_ajena, 'Ajena de prueba', 'presentacion'
      );
      raise exception 'FALLO: se aceptó en el renglón una presentación de otro producto.';
    exception
      when foreign_key_violation then null;
    end;

    -- 4.5 Con presentación, el nombre copiado es obligatorio.
    begin
      insert into public.pedido_items (
        pedido_id, producto_id, producto_codigo, nombre, precio_unitario, cantidad, subtotal,
        controla_stock, variante_id
      )
      select v_pedido, v_producto, 'FASE13-SIN-NOMBRE', 'Prueba', 10, 1, 10, false, id
      from public.variantes_producto
      where producto_id = v_producto
      limit 1;
      raise exception 'FALLO: se aceptó un renglón con presentación y sin su nombre.';
    exception
      when check_violation then null;
    end;

    -- 4.6 Borrar la talla deja el renglón con su nombre y su producto.
    delete from public.variantes_producto where producto_id = v_producto and nombre = 'L';

    if not exists (
      select 1 from public.pedido_items
      where producto_codigo = 'FASE13-PRUEBA'
        and variante_nombre = 'L'
        and variante_id is null
        and producto_id = v_producto
    ) then
      raise exception 'FALLO: al borrar la talla, el renglón perdió su nombre o su producto.';
    end if;

    -- Todo en verde: se deshace lo escrito lanzando la marca.
    raise exception using errcode = 'P0001', message = 'FASE13_TODO_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'FASE13_TODO_EN_VERDE' then
        raise;
      end if;
      raise notice 'fase 13.1: las presentaciones pasaron todas las pruebas';
  end;
end
$prueba$;
