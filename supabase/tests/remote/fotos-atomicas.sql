-- Las fotos de un producto se agregan y se quitan en la base, de a una.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:fotos:ensayo
--
-- La ruta leía la lista de fotos, le sumaba una y escribía la lista entera:
-- dos subidas a la vez se pisaban y una foto quedaba subida pero sin
-- referencia. Y al borrar, primero se borraba el archivo y después la
-- referencia: si fallaba lo segundo, el catálogo mostraba una foto rota. Lo
-- encontró la auditoría del 2026-09-30. Un único bloque que deshace todo.

do $prueba$
declare
  v_negocio uuid;
  v_duenio uuid;
  v_producto uuid;
  v_fotos text[];
  v_base text;
begin
  begin
    select producto.negocio_id, negocio.admin_user_id, producto.id
    into v_negocio, v_duenio, v_producto
    from public.productos as producto
    join public.negocios as negocio on negocio.id = producto.negocio_id
    where producto.eliminado_en is null
    order by producto.id
    limit 1;
    if v_producto is null then
      raise exception 'FALLO: la base de ensayo no tiene productos.';
    end if;
    update public.productos set fotos = '{}' where id = v_producto;
    v_base := v_negocio::text || '/' || v_producto::text || '/';

    perform set_config('request.jwt.claims', json_build_object('sub', v_duenio, 'role', 'authenticated')::text, true);

    -- 1. Agregar suma al final y conserva lo que había.
    perform public.agregar_foto_producto(v_producto, v_base || 'a.webp');
    v_fotos := public.agregar_foto_producto(v_producto, v_base || 'b.webp');
    if v_fotos <> array[v_base || 'a.webp', v_base || 'b.webp'] then
      raise exception 'FALLO: agregar no conservó las fotos: %', v_fotos;
    end if;

    -- 2. La misma ruta dos veces no se duplica.
    v_fotos := public.agregar_foto_producto(v_producto, v_base || 'b.webp');
    if cardinality(v_fotos) <> 2 then
      raise exception 'FALLO: la misma foto quedó dos veces.';
    end if;

    -- 3. Una ruta de otro producto u otro negocio no se vincula.
    begin
      perform public.agregar_foto_producto(v_producto, gen_random_uuid()::text || '/' || v_producto::text || '/c.webp');
      raise exception 'FALLO: se vinculó un archivo de otro negocio.';
    exception
      when raise_exception then
        if sqlerrm <> 'RUTA_AJENA' then raise; end if;
    end;

    -- 4. Quitar saca solo esa y devuelve la lista que queda.
    v_fotos := public.quitar_foto_producto(v_producto, v_base || 'a.webp');
    if v_fotos <> array[v_base || 'b.webp'] then
      raise exception 'FALLO: quitar dejó %', v_fotos;
    end if;

    -- 5. Quitar una que no está avisa, para no borrar un archivo ajeno.
    begin
      perform public.quitar_foto_producto(v_producto, v_base || 'a.webp');
      raise exception 'FALLO: se quitó una foto que no estaba.';
    exception
      when raise_exception then
        if sqlerrm <> 'FOTO_NO_ENCONTRADA' then raise; end if;
    end;

    -- 6. Otro usuario no toca las fotos de este producto.
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    begin
      perform public.quitar_foto_producto(v_producto, v_base || 'b.webp');
      raise exception 'FALLO: otro usuario quitó una foto.';
    exception
      when raise_exception then
        if sqlerrm <> 'PRODUCTO_NO_ENCONTRADO' then raise; end if;
    end;

    raise exception using errcode = 'P0001', message = 'FOTOS_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'FOTOS_EN_VERDE' then
        raise;
      end if;
      raise notice 'las fotos se agregan y se quitan de a una: todo en verde';
  end;
end
$prueba$;
