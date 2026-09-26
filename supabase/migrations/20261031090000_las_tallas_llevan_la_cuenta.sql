-- Las tallas llevan la cuenta.
--
-- Hasta acá, para cargar una prenda con tallas y existencias había que pasar
-- dos veces por el formulario del producto: encender «Controlar existencias»
-- con una cantidad para el producto entero —que se descartaba al guardar las
-- tallas— y recién ahí el editor de tallas mostraba la columna de existencias.
-- Ahora `guardar_presentaciones` recibe `p_controla_stock` y el editor enciende
-- o apaga el control en el mismo guardado de las tallas.
--
-- La coherencia la siguen sosteniendo el disparador del producto y la
-- comprobación diferida de la fase 13: esto solo decide el control antes de
-- escribir las tallas. Probada en la base de ensayo con
-- `supabase/tests/remote/tallas-llevan-la-cuenta.sql`.

-- La firma cambia: se borra la de cuatro parámetros para que no queden dos
-- funciones con el mismo nombre, y la nueva acepta las llamadas de antes (el
-- quinto parámetro es opcional).
drop function public.guardar_presentaciones(uuid, text, jsonb, integer);

create or replace function public.guardar_presentaciones(
  p_producto_id uuid,
  p_tipo text,
  p_presentaciones jsonb,
  p_existencias_producto integer default null,
  -- Nulo: el control de existencias queda como estaba. Verdadero o falso lo
  -- encienden o lo apagan en el mismo guardado de las tallas.
  p_controla_stock boolean default null
)
returns setof public.variantes_producto
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producto public.productos%rowtype;
  v_duenio uuid;
  v_vende text;
begin
  if p_tipo is null or p_tipo not in ('talla', 'numero', 'tamano', 'presentacion') then
    raise exception using errcode = 'P0001', message = 'TIPO_INVALIDO';
  end if;

  if p_presentaciones is null or jsonb_typeof(p_presentaciones) <> 'array' then
    raise exception using errcode = 'P0001', message = 'PRESENTACIONES_INVALIDAS';
  end if;

  select producto.* into v_producto
  from public.productos as producto
  where producto.id = p_producto_id
    and producto.eliminado_en is null
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'PRODUCTO_NO_ENCONTRADO';
  end if;

  select negocio.admin_user_id into v_duenio
  from public.negocios as negocio
  where negocio.id = v_producto.negocio_id;

  -- Solo el dueño del negocio, o el servidor con su clave de servicio (las
  -- pruebas y las tareas internas). Otro usuario recibe lo mismo que si el
  -- producto no existiera: no tiene por qué enterarse de que existe.
  if (select auth.role()) is distinct from 'service_role'
     and v_duenio is distinct from (select auth.uid()) then
    raise exception using errcode = 'P0001', message = 'PRODUCTO_NO_ENCONTRADO';
  end if;

  select categoria.vende into v_vende
  from public.categorias as categoria
  where categoria.id = v_producto.categoria_id;

  if v_vende = 'tiempo' and jsonb_array_length(p_presentaciones) > 0 then
    raise exception using errcode = 'P0001', message = 'CATEGORIA_VENDE_TIEMPO';
  end if;

  -- Un identificador que no es de este producto no se acepta: no se puede mover
  -- una presentación de otro producto por este camino.
  if exists (
    select 1
    from jsonb_to_recordset(p_presentaciones) as entrante(id uuid)
    where entrante.id is not null
      and not exists (
        select 1 from public.variantes_producto
        where id = entrante.id and producto_id = p_producto_id
      )
  ) then
    raise exception using errcode = 'P0001', message = 'PRESENTACION_NO_ENCONTRADA';
  end if;

  -- «Llevar la cuenta» se decide antes de escribir las tallas, que se escriben
  -- según él. Encender deja al disparador del producto el resto: con tallas, el
  -- stock del producto queda en nulo y su estado sale de ellas. Apagar se niega
  -- si hay algo apartado: un comprador espera que se le confirme.
  if p_controla_stock is not null and p_controla_stock is distinct from v_producto.controla_stock then
    if p_controla_stock then
      update public.productos set controla_stock = true where id = p_producto_id;
    else
      if v_producto.cantidad_reservada > 0 or exists (
        select 1 from public.variantes_producto
        where producto_id = p_producto_id and cantidad_reservada > 0
      ) then
        raise exception using
          errcode = 'P0001',
          message = 'PRODUCTO_RESERVADO',
          detail = 'El producto tiene unidades apartadas en pedidos pendientes.';
      end if;
      update public.productos
      set controla_stock = false,
          cantidad_stock = null,
          cantidad_reservada = 0,
          estado = case when estado in ('agotado', 'reservado') then 'disponible' else estado end
      where id = p_producto_id;
      -- Las que no vienen en el guardado se borran abajo; las que vienen se
      -- escriben con lo suyo, que sin control de existencias es nulo.
      update public.variantes_producto set cantidad_stock = null where producto_id = p_producto_id;
    end if;
    v_producto.controla_stock := p_controla_stock;
  end if;

  -- El tipo primero: las presentaciones se escriben según él.
  update public.productos
  set tipo_presentacion = p_tipo
  where id = p_producto_id;

  delete from public.variantes_producto as variante
  where variante.producto_id = p_producto_id
    and variante.id not in (
      select entrante.id
      from jsonb_to_recordset(p_presentaciones) as entrante(id uuid)
      where entrante.id is not null
    );

  update public.variantes_producto as variante
  set
    nombre = entrante.nombre,
    precio = entrante.precio,
    cantidad_stock = entrante.cantidad_stock,
    visible = coalesce(entrante.visible, true),
    orden = (entrante.orden - 1)::integer
  from rows from (
      jsonb_to_recordset(p_presentaciones)
        as (id uuid, nombre text, precio numeric, cantidad_stock integer, visible boolean)
    ) with ordinality as entrante(id, nombre, precio, cantidad_stock, visible, orden)
  where variante.id = entrante.id
    and variante.producto_id = p_producto_id;

  insert into public.variantes_producto (
    negocio_id, producto_id, nombre, precio, cantidad_stock, visible, orden
  )
  select
    v_producto.negocio_id, p_producto_id, entrante.nombre, entrante.precio,
    entrante.cantidad_stock, coalesce(entrante.visible, true), (entrante.orden - 1)::integer
  from rows from (
      jsonb_to_recordset(p_presentaciones)
        as (id uuid, nombre text, precio numeric, cantidad_stock integer, visible boolean)
    ) with ordinality as entrante(id, nombre, precio, cantidad_stock, visible, orden)
  where entrante.id is null;

  -- Sin presentaciones, un producto que controla existencias vuelve a llevar
  -- las suyas.
  if jsonb_array_length(p_presentaciones) = 0 and v_producto.controla_stock then
    if p_existencias_producto is null or p_existencias_producto < 0 then
      raise exception using errcode = 'P0001', message = 'EXISTENCIAS_REQUERIDAS';
    end if;
    update public.productos
    set cantidad_stock = p_existencias_producto,
        estado = case when p_existencias_producto = 0 then 'agotado' else 'disponible' end
    where id = p_producto_id;
  end if;

  return query
  select variante.*
  from public.variantes_producto as variante
  where variante.producto_id = p_producto_id
  order by variante.orden;
end;
$$;

revoke all on function public.guardar_presentaciones(uuid, text, jsonb, integer, boolean) from public, anon;
grant execute on function public.guardar_presentaciones(uuid, text, jsonb, integer, boolean) to authenticated, service_role;
