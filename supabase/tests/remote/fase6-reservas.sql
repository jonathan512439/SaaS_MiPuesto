begin;

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.pedido_items'::regclass) then
    raise exception 'pedido_items no tiene RLS';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.limites_pedidos_ip'::regclass) then
    raise exception 'limites_pedidos_ip no tiene RLS';
  end if;
  if has_table_privilege('anon', 'public.pedidos', 'insert') then
    raise exception 'anon puede insertar pedidos directamente';
  end if;
  if has_table_privilege('authenticated', 'public.pedidos', 'update') then
    raise exception 'authenticated puede alterar pedidos sin la operación auditada';
  end if;
  if has_function_privilege(
    'anon',
    'public.crear_pedido_reservado(text,jsonb,text,text,uuid,text)',
    'execute'
  ) then
    raise exception 'anon puede ejecutar directamente crear_pedido_reservado';
  end if;
  if not exists (
    select 1 from cron.job where jobname = 'mipuesto-expirar-reservas'
  ) then
    raise exception 'el cron de expiración no está programado';
  end if;
end;
$$;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('96000000-0000-4000-8000-000000000001', 'fase6-a@mipuesto.local', '{}'::jsonb),
  ('96000000-0000-4000-8000-000000000002', 'fase6-b@mipuesto.local', '{}'::jsonb);

insert into public.negocios (
  id, admin_user_id, slug, nombre, tipo_negocio, telefono_whatsapp, horario,
  reserva_minutos, activo
) values (
  '96100000-0000-4000-8000-000000000001',
  '96000000-0000-4000-8000-000000000001',
  'auditoria-fase-6',
  'Auditoría Fase 6',
  'tienda_virtual',
  '59170000006',
  '{"modo":"siempre_abierto"}'::jsonb,
  45,
  true
);

insert into public.productos (
  id, negocio_id, codigo, nombre, precio, controla_stock, cantidad_stock
) values
  (
    '96200000-0000-4000-8000-000000000001',
    '96100000-0000-4000-8000-000000000001',
    'PRD-AUD001',
    'Producto con stock',
    15,
    true,
    3
  ),
  (
    '96200000-0000-4000-8000-000000000002',
    '96100000-0000-4000-8000-000000000001',
    'PRD-AUD002',
    'Producto sin stock',
    10,
    false,
    null
  );

create temp table resultado_fase6 as
select public.crear_pedido_reservado(
  'auditoria-fase-6',
  jsonb_build_array(
    jsonb_build_object(
      'producto_id', '96200000-0000-4000-8000-000000000001'::uuid,
      'cantidad', 2
    ),
    jsonb_build_object(
      'producto_id', '96200000-0000-4000-8000-000000000002'::uuid,
      'cantidad', 1
    )
  ),
  'Cliente de prueba',
  '59170000007',
  '96300000-0000-4000-8000-000000000001'::uuid,
  repeat('a', 64)
) as datos;

do $$
declare
  v_pedido_id uuid;
begin
  select (datos ->> 'id')::uuid into v_pedido_id from resultado_fase6;

  if (select (datos ->> 'total')::numeric from resultado_fase6) <> 40 then
    raise exception 'el total no fue recalculado con precios de base';
  end if;
  if (select cantidad_reservada from public.productos where codigo = 'PRD-AUD001') <> 2 then
    raise exception 'la cantidad controlada no quedó reservada';
  end if;
  if (select cantidad_reservada from public.productos where codigo = 'PRD-AUD002') <> 0 then
    raise exception 'el producto sin control de stock fue reservado';
  end if;
  if (select count(*) from public.pedido_items where pedido_id = v_pedido_id) <> 2 then
    raise exception 'la copia inmutable de artículos está incompleta';
  end if;
end;
$$;

select public.crear_pedido_reservado(
  'auditoria-fase-6',
  jsonb_build_array(
    jsonb_build_object(
      'producto_id', '96200000-0000-4000-8000-000000000001'::uuid,
      'cantidad', 2
    ),
    jsonb_build_object(
      'producto_id', '96200000-0000-4000-8000-000000000002'::uuid,
      'cantidad', 1
    )
  ),
  'Cliente de prueba',
  '59170000007',
  '96300000-0000-4000-8000-000000000001'::uuid,
  repeat('a', 64)
);

