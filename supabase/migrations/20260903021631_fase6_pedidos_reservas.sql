create extension if not exists pg_cron;

alter table public.productos
  add column codigo text,
  add column cantidad_reservada integer not null default 0;

update public.productos
set codigo = 'PRD-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where codigo is null;

update public.productos
set cantidad_stock = 0, estado = 'agotado'
where controla_stock = true and cantidad_stock is null;

alter table public.productos
  alter column codigo set not null,
  alter column codigo set default ('PRD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  add constraint productos_codigo_formato
    check (codigo ~ '^[A-Z0-9-]{5,24}$'),
  add constraint productos_reserva_consistente
    check (
      (controla_stock = false and cantidad_reservada = 0)
      or (
        controla_stock = true
        and cantidad_stock is not null
        and cantidad_reservada between 0 and cantidad_stock
      )
    ),
  add constraint productos_negocio_codigo_unico unique (negocio_id, codigo);

alter table public.pedidos
  add column codigo text,
  add column idempotencia uuid,
  add column actualizado_en timestamptz not null default now(),
  add column confirmado_en timestamptz,
  add column confirmado_por uuid references auth.users(id) on delete set null,
  add column cancelado_en timestamptz,
  add column cancelado_por uuid references auth.users(id) on delete set null;

update public.pedidos
set
  codigo = 'PED-' || upper(substr(replace(id::text, '-', ''), 1, 8)),
  idempotencia = gen_random_uuid(),
  confirmado_en = case when estado = 'confirmado' then creado_en else confirmado_en end,
  cancelado_en = case when estado = 'cancelado' then creado_en else cancelado_en end
where codigo is null or idempotencia is null;

alter table public.pedidos
  alter column codigo set not null,
  alter column codigo set default ('PED-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  alter column idempotencia set not null,
  alter column idempotencia set default gen_random_uuid(),
  add constraint pedidos_codigo_formato
    check (codigo ~ '^PED-[A-Z0-9]{8}$'),
  add constraint pedidos_codigo_unico unique (codigo),
  add constraint pedidos_idempotencia_unica unique (idempotencia),
  add constraint pedidos_confirmacion_auditada
    check (estado <> 'confirmado' or confirmado_en is not null),
  add constraint pedidos_cancelacion_auditada
    check (estado <> 'cancelado' or cancelado_en is not null);

create index idx_pedidos_confirmado_por on public.pedidos(confirmado_por);
create index idx_pedidos_cancelado_por on public.pedidos(cancelado_por);
create index idx_pedidos_negocio_creado on public.pedidos(negocio_id, creado_en desc);

create table public.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  producto_codigo text not null,
  nombre text not null,
  precio_unitario numeric(10, 2) not null check (precio_unitario >= 0),
  cantidad integer not null check (cantidad between 1 and 99),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  controla_stock boolean not null,
  reserva_activa boolean not null default false,
  creado_en timestamptz not null default now(),
  constraint pedido_items_producto_unico unique (pedido_id, producto_codigo),
  constraint pedido_items_subtotal_correcto
    check (subtotal = round(precio_unitario * cantidad, 2)),
  constraint pedido_items_reserva_coherente
    check (reserva_activa = false or controla_stock = true)
);

create index idx_pedido_items_pedido on public.pedido_items(pedido_id);
create index idx_pedido_items_producto on public.pedido_items(producto_id);
create index idx_pedido_items_reservas_activas
  on public.pedido_items(producto_id)
  where reserva_activa = true;

create table public.limites_pedidos_ip (
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  huella_ip text not null check (huella_ip ~ '^[0-9a-f]{64}$'),
  ventana_inicio timestamptz not null default now(),
  cantidad integer not null default 1 check (cantidad >= 1),
  primary key (negocio_id, huella_ip)
);

alter table public.pedido_items enable row level security;
alter table public.limites_pedidos_ip enable row level security;

drop policy if exists "administra_pedidos_propios" on public.pedidos;
create policy "consulta_pedidos_propios"
on public.pedidos for select to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = pedidos.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

create policy "consulta_items_pedido_propios"
on public.pedido_items for select to authenticated
using (
  exists (
    select 1
    from public.pedidos
    join public.negocios on negocios.id = pedidos.negocio_id
    where pedidos.id = pedido_items.pedido_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

revoke all on table public.pedido_items from anon, authenticated;
revoke all on table public.limites_pedidos_ip from anon, authenticated;
revoke insert, update, delete on table public.pedidos from authenticated;
grant select on table public.pedido_items to authenticated;
grant select, insert, update, delete on table public.pedido_items to service_role;
grant select, insert, update, delete on table public.limites_pedidos_ip to service_role;

create or replace function public.crear_pedido_reservado(
  p_slug text,
  p_items jsonb,
  p_cliente_nombre text,
  p_cliente_telefono text,
  p_idempotencia uuid,
  p_huella_ip text
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
  v_cantidad_productos integer;
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
      'repetido', true
    );
  end if;

  if p_cliente_nombre is not null and char_length(trim(p_cliente_nombre)) > 80 then
    raise exception using errcode = 'P0001', message = 'NOMBRE_INVALIDO';
  end if;

  if p_cliente_telefono is not null and p_cliente_telefono !~ '^591[67][0-9]{7}$' then
    raise exception using errcode = 'P0001', message = 'TELEFONO_INVALIDO';
  end if;

  select count(*), count(distinct solicitado.producto_id)
  into v_cantidad_solicitados, v_cantidad_productos
  from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, cantidad integer)
  where solicitado.producto_id is not null
    and solicitado.cantidad between 1 and 99;

  if v_cantidad_solicitados <> jsonb_array_length(p_items)
     or v_cantidad_productos <> v_cantidad_solicitados then
    raise exception using errcode = 'P0001', message = 'PEDIDO_INVALIDO';
  end if;

  perform producto.id
  from public.productos as producto
  join jsonb_to_recordset(p_items) as solicitado(producto_id uuid, cantidad integer)
    on solicitado.producto_id = producto.id
  where producto.negocio_id = v_negocio.id
  order by producto.id
  for update of producto;

  select count(*) into v_cantidad_productos
  from public.productos as producto
  join jsonb_to_recordset(p_items) as solicitado(producto_id uuid, cantidad integer)
    on solicitado.producto_id = producto.id
  where producto.negocio_id = v_negocio.id
    and producto.visible = true
    and producto.estado not in ('agotado', 'vendido');

  if v_cantidad_productos <> v_cantidad_solicitados then
    raise exception using errcode = 'P0001', message = 'PRODUCTO_NO_DISPONIBLE';
  end if;

  if exists (
    select 1
    from public.productos as producto
    join jsonb_to_recordset(p_items) as solicitado(producto_id uuid, cantidad integer)
      on solicitado.producto_id = producto.id
    where producto.negocio_id = v_negocio.id
      and producto.controla_stock = true
      and producto.cantidad_stock - producto.cantidad_reservada < solicitado.cantidad
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

  v_expira_en := now() + make_interval(mins => v_negocio.reserva_minutos);

  select
    jsonb_agg(
      jsonb_build_object(
        'producto_id', producto.id,
        'codigo', producto.codigo,
        'nombre', producto.nombre,
        'precio_unitario', producto.precio,
        'cantidad', solicitado.cantidad,
        'subtotal', round(producto.precio * solicitado.cantidad, 2),
        'controla_stock', producto.controla_stock
      ) order by producto.id
    ),
    round(sum(producto.precio * solicitado.cantidad), 2)
  into v_items, v_total
  from public.productos as producto
  join jsonb_to_recordset(p_items) as solicitado(producto_id uuid, cantidad integer)
    on solicitado.producto_id = producto.id
  where producto.negocio_id = v_negocio.id;

  insert into public.pedidos (
    negocio_id,
    cliente_nombre,
    cliente_telefono,
    items,
    total,
    estado,
    expira_en,
    idempotencia
  ) values (
    v_negocio.id,
    nullif(trim(p_cliente_nombre), ''),
    p_cliente_telefono,
    v_items,
    v_total,
    'pendiente',
    v_expira_en,
    p_idempotencia
  )
  returning * into v_pedido;

  insert into public.pedido_items (
    pedido_id,
    producto_id,
    producto_codigo,
    nombre,
    precio_unitario,
    cantidad,
    subtotal,
    controla_stock,
    reserva_activa
  )
  select
    v_pedido.id,
    producto.id,
    producto.codigo,
    producto.nombre,
    producto.precio,
    solicitado.cantidad,
    round(producto.precio * solicitado.cantidad, 2),
    producto.controla_stock,
    producto.controla_stock
  from public.productos as producto
  join jsonb_to_recordset(p_items) as solicitado(producto_id uuid, cantidad integer)
    on solicitado.producto_id = producto.id
  where producto.negocio_id = v_negocio.id;

  update public.productos as producto
  set
    cantidad_reservada = producto.cantidad_reservada + solicitado.cantidad,
    estado = case
      when producto.cantidad_stock - producto.cantidad_reservada - solicitado.cantidad <= 0
        then 'reservado'
      else 'disponible'
    end,
    reservado_hasta = greatest(
      coalesce(producto.reservado_hasta, v_expira_en),
      v_expira_en
    )
  from jsonb_to_recordset(p_items) as solicitado(producto_id uuid, cantidad integer)
  where producto.id = solicitado.producto_id
    and producto.negocio_id = v_negocio.id
    and producto.controla_stock = true;

  return jsonb_build_object(
    'id', v_pedido.id,
    'codigo', v_pedido.codigo,
    'total', v_pedido.total,
    'expira_en', v_pedido.expira_en,
    'items', v_pedido.items,
    'repetido', false
  );
end;
$$;

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

  perform producto.id
  from public.productos as producto
  join public.pedido_items as item on item.producto_id = producto.id
  where item.pedido_id = v_pedido.id and item.reserva_activa = true
  order by producto.id
  for update of producto;

  update public.pedido_items
  set reserva_activa = false
  where pedido_id = v_pedido.id and reserva_activa = true;

  if p_nuevo_estado = 'confirmado' then
    update public.productos as producto
    set
      cantidad_stock = producto.cantidad_stock - reservado.cantidad,
      cantidad_reservada = producto.cantidad_reservada - reservado.cantidad,
      estado = case
        when producto.cantidad_stock - reservado.cantidad = 0 then 'vendido'
        when (producto.cantidad_stock - reservado.cantidad)
             - (producto.cantidad_reservada - reservado.cantidad) <= 0 then 'reservado'
        else 'disponible'
      end,
      reservado_hasta = (
        select max(pendiente.expira_en)
        from public.pedido_items as otro_item
        join public.pedidos as pendiente on pendiente.id = otro_item.pedido_id
        where otro_item.producto_id = producto.id
          and otro_item.reserva_activa = true
          and pendiente.estado = 'pendiente'
      )
    from (
      select producto_id, sum(cantidad)::integer as cantidad
      from public.pedido_items
      where pedido_id = v_pedido.id and controla_stock = true
      group by producto_id
    ) as reservado
    where producto.id = reservado.producto_id;

    update public.pedidos
    set
      estado = 'confirmado',
      actualizado_en = now(),
      confirmado_en = now(),
      confirmado_por = p_admin_user_id
    where id = v_pedido.id
    returning * into v_pedido;
  else
    update public.productos as producto
    set
      cantidad_reservada = producto.cantidad_reservada - reservado.cantidad,
      estado = case
        when producto.cantidad_stock = 0 then 'vendido'
        when producto.cantidad_stock
             - (producto.cantidad_reservada - reservado.cantidad) <= 0 then 'reservado'
        else 'disponible'
      end,
      reservado_hasta = (
        select max(pendiente.expira_en)
        from public.pedido_items as otro_item
        join public.pedidos as pendiente on pendiente.id = otro_item.pedido_id
        where otro_item.producto_id = producto.id
          and otro_item.reserva_activa = true
          and pendiente.estado = 'pendiente'
      )
    from (
      select producto_id, sum(cantidad)::integer as cantidad
      from public.pedido_items
      where pedido_id = v_pedido.id and controla_stock = true
      group by producto_id
    ) as reservado
    where producto.id = reservado.producto_id;

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
    perform producto.id
    from public.productos as producto
    join public.pedido_items as item on item.producto_id = producto.id
    where item.pedido_id = v_pedido.id and item.reserva_activa = true
    order by producto.id
    for update of producto;

    update public.pedido_items
    set reserva_activa = false
    where pedido_id = v_pedido.id and reserva_activa = true;

    update public.productos as producto
    set
      cantidad_reservada = producto.cantidad_reservada - reservado.cantidad,
      estado = case
        when producto.cantidad_stock = 0 then 'vendido'
        when producto.cantidad_stock
             - (producto.cantidad_reservada - reservado.cantidad) <= 0 then 'reservado'
        else 'disponible'
      end,
      reservado_hasta = (
        select max(pendiente.expira_en)
        from public.pedido_items as otro_item
        join public.pedidos as pendiente on pendiente.id = otro_item.pedido_id
        where otro_item.producto_id = producto.id
          and otro_item.reserva_activa = true
          and pendiente.estado = 'pendiente'
      )
    from (
      select producto_id, sum(cantidad)::integer as cantidad
      from public.pedido_items
      where pedido_id = v_pedido.id and controla_stock = true
      group by producto_id
    ) as reservado
    where producto.id = reservado.producto_id;

    update public.pedidos
    set estado = 'expirado', actualizado_en = now()
    where id = v_pedido.id and estado = 'pendiente';

    v_procesados := v_procesados + 1;
  end loop;

  return v_procesados;
end;
$$;

revoke execute on function public.crear_pedido_reservado(text, jsonb, text, text, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.cambiar_estado_pedido_admin(uuid, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.expirar_reservas_vencidas(integer)
  from public, anon, authenticated;

grant execute on function public.crear_pedido_reservado(text, jsonb, text, text, uuid, text)
  to service_role;
grant execute on function public.cambiar_estado_pedido_admin(uuid, uuid, text)
  to service_role;
grant execute on function public.expirar_reservas_vencidas(integer)
  to service_role;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'mipuesto-expirar-reservas';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'mipuesto-expirar-reservas',
    '*/5 * * * *',
    $cron$select public.expirar_reservas_vencidas();$cron$
  );
end;
$$;
