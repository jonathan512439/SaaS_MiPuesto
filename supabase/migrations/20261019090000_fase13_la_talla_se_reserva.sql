-- Fase 13, paso 2: la talla se reserva, se cobra y se descuenta.
--
-- Tres cosas que salen juntas porque ninguna funciona sin las otras dos:
--
-- 1. Una sola fuente de verdad para las existencias. Si el producto controla
--    existencias y tiene presentaciones, las existencias y las reservas viven en
--    cada presentación y las del producto quedan en nulo y cero. Lo sostiene la
--    base —un disparador que ajusta el producto y una comprobación diferida al
--    confirmar la transacción—, porque el formulario del producto y la API
--    escriben existencias por su cuenta.
-- 2. El motor de compra: crear el pedido, confirmarlo, cancelarlo y expirarlo
--    reservan y devuelven sobre la presentación elegida, con su precio.
-- 3. `guardar_presentaciones`, que reemplaza al borrar-y-volver-a-crear del
--    editor: conserva el identificador de cada presentación, que es a lo que
--    apuntan las reservas y los pedidos.
--
-- Ver docs/plan/10-TALLAS-Y-PRESENTACIONES.md, §2.3 a §2.5.

-- ---------------------------------------------------------------------------
-- 1. El producto sabe si tiene presentaciones.
-- ---------------------------------------------------------------------------

alter table public.productos
  add column con_presentaciones boolean not null default false;

comment on column public.productos.con_presentaciones is
  'Si tiene presentaciones. La calcula la base; escribirla a mano no tiene efecto.';

update public.productos as producto
set con_presentaciones = true
where exists (select 1 from public.variantes_producto where producto_id = producto.id);

-- Las dos comprobaciones de existencias del producto se aflojan en un solo
-- punto: un producto que controla existencias puede tener las suyas en nulo,
-- que es el caso del que las lleva por presentación. Que eso solo pase cuando
-- de verdad tiene presentaciones lo comprueba la validación diferida de abajo.
alter table public.productos
  drop constraint productos_stock_coherente_check,
  add constraint productos_stock_coherente_check
    check (controla_stock = true or cantidad_stock is null),
  drop constraint productos_reserva_consistente,
  add constraint productos_reserva_consistente
    check (
      (controla_stock = false and cantidad_reservada = 0)
      or (
        controla_stock = true
        and cantidad_reservada >= 0
        and (
          (cantidad_stock is null and cantidad_reservada = 0)
          or (cantidad_stock is not null and cantidad_reservada <= cantidad_stock)
        )
      )
    );

-- El nombre único por producto se comprueba al final de la transacción: el
-- editor puede intercambiar dos nombres (la M pasa a L y la L a M) sin pasar
-- por un estado repetido que la base rechazaría a mitad de camino.
alter table public.variantes_producto
  drop constraint variantes_nombre_unico,
  add constraint variantes_nombre_unico
    unique (producto_id, nombre) deferrable initially deferred;

-- El cambio de tipo se valida al final de la transacción (abajo), no fila por
-- fila: el editor cambia el tipo y renombra las presentaciones en la misma
-- operación, y en el medio el estado es necesariamente mixto.
drop trigger if exists productos_tipo_de_presentacion_coherente on public.productos;
drop function if exists public.validar_cambio_de_tipo_de_presentacion();

-- ---------------------------------------------------------------------------
-- 2. El estado de un producto que lleva existencias por presentación.
--
-- Agotado si todas sus presentaciones visibles están en cero; reservado si
-- queda algo pero todo está apartado; disponible si se puede pedir alguna.
-- ---------------------------------------------------------------------------

