-- El visitante lee de un producto solo lo que el catálogo publica, y las
-- presentaciones solo de los productos a la vista
-- (`20261120090000_el_visitante_lee_solo_lo_publicado.sql`).
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:visitante:ensayo
--
-- Un único bloque que deshace todo lo que escribe: termina lanzando una
-- excepción propia, que revierte la transacción, y la atrapa para decir que
-- todo pasó.

do $prueba$
declare
  v_negocio uuid;
  v_producto uuid;
  v_columna text;
  v_vistas integer;
begin
  begin
    select id into v_negocio from public.negocios where activo = true order by creado_en limit 1;
    if v_negocio is null then
      raise exception 'FALLO: la base de ensayo no tiene negocios activos.';
    end if;

    -- Un producto oculto con una presentación: lo que antes se leía igual.
    insert into public.productos (negocio_id, nombre, precio, visible)
    values (v_negocio, 'Producto oculto de la auditoría', 10, false)
    returning id into v_producto;
    insert into public.variantes_producto (negocio_id, producto_id, nombre, precio)
    values (v_negocio, v_producto, 'Talla de la auditoría', 12);

    set local role anon;

    -- -----------------------------------------------------------------------
    -- 1. El rastro de auditoría de los precios no se lee. Cada columna por
    --    separado: si alguna se leyera, el mensaje dice cuál.
    -- -----------------------------------------------------------------------
    foreach v_columna in array array['precio_actualizado_por', 'precio_actualizado_en', 'precio_anterior'] loop
      begin
        execute format('select count(%I) from public.productos', v_columna) into v_vistas;
        raise exception 'FALLO: la clave pública leyó «%» de productos.', v_columna;
      exception
        when insufficient_privilege then null;
      end;
    end loop;
    begin
      perform * from public.productos limit 1;
      raise exception 'FALLO: la clave pública leyó la fila entera de un producto.';
    exception
      when insufficient_privilege then null;
    end;

    -- -----------------------------------------------------------------------
    -- 2. Lo que el catálogo pide se sigue leyendo: las columnas de
    --    `COLUMNAS_PRODUCTO_PUBLICO`, con los filtros y el orden de la página.
    -- -----------------------------------------------------------------------
    perform id, codigo, categoria_id, subcategoria_id, nombre, descripcion, precio, fotos,
            controla_stock, cantidad_stock, cantidad_reservada, estado, visible, orden,
            en_carta_hasta, atributos, duracion_minutos, recurso_id, con_presentaciones,
            tipo_presentacion
    from public.productos
    where negocio_id = v_negocio and visible = true and texto_busqueda ilike '%a%'
    order by orden, creado_en
    limit 12;

    -- -----------------------------------------------------------------------
    -- 3. Las presentaciones de un producto oculto no se leen; al mostrarlo, sí;
    --    en la papelera, de nuevo no.
    -- -----------------------------------------------------------------------
    select count(*) into v_vistas from public.variantes_producto where producto_id = v_producto;
    if v_vistas <> 0 then
      raise exception 'FALLO: un visitante leyó la presentación de un producto oculto.';
    end if;

    reset role;
    update public.productos set visible = true where id = v_producto;
    set local role anon;
    select count(*) into v_vistas from public.variantes_producto where producto_id = v_producto;
    if v_vistas <> 1 then
      raise exception 'FALLO: la presentación de un producto a la vista no se lee (% filas).', v_vistas;
    end if;
    -- Y embebida en su producto, como la pide el catálogo.
    select count(*) into v_vistas
    from public.productos as producto
    join public.variantes_producto as variante on variante.producto_id = producto.id
    where producto.id = v_producto;
    if v_vistas <> 1 then
      raise exception 'FALLO: la presentación no viaja con su producto visible.';
    end if;

    reset role;
    update public.productos set eliminado_en = now() where id = v_producto;
    set local role anon;
    select count(*) into v_vistas from public.variantes_producto where producto_id = v_producto;
    if v_vistas <> 0 then
      raise exception 'FALLO: un visitante leyó la presentación de un producto en la papelera.';
    end if;
    reset role;

    -- -----------------------------------------------------------------------
    -- 4. El permiso, mirado en el catálogo de la base. El dueño conserva el
    --    suyo: el panel muestra cuándo cambió cada precio.
    -- -----------------------------------------------------------------------
    if has_table_privilege('anon', 'public.productos', 'select') then
      raise exception 'FALLO: la clave pública conserva el permiso sobre la tabla entera.';
    end if;
    foreach v_columna in array array['precio_actualizado_por', 'precio_actualizado_en', 'precio_anterior'] loop
      if has_column_privilege('anon', 'public.productos', v_columna, 'select') then
        raise exception 'FALLO: la clave pública tiene concedida «%».', v_columna;
      end if;
      if not has_column_privilege('authenticated', 'public.productos', v_columna, 'select') then
        raise exception 'FALLO: el dueño perdió la lectura de «%».', v_columna;
      end if;
    end loop;
    -- Toda otra columna de la tabla está concedida: ninguna quedó olvidada.
    select count(*) into v_vistas
    from information_schema.columns
    where table_schema = 'public' and table_name = 'productos'
      and column_name not in ('precio_actualizado_por', 'precio_actualizado_en', 'precio_anterior')
      and not has_column_privilege('anon', 'public.productos', column_name, 'select');
    if v_vistas <> 0 then
      raise exception 'FALLO: % columnas de productos quedaron sin conceder a la clave pública.', v_vistas;
    end if;
    if has_table_privilege('anon', 'public.productos', 'insert')
       or has_table_privilege('anon', 'public.productos', 'update')
       or has_table_privilege('anon', 'public.productos', 'delete') then
      raise exception 'FALLO: la clave pública puede escribir en productos.';
    end if;

    raise exception using errcode = 'P0001', message = 'VISITANTE_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'VISITANTE_EN_VERDE' then
        raise;
      end if;
      raise notice 'el visitante lee de un producto solo lo publicado, y las presentaciones de lo que se ve: todo en verde';
  end;
end
$prueba$;