do $$
begin
  if (
    select count(*) from public.pedidos
    where negocio_id = '96100000-0000-4000-8000-000000000001'
  ) <> 1 then
    raise exception 'el reintento idempotente duplicó el pedido';
  end if;
  if (select cantidad_reservada from public.productos where codigo = 'PRD-AUD001') <> 2 then
    raise exception 'el reintento idempotente duplicó la reserva';
  end if;
end;
$$;

update public.pedidos
set expira_en = now() - interval '1 minute'
where idempotencia = '96300000-0000-4000-8000-000000000001';

do $$
begin
  if public.expirar_reservas_vencidas() <> 1 then
    raise exception 'la primera expiración no procesó el pedido vencido';
  end if;
  if public.expirar_reservas_vencidas() <> 0 then
    raise exception 'la expiración no es idempotente';
  end if;
  if (
    select estado from public.pedidos
    where idempotencia = '96300000-0000-4000-8000-000000000001'
  ) <> 'expirado' then
    raise exception 'el pedido no pasó a expirado';
  end if;
  if (select cantidad_reservada from public.productos where codigo = 'PRD-AUD001') <> 0 then
    raise exception 'la expiración no liberó la cantidad reservada';
  end if;
  if (select cantidad_stock from public.productos where codigo = 'PRD-AUD001') <> 3 then
    raise exception 'la expiración descontó existencias físicas';
  end if;
end;
$$;

create temp table confirmacion_fase6 as
select public.crear_pedido_reservado(
  'auditoria-fase-6',
  jsonb_build_array(
    jsonb_build_object(
      'producto_id', '96200000-0000-4000-8000-000000000001'::uuid,
      'cantidad', 1
    )
  ),
  null,
  null,
  '96300000-0000-4000-8000-000000000002'::uuid,
  repeat('b', 64)
) as datos;

do $$
declare
  v_pedido_id uuid;
  v_rechazado boolean := false;
begin
  select (datos ->> 'id')::uuid into v_pedido_id from confirmacion_fase6;
  begin
    perform public.cambiar_estado_pedido_admin(
      v_pedido_id,
      '96000000-0000-4000-8000-000000000002'::uuid,
      'confirmado'
    );
  exception when others then
    v_rechazado := true;
  end;

  if not v_rechazado then
    raise exception 'un administrador ajeno pudo confirmar el pedido';
  end if;

  perform public.cambiar_estado_pedido_admin(
    v_pedido_id,
    '96000000-0000-4000-8000-000000000001'::uuid,
    'confirmado'
  );

  if (select cantidad_stock from public.productos where codigo = 'PRD-AUD001') <> 2 then
    raise exception 'confirmar la venta no descontó el stock';
  end if;
  if not exists (
    select 1 from public.pedidos
    where id = v_pedido_id
      and estado = 'confirmado'
      and confirmado_por = '96000000-0000-4000-8000-000000000001'
      and confirmado_en is not null
  ) then
    raise exception 'la confirmación no guardó su auditoría';
  end if;
end;
$$;

create temp table cancelacion_fase6 as
select public.crear_pedido_reservado(
  'auditoria-fase-6',
  jsonb_build_array(
    jsonb_build_object(
      'producto_id', '96200000-0000-4000-8000-000000000001'::uuid,
      'cantidad', 2
    )
  ),
  null,
  null,
  '96300000-0000-4000-8000-000000000003'::uuid,
  repeat('c', 64)
) as datos;

do $$
declare
  v_pedido_id uuid;
begin
  select (datos ->> 'id')::uuid into v_pedido_id from cancelacion_fase6;
  perform public.cambiar_estado_pedido_admin(
    v_pedido_id,
    '96000000-0000-4000-8000-000000000001'::uuid,
    'cancelado'
  );

  if (select cantidad_stock from public.productos where codigo = 'PRD-AUD001') <> 2 then
    raise exception 'cancelar modificó el stock físico';
  end if;
  if (select cantidad_reservada from public.productos where codigo = 'PRD-AUD001') <> 0 then
    raise exception 'cancelar no liberó la reserva';
  end if;
  if not exists (
    select 1 from public.pedidos
    where id = v_pedido_id
      and estado = 'cancelado'
      and cancelado_por = '96000000-0000-4000-8000-000000000001'
      and cancelado_en is not null
  ) then
    raise exception 'la cancelación no guardó su auditoría';
  end if;
end;
$$;

rollback;

select 'Auditoría Fase 6: reservas, expiración, idempotencia, estados y permisos aprobados.' as resultado;