create or replace function private.estado_por_presentaciones(p_producto_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when count(*) filter (where variante.visible) = 0 then 'agotado'
    when bool_and(variante.cantidad_stock = 0) filter (where variante.visible) then 'agotado'
    when bool_and(variante.cantidad_stock - variante.cantidad_reservada <= 0)
      filter (where variante.visible) then 'reservado'
    else 'disponible'
  end
  from public.variantes_producto as variante
  where variante.producto_id = p_producto_id
$$;

revoke all on function private.estado_por_presentaciones(uuid) from public, anon, authenticated;
grant execute on function private.estado_por_presentaciones(uuid) to service_role;

-- Lo corre la base antes de guardar cada producto: calcula si tiene
-- presentaciones y, si las tiene y controla existencias, deja las suyas en nulo
-- y su estado según las presentaciones. Así da igual quién escriba: el
-- formulario viejo, la API o el motor.
create or replace function public.ajustar_producto_con_presentaciones()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.con_presentaciones := exists (
    select 1 from public.variantes_producto where producto_id = new.id
  );

  if new.con_presentaciones and new.controla_stock then
    -- Un producto con unidades apartadas a nivel de producto no puede pasar a
    -- llevarlas por presentación: esas reservas quedarían sin dónde volver.
    if tg_op = 'UPDATE' and not old.con_presentaciones and old.cantidad_reservada > 0 then
      raise exception using
        errcode = 'P0001',
        message = 'PRODUCTO_RESERVADO',
        detail = 'El producto tiene unidades apartadas en pedidos pendientes.';
    end if;
    new.cantidad_stock := null;
    new.cantidad_reservada := 0;
    new.estado := private.estado_por_presentaciones(new.id);
  end if;

  return new;
end;
$$;

create trigger productos_ajustados_a_sus_presentaciones
  before insert or update on public.productos
  for each row
  execute function public.ajustar_producto_con_presentaciones();

-- Cuando cambia una presentación, el producto se vuelve a ajustar: sus
-- existencias, sus reservas o su estado pueden haber cambiado.
create or replace function public.ajustar_producto_de_la_presentacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producto_id uuid;
begin
  -- Por operación y no con `coalesce(new…, old…)`: en un borrado `new` no
  -- existe, y leerle un campo no es algo en lo que convenga confiar.
  if tg_op = 'DELETE' then
    v_producto_id := old.producto_id;
  else
    v_producto_id := new.producto_id;
  end if;

  update public.productos
  set con_presentaciones = con_presentaciones
  where id = v_producto_id;
  return null;
end;
$$;

create trigger variantes_ajustan_su_producto
  after insert or update or delete on public.variantes_producto
  for each row
  execute function public.ajustar_producto_de_la_presentacion();

-- ---------------------------------------------------------------------------
-- 3. La comprobación al final de la transacción.
--
-- Diferida porque el editor pasa por estados intermedios legítimos: al sacar la
-- última presentación de un producto que controla existencias, el producto se
-- queda un momento sin existencias propias hasta que se le cargan.
-- ---------------------------------------------------------------------------

create or replace function public.validar_existencias_del_producto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_producto public.productos%rowtype;
  v_id uuid;
begin
  -- Cada rama lee solo los campos de su tabla: `productos` no tiene
  -- `producto_id`, y en un borrado de presentación `new` no existe.
  if tg_table_name = 'productos' then
    v_id := new.id;
  elsif tg_op = 'DELETE' then
    v_id := old.producto_id;
  else
    v_id := new.producto_id;
  end if;

  select * into v_producto from public.productos where id = v_id;
  if not found then
    return null;
  end if;

  if v_producto.controla_stock then
    if v_producto.con_presentaciones then
      if v_producto.cantidad_stock is not null or v_producto.cantidad_reservada <> 0 then
        raise exception using errcode = 'check_violation', message = 'EXISTENCIAS_INCOHERENTES',
          detail = 'Un producto con presentaciones lleva las existencias en cada una.';
      end if;
      if exists (
        select 1 from public.variantes_producto
        where producto_id = v_id and cantidad_stock is null
      ) then
        raise exception using errcode = 'check_violation', message = 'EXISTENCIAS_POR_PRESENTACION',
          detail = 'Cada presentación de un producto que controla existencias necesita las suyas.';
      end if;
    elsif v_producto.cantidad_stock is null then
      raise exception using errcode = 'check_violation', message = 'EXISTENCIAS_REQUERIDAS',
        detail = 'Un producto que controla existencias y no tiene presentaciones necesita las suyas.';
    end if;
  elsif exists (
    select 1 from public.variantes_producto
    where producto_id = v_id and (cantidad_stock is not null or cantidad_reservada <> 0)
  ) then
    raise exception using errcode = 'check_violation', message = 'EXISTENCIAS_INCOHERENTES',
      detail = 'Un producto que no controla existencias no las lleva por presentación.';
  end if;

  if v_producto.tipo_presentacion = 'numero' and exists (
    select 1 from public.variantes_producto
    where producto_id = v_id
      and public.normalizar_numero_calzado(nombre) is distinct from nombre
  ) then
    raise exception using errcode = 'check_violation', message = 'NUMERO_INVALIDO',
      detail = 'El producto tiene presentaciones que no son números de calzado.';
  end if;

  return null;
end;
$$;

create constraint trigger productos_existencias_coherentes
  after insert or update on public.productos
  deferrable initially deferred
  for each row
  execute function public.validar_existencias_del_producto();

create constraint trigger variantes_existencias_coherentes
  after insert or update or delete on public.variantes_producto
  deferrable initially deferred
  for each row
  execute function public.validar_existencias_del_producto();

-- ---------------------------------------------------------------------------
-- 4. Crear el pedido: la presentación se exige, se valida, se cobra y se
--    reserva.
--
-- Sin tablas temporales a propósito: una por pedido escribe en el catálogo de
-- Postgres cada vez, y con muchos pedidos eso se nota. Los renglones pedidos se
-- leen del JSON en cada consulta, como hacía la versión anterior.
-- ---------------------------------------------------------------------------

create or replace function public.crear_pedido_reservado(
  p_slug text,
  p_items jsonb,
  p_cliente_nombre text,
  p_cliente_telefono text,
  p_idempotencia uuid,
  p_huella_ip text,
  p_numero_mesa text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_negocio public.negocios%rowtype;
  v_pedido public.pedidos%rowtype;
  v_items jsonb;
  v_total numeric(10, 2);
  v_cantidad_solicitados integer;
  v_cantidad_distintos integer;
  v_cantidad_validos integer;
  v_expira_en timestamptz;
  v_limite integer;
begin
  if p_idempotencia is null then
    raise exception using errcode = 'P0001', message = 'PEDIDO_INVALIDO';
  end if;

  if p_huella_ip is null or p_huella_ip !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = 'P0001', message = 'PEDIDO_INVALIDO';
  end if;

  if jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 30 then
    raise exception using errcode = 'P0001', message = 'PEDIDO_INVALIDO';
  end if;

  select * into v_negocio
  from public.negocios
  where slug = lower(trim(p_slug)) and activo = true
  for share;

  if not found then
    raise exception using errcode = 'P0001', message = 'NEGOCIO_NO_DISPONIBLE';
  end if;

  if v_negocio.tipo_negocio <> 'tienda_virtual' then
    raise exception using errcode = 'P0001', message = 'MODALIDAD_NO_PERMITE_PEDIDOS';
  end if;

  select * into v_pedido
  from public.pedidos
  where negocio_id = v_negocio.id and idempotencia = p_idempotencia;

  if found then
    return jsonb_build_object(
      'id', v_pedido.id,
      'codigo', v_pedido.codigo,
      'total', v_pedido.total,
      'expira_en', v_pedido.expira_en,
      'items', v_pedido.items,
      'numero_mesa', v_pedido.numero_mesa,
      'repetido', true
    );
  end if;

  if p_cliente_nombre is null
     or char_length(trim(p_cliente_nombre)) = 0
     or char_length(trim(p_cliente_nombre)) > 80 then
    raise exception using errcode = 'P0001', message = 'NOMBRE_INVALIDO';
  end if;

  if p_cliente_telefono is not null and p_cliente_telefono !~ '^591[67][0-9]{7}$' then
    raise exception using errcode = 'P0001', message = 'TELEFONO_INVALIDO';
  end if;

  -- Un renglón por producto y presentación. La M y la L del mismo producto son
  -- dos renglones; la M dos veces, no.
  select
    count(*),
    count(distinct (solicitado.producto_id, coalesce(solicitado.variante_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  into v_cantidad_solicitados, v_cantidad_distintos
  from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, variante_id uuid, cantidad integer)
  where solicitado.producto_id is not null
    and solicitado.cantidad between 1 and 99;

  if v_cantidad_solicitados <> jsonb_array_length(p_items)
     or v_cantidad_distintos <> v_cantidad_solicitados then
    raise exception using errcode = 'P0001', message = 'PEDIDO_INVALIDO';
  end if;

  -- Se bloquea en un orden fijo —productos y después presentaciones, cada uno
  -- por identificador— para que dos pedidos que se cruzan no se esperen el uno
  -- al otro para siempre. Las mismas reglas en `liberar_reservas_del_pedido`.
  perform producto.id
  from public.productos as producto
  where producto.id in (
      select solicitado.producto_id
      from jsonb_to_recordset(p_items) as solicitado(producto_id uuid)
    )
    and producto.negocio_id = v_negocio.id
  order by producto.id
  for update of producto;

  perform variante.id
  from public.variantes_producto as variante
  where variante.id in (
      select solicitado.variante_id
      from jsonb_to_recordset(p_items) as solicitado(variante_id uuid)
      where solicitado.variante_id is not null
    )
  order by variante.id
  for update of variante;

  -- Cada producto pedido: del negocio, a la vista y sin marcar agotado.
  select count(*) into v_cantidad_validos
  from jsonb_to_recordset(p_items) as solicitado(producto_id uuid)
  join public.productos as producto on producto.id = solicitado.producto_id
  where producto.negocio_id = v_negocio.id
    and producto.visible = true
    and producto.eliminado_en is null
    and producto.estado not in ('agotado', 'vendido');

  if v_cantidad_validos <> v_cantidad_solicitados then
    raise exception using errcode = 'P0001', message = 'PRODUCTO_NO_DISPONIBLE';
  end if;

  -- Un producto con presentaciones se pide eligiendo una.
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, variante_id uuid)
    join public.productos as producto on producto.id = solicitado.producto_id
    where solicitado.variante_id is null
      and producto.con_presentaciones
  ) then
    raise exception using errcode = 'P0001', message = 'PRESENTACION_REQUERIDA';
  end if;

  -- La presentación elegida tiene que ser de ese producto, de este negocio y
  -- estar a la vista.
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, variante_id uuid)
    left join public.variantes_producto as variante
      on variante.id = solicitado.variante_id
     and variante.producto_id = solicitado.producto_id
     and variante.negocio_id = v_negocio.id
     and variante.visible = true
    where solicitado.variante_id is not null
      and variante.id is null
  ) then
    raise exception using errcode = 'P0001', message = 'PRESENTACION_NO_DISPONIBLE';
  end if;

  -- Existencias: las del producto o las de la presentación, según dónde vivan.
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, variante_id uuid, cantidad integer)
    join public.productos as producto on producto.id = solicitado.producto_id
    left join public.variantes_producto as variante on variante.id = solicitado.variante_id
    where producto.controla_stock = true
      and (
        (solicitado.variante_id is null
          and producto.cantidad_stock - producto.cantidad_reservada < solicitado.cantidad)
        or (solicitado.variante_id is not null
          and variante.cantidad_stock - variante.cantidad_reservada < solicitado.cantidad)
      )
  ) then
    raise exception using errcode = 'P0001', message = 'STOCK_INSUFICIENTE';
  end if;

  insert into public.limites_pedidos_ip as limite (
    negocio_id, huella_ip, ventana_inicio, cantidad
  ) values (
    v_negocio.id, p_huella_ip, now(), 1
  )
  on conflict (negocio_id, huella_ip) do update
  set
    ventana_inicio = case
      when limite.ventana_inicio <= now() - interval '15 minutes' then now()
      else limite.ventana_inicio
    end,
    cantidad = case
      when limite.ventana_inicio <= now() - interval '15 minutes' then 1
      else limite.cantidad + 1
    end
  returning cantidad into v_limite;

  if v_limite > 5 then
    raise exception using errcode = 'P0001', message = 'LIMITE_PEDIDOS';
  end if;

  if p_numero_mesa is not null and nullif(trim(p_numero_mesa), '') is not null then
    if not v_negocio.pide_numero_mesa then
      raise exception using errcode = 'P0001', message = 'MESA_NO_PERMITIDA';
    end if;
    if char_length(trim(p_numero_mesa)) > 10 then
      raise exception using errcode = 'P0001', message = 'MESA_INVALIDA';
    end if;
  end if;

  v_expira_en := now() + make_interval(mins => v_negocio.reserva_minutos);

  -- El precio lo pone la base. La presentación con precio propio cobra el suyo,
  -- sin promoción: quien fijó un precio para «7,5 kg» fijó ese. La que no tiene
  -- el suyo cobra el del producto, con la promoción que corresponda. Es la misma
  -- regla que muestra el catálogo (`lib/catalogo/publico.ts`).
  select
    jsonb_agg(
      jsonb_build_object(
        'producto_id', renglon.producto_id,
        'codigo', renglon.codigo,
        'nombre', renglon.nombre,
        'variante_id', renglon.variante_id,
        'variante_nombre', renglon.variante_nombre,
        'tipo_presentacion', renglon.tipo_presentacion,
        'precio_unitario', renglon.precio_unitario,
        'precio_original', renglon.precio_original,
        'cantidad', renglon.cantidad,
        'subtotal', round(renglon.precio_unitario * renglon.cantidad, 2),
        'controla_stock', renglon.controla_stock
      ) order by renglon.orden
    ),
    round(sum(renglon.precio_unitario * renglon.cantidad), 2)
  into v_items, v_total
  from (
    select
      solicitado.orden,
      producto.id as producto_id,
      producto.codigo,
      producto.nombre,
      producto.precio as precio_original,
      producto.controla_stock,
      variante.id as variante_id,
      variante.nombre as variante_nombre,
      case when variante.id is not null then producto.tipo_presentacion end as tipo_presentacion,
      solicitado.cantidad,
      case
        when variante.id is not null and variante.precio is not null then variante.precio
        else private.calcular_precio_producto(
          producto.precio, producto.negocio_id, producto.id, producto.categoria_id, now()
        )
      end as precio_unitario
    -- `rows from` porque `with ordinality` no acepta la lista de columnas pegada
    -- a la función: va adentro, y el número de orden se nombra afuera.
    from rows from (
        jsonb_to_recordset(p_items) as (producto_id uuid, variante_id uuid, cantidad integer)
      ) with ordinality as solicitado(producto_id, variante_id, cantidad, orden)
    join public.productos as producto on producto.id = solicitado.producto_id
    left join public.variantes_producto as variante on variante.id = solicitado.variante_id
    where producto.negocio_id = v_negocio.id
  ) as renglon;

  insert into public.pedidos (
    negocio_id,
    cliente_nombre,
    cliente_telefono,
    items,
    total,
    estado,
    expira_en,
    idempotencia,
    numero_mesa
  ) values (
    v_negocio.id,
    nullif(trim(p_cliente_nombre), ''),
    p_cliente_telefono,
    v_items,
    v_total,
    'pendiente',
    v_expira_en,
    p_idempotencia,
    nullif(trim(p_numero_mesa), '')
  )
  returning * into v_pedido;

  -- Los renglones salen del JSON ya calculado: el precio que se guarda es
  -- exactamente el que se sumó en el total, sin volver a calcularlo.
  insert into public.pedido_items (
    pedido_id,
    producto_id,
    producto_codigo,
    nombre,
    precio_unitario,
    cantidad,
    subtotal,
    controla_stock,
    reserva_activa,
    variante_id,
    variante_nombre,
    tipo_presentacion
  )
  select
    v_pedido.id,
    renglon.producto_id,
    renglon.codigo,
    renglon.nombre,
    renglon.precio_unitario,
    renglon.cantidad,
    renglon.subtotal,
    renglon.controla_stock,
    renglon.controla_stock,
    renglon.variante_id,
    renglon.variante_nombre,
    renglon.tipo_presentacion
  from jsonb_to_recordset(v_items) as renglon(
    producto_id uuid,
    codigo text,
    nombre text,
    variante_id uuid,
    variante_nombre text,
    tipo_presentacion text,
    precio_unitario numeric,
    cantidad integer,
    subtotal numeric,
    controla_stock boolean
  );

  -- Reservar: en el producto los renglones sin presentación, y en la
  -- presentación los que la tienen. El disparador de la presentación vuelve a
  -- calcular el estado de su producto.
  update public.productos as producto
  set
    cantidad_reservada = producto.cantidad_reservada + solicitado.cantidad,
    estado = case
      when producto.cantidad_stock - producto.cantidad_reservada - solicitado.cantidad <= 0
        then 'reservado'
      else 'disponible'
    end
  from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, variante_id uuid, cantidad integer)
  where producto.id = solicitado.producto_id
    and solicitado.variante_id is null
    and producto.negocio_id = v_negocio.id
    and producto.controla_stock = true;

  update public.variantes_producto as variante
  set cantidad_reservada = variante.cantidad_reservada + solicitado.cantidad
  from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, variante_id uuid, cantidad integer),
       public.productos as producto
  where variante.id = solicitado.variante_id
    and producto.id = variante.producto_id
    and producto.controla_stock = true;

  update public.productos as producto
  set reservado_hasta = greatest(coalesce(producto.reservado_hasta, v_expira_en), v_expira_en)
  where producto.negocio_id = v_negocio.id
    and producto.controla_stock = true
    and producto.id in (
      select solicitado.producto_id
      from jsonb_to_recordset(p_items) as solicitado(producto_id uuid)
    );

  return jsonb_build_object(
    'id', v_pedido.id,
    'codigo', v_pedido.codigo,
    'total', v_pedido.total,
    'expira_en', v_pedido.expira_en,
    'items', v_pedido.items,
    'numero_mesa', v_pedido.numero_mesa,
    'repetido', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Devolver o descontar lo reservado, para los tres finales de un pedido.
--
-- Una sola función para los tres, en vez de tres copias de la misma cuenta:
-- las copias de la fase 6 ya habían empezado a divergir en cómo calculaban el
-- estado. `p_descontar` es verdadero solo al confirmar: además de liberar la
-- reserva, descuenta de las existencias.
-- ---------------------------------------------------------------------------

create or replace function private.liberar_reservas_del_pedido(
  p_pedido_id uuid,
  p_descontar boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_productos uuid[];
begin
  -- El mismo orden de bloqueo que al crear el pedido.
  perform producto.id
  from public.productos as producto
  join public.pedido_items as item on item.producto_id = producto.id
  where item.pedido_id = p_pedido_id and item.reserva_activa = true
  order by producto.id
  for update of producto;

  perform variante.id
  from public.variantes_producto as variante
  join public.pedido_items as item on item.variante_id = variante.id
  where item.pedido_id = p_pedido_id and item.reserva_activa = true
  order by variante.id
  for update of variante;

  select array_agg(distinct item.producto_id) into v_productos
  from public.pedido_items as item
  where item.pedido_id = p_pedido_id
    and item.reserva_activa = true
    and item.producto_id is not null;

  -- Lo reservado sobre el producto: los renglones sin presentación.
  update public.productos as producto
  set
    cantidad_stock = case
      when p_descontar then producto.cantidad_stock - reservado.cantidad
      else producto.cantidad_stock
    end,
    cantidad_reservada = producto.cantidad_reservada - reservado.cantidad,
    estado = case
      when (case when p_descontar then producto.cantidad_stock - reservado.cantidad else producto.cantidad_stock end) = 0
        then 'vendido'
      when (case when p_descontar then producto.cantidad_stock - reservado.cantidad else producto.cantidad_stock end)
           - (producto.cantidad_reservada - reservado.cantidad) <= 0 then 'reservado'
      else 'disponible'
    end
  from (
    select item.producto_id, sum(item.cantidad)::integer as cantidad
    from public.pedido_items as item
    where item.pedido_id = p_pedido_id
      and item.reserva_activa = true
      and item.controla_stock = true
      and item.variante_nombre is null
    group by item.producto_id
  ) as reservado
  where producto.id = reservado.producto_id;

  -- Lo reservado sobre cada presentación. El disparador de la presentación
  -- vuelve a calcular el estado de su producto.
  update public.variantes_producto as variante
  set
    cantidad_stock = case
      when p_descontar then variante.cantidad_stock - reservado.cantidad
      else variante.cantidad_stock
    end,
    cantidad_reservada = variante.cantidad_reservada - reservado.cantidad
  from (
    select item.variante_id, sum(item.cantidad)::integer as cantidad
    from public.pedido_items as item
    where item.pedido_id = p_pedido_id
      and item.reserva_activa = true
      and item.controla_stock = true
      and item.variante_id is not null
    group by item.variante_id
  ) as reservado
  where variante.id = reservado.variante_id;

  update public.pedido_items
  set reserva_activa = false
  where pedido_id = p_pedido_id and reserva_activa = true;

  -- Hasta cuándo sigue apartado cada producto tocado: lo que dure el pedido
  -- pendiente que más tarde vence, o nada.
  update public.productos as producto
  set reservado_hasta = (
    select max(pendiente.expira_en)
    from public.pedido_items as otro_item
    join public.pedidos as pendiente on pendiente.id = otro_item.pedido_id
    where otro_item.producto_id = producto.id
      and otro_item.reserva_activa = true
      and pendiente.estado = 'pendiente'
  )
  where producto.id = any (coalesce(v_productos, '{}'::uuid[]));
end;
$$;

revoke all on function private.liberar_reservas_del_pedido(uuid, boolean) from public, anon, authenticated;
grant execute on function private.liberar_reservas_del_pedido(uuid, boolean) to service_role;

create or replace function public.cambiar_estado_pedido_admin(
  p_pedido_id uuid,
  p_admin_user_id uuid,
  p_nuevo_estado text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pedido public.pedidos%rowtype;
  v_admin_real uuid;
begin
  if p_nuevo_estado not in ('confirmado', 'cancelado') then
    raise exception using errcode = 'P0001', message = 'ESTADO_INVALIDO';
  end if;

  select pedido.*
  into v_pedido
  from public.pedidos as pedido
  where pedido.id = p_pedido_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'PEDIDO_NO_ENCONTRADO';
  end if;

  select negocio.admin_user_id
  into v_admin_real
  from public.negocios as negocio
  where negocio.id = v_pedido.negocio_id;

  if v_admin_real <> p_admin_user_id then
    raise exception using errcode = 'P0001', message = 'PEDIDO_NO_ENCONTRADO';
  end if;

  if v_pedido.estado <> 'pendiente' or v_pedido.expira_en <= now() then
    raise exception using errcode = 'P0001', message = 'PEDIDO_NO_PENDIENTE';
  end if;

  perform private.liberar_reservas_del_pedido(v_pedido.id, p_nuevo_estado = 'confirmado');

  if p_nuevo_estado = 'confirmado' then
    update public.pedidos
    set
      estado = 'confirmado',
      actualizado_en = now(),
      confirmado_en = now(),
      confirmado_por = p_admin_user_id
    where id = v_pedido.id
    returning * into v_pedido;
  else
    update public.pedidos
    set
      estado = 'cancelado',
      actualizado_en = now(),
      cancelado_en = now(),
      cancelado_por = p_admin_user_id
    where id = v_pedido.id
    returning * into v_pedido;
  end if;

  return jsonb_build_object(
    'id', v_pedido.id,
    'codigo', v_pedido.codigo,
    'estado', v_pedido.estado,
    'actualizado_en', v_pedido.actualizado_en
  );
end;
$$;

create or replace function public.expirar_reservas_vencidas(p_limite integer default 100)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pedido record;
  v_procesados integer := 0;
begin
  if p_limite < 1 or p_limite > 500 then
    raise exception using errcode = 'P0001', message = 'LIMITE_INVALIDO';
  end if;

  for v_pedido in
    select pedido.id
    from public.pedidos as pedido
    where pedido.estado = 'pendiente'
      and pedido.expira_en is not null
      and pedido.expira_en <= now()
    order by pedido.expira_en, pedido.id
    limit p_limite
    for update skip locked
  loop
    perform private.liberar_reservas_del_pedido(v_pedido.id, false);

    update public.pedidos
    set estado = 'expirado', actualizado_en = now()
    where id = v_pedido.id and estado = 'pendiente';

    v_procesados := v_procesados + 1;
  end loop;

  return v_procesados;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Guardar las presentaciones de un producto sin cambiarles el
--    identificador.
--
-- Reemplaza al borrar-todas-y-volver-a-crear del editor. Las que vienen con
-- identificador se actualizan; las que no, se crean; las que faltan, se borran
-- —y si tienen unidades apartadas, la base se niega (`PRESENTACION_RESERVADA`)—.
-- El tipo y las presentaciones se guardan juntos, y la comprobación diferida
-- mira el resultado al final.
--
-- `p_existencias_producto` es para cuando se sacan todas las presentaciones de
-- un producto que controla existencias: vuelve a llevarlas él, y hay que decir
-- cuántas.
-- ---------------------------------------------------------------------------

create or replace function public.guardar_presentaciones(
  p_producto_id uuid,
  p_tipo text,
  p_presentaciones jsonb,
  p_existencias_producto integer default null
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

revoke all on function public.guardar_presentaciones(uuid, text, jsonb, integer) from public, anon;
grant execute on function public.guardar_presentaciones(uuid, text, jsonb, integer) to authenticated, service_role;
