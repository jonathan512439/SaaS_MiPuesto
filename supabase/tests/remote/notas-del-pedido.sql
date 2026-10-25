-- Notas del pedido: pruebas de base.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:notas-pedido:ensayo
--
-- Un único bloque que deshace todo lo que escribe: termina lanzando una
-- excepción propia, que revierte la transacción, y la atrapa para decir que
-- todo pasó.

do $prueba$
declare
  v_negocio uuid;
  v_slug text;
  v_producto uuid;
  v_pedido jsonb;
  v_idempotencia uuid := gen_random_uuid();
  v_items jsonb;

begin
  begin
    -- -----------------------------------------------------------------------
    -- Banco: una tienda con carrito y un producto sin presentaciones, sin
    -- control de existencias ni tope, para que lo único en juego sea la nota.
    -- -----------------------------------------------------------------------
    select negocio.id, negocio.slug
    into v_negocio, v_slug
    from public.negocios as negocio
    where negocio.activo = true
      and negocio.tipo_negocio = 'tienda_virtual'
      and exists (
        select 1
        from public.productos as producto
        where producto.negocio_id = negocio.id
          and producto.eliminado_en is null
          and producto.visible = true
          and producto.estado not in ('agotado', 'vendido')
          and not exists (
            select 1 from public.variantes_producto as variante
            where variante.producto_id = producto.id
          )
      )
    limit 1;

    if v_negocio is null then
      raise exception 'FALLO: la base de ensayo no tiene una tienda con un producto sin presentaciones.';
    end if;

    select producto.id into v_producto
    from public.productos as producto
    where producto.negocio_id = v_negocio and producto.eliminado_en is null and producto.visible = true
      and producto.estado not in ('agotado', 'vendido')
      and not exists (select 1 from public.variantes_producto as variante where variante.producto_id = producto.id)
    order by producto.id
    limit 1;

    update public.productos set controla_stock = false, cantidad_stock = null
    where id = v_producto;
    update public.negocios set tope_unidades_pedido = null where id = v_negocio;
    v_items := jsonb_build_array(jsonb_build_object('producto_id', v_producto, 'cantidad', 1));

    -- -----------------------------------------------------------------------
    -- 1. Todo negocio que ya existía queda con las notas apagadas.
    -- -----------------------------------------------------------------------
    if (
      select column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'negocios' and column_name = 'pide_nota_pedido'
    ) is distinct from 'false' then
      raise exception 'FALLO: las notas no nacen apagadas para los negocios.';
    end if;

    -- -----------------------------------------------------------------------
    -- 2. La llamada de antes, sin nota y con la mesa por nombre —la que hace el
    --    código que está en producción—, sigue creando pedidos.
    -- -----------------------------------------------------------------------
    v_pedido := public.crear_pedido_reservado(
      p_slug => v_slug,
      p_items => v_items,
      p_cliente_nombre => null,
      p_cliente_telefono => null,
      p_numero_mesa => null,
      p_idempotencia => gen_random_uuid(),
      p_huella_ip => encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex')
    );
    if v_pedido->>'codigo' is null or v_pedido->>'nota' is not null then
      raise exception 'FALLO: la llamada sin nota no creó el pedido, o lo creó con nota.';
    end if;

    -- -----------------------------------------------------------------------
    -- 3. Con las notas apagadas, la nota se descarta y el pedido sale igual.
    -- -----------------------------------------------------------------------
    update public.negocios set pide_nota_pedido = false where id = v_negocio;
    v_pedido := public.crear_pedido_reservado(
      v_slug, v_items, null, null, gen_random_uuid(),
      encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex'),
      p_nota => 'Sin cebolla'
    );
    if v_pedido->>'codigo' is null then
      raise exception 'FALLO: con las notas apagadas, un pedido con nota no se creó.';
    end if;
    if (select nota from public.pedidos where id = (v_pedido->>'id')::uuid) is not null then
      raise exception 'FALLO: con las notas apagadas, la nota se guardó igual.';
    end if;

    -- -----------------------------------------------------------------------
    -- 4. Prendidas: se guarda recortada, vuelve en la respuesta y en el
    --    reintento.
    -- -----------------------------------------------------------------------
    update public.negocios set pide_nota_pedido = true where id = v_negocio;
    v_pedido := public.crear_pedido_reservado(
      v_slug, v_items, null, null, v_idempotencia,
      encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex'),
      p_nota => '  Sin cebolla, por favor  '
    );
    if v_pedido->>'nota' is distinct from 'Sin cebolla, por favor' then
      raise exception 'FALLO: la nota no volvió recortada en la respuesta (%).', v_pedido->>'nota';
    end if;
    if (select nota from public.pedidos where id = (v_pedido->>'id')::uuid)
       is distinct from 'Sin cebolla, por favor' then
      raise exception 'FALLO: la nota no se guardó en el pedido.';
    end if;

    -- El reintento devuelve la nota guardada, no la nueva: es el mismo pedido.
    v_pedido := public.crear_pedido_reservado(
      v_slug, v_items, null, null, v_idempotencia,
      encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex'),
      p_nota => 'Otra cosa'
    );
    if coalesce((v_pedido->>'repetido')::boolean, false) is not true
       or v_pedido->>'nota' is distinct from 'Sin cebolla, por favor' then
      raise exception 'FALLO: el reintento no devolvió el pedido original con su nota.';
    end if;

    -- Una nota de puros espacios es como no haber escrito nada.
    v_pedido := public.crear_pedido_reservado(
      v_slug, v_items, null, null, gen_random_uuid(),
      encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex'),
      p_nota => '    '
    );
    if v_pedido->>'nota' is not null then
      raise exception 'FALLO: una nota en blanco se guardó.';
    end if;

    -- -----------------------------------------------------------------------
    -- 5. Hasta 300 caracteres: la función lo rechaza y la columna también, aun
    --    con la clave privilegiada.
    -- -----------------------------------------------------------------------
    v_pedido := public.crear_pedido_reservado(
      v_slug, v_items, null, null, gen_random_uuid(),
      encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex'),
      p_nota => repeat('a', 300)
    );
    if char_length(v_pedido->>'nota') <> 300 then
      raise exception 'FALLO: una nota de 300 caracteres justos no entró.';
    end if;

    begin
      perform public.crear_pedido_reservado(
        v_slug, v_items, null, null, gen_random_uuid(),
        encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex'),
        p_nota => repeat('a', 301)
      );
      raise exception 'FALLO: se aceptó una nota de 301 caracteres.';
    exception
      when raise_exception then
        if sqlerrm <> 'NOTA_INVALIDA' then raise; end if;
    end;

    begin
      update public.pedidos set nota = repeat('a', 301) where id = (v_pedido->>'id')::uuid;
      raise exception 'FALLO: la columna aceptó una nota de 301 caracteres.';
    exception
      when check_violation then null;
    end;
    begin
      update public.pedidos set nota = '' where id = (v_pedido->>'id')::uuid;
      raise exception 'FALLO: la columna aceptó una nota vacía en vez de nula.';
    exception
      when check_violation then null;
    end;

    -- -----------------------------------------------------------------------
    -- 6. Permisos: la función nueva la llama solo el servidor; el catálogo lee
    --    el interruptor y el dueño lo cambia; el visitante no lee notas.
    -- -----------------------------------------------------------------------
    if has_function_privilege('anon', 'public.crear_pedido_reservado(text, jsonb, text, text, uuid, text, text, text)', 'execute')
       or has_function_privilege('authenticated', 'public.crear_pedido_reservado(text, jsonb, text, text, uuid, text, text, text)', 'execute') then
      raise exception 'FALLO: anon o authenticated pueden crear pedidos sin pasar por el servidor.';
    end if;
    if not has_function_privilege('service_role', 'public.crear_pedido_reservado(text, jsonb, text, text, uuid, text, text, text)', 'execute') then
      raise exception 'FALLO: el servidor no puede crear pedidos.';
    end if;
    if exists (
      select 1 from pg_proc
      where proname = 'crear_pedido_reservado' and pronamespace = 'public'::regnamespace
      having count(*) <> 1
    ) then
      raise exception 'FALLO: quedó más de una versión de crear_pedido_reservado.';
    end if;

    if not has_column_privilege('anon', 'public.negocios', 'pide_nota_pedido', 'SELECT') then
      raise exception 'FALLO: el catálogo público no puede leer si el negocio pide notas.';
    end if;
    if not has_column_privilege('authenticated', 'public.negocios', 'pide_nota_pedido', 'UPDATE') then
      raise exception 'FALLO: el dueño no puede prender las notas.';
    end if;
    if has_column_privilege('anon', 'public.negocios', 'pide_nota_pedido', 'UPDATE') then
      raise exception 'FALLO: un visitante podría prender las notas.';
    end if;
    if has_column_privilege('anon', 'public.pedidos', 'nota', 'SELECT') then
      raise exception 'FALLO: un visitante podría leer las notas de los pedidos.';
    end if;

    raise exception using errcode = 'P0001', message = 'NOTAS_PEDIDO_TODO_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'NOTAS_PEDIDO_TODO_EN_VERDE' then
        raise;
      end if;
      raise notice 'notas del pedido: todas las pruebas pasaron';
  end;
end
$prueba$;
