-- Privacidad: el nombre y el teléfono de los clientes se borran a los seis meses.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:privacidad:ensayo
--
-- Un único bloque que deshace todo lo que escribe: termina con una excepción
-- que el bloque de afuera atrapa. Usa pedidos y citas reales de la copia y les
-- cambia la fecha dentro de la transacción; las citas las crea.

do $prueba$
declare
  v_viejo uuid;
  v_reciente uuid;
  v_pendiente uuid;
  v_cita_vieja uuid;
  v_cita_futura uuid;
  v_otro_pedido uuid;
  v_resultado record;
  v_fila record;
begin
  begin
    -- -----------------------------------------------------------------------
    -- Banco: tres pedidos y dos citas de la copia, con datos de cliente.
    -- -----------------------------------------------------------------------
    select id into v_viejo from public.pedidos order by creado_en limit 1;
    select id into v_reciente from public.pedidos where id <> v_viejo order by creado_en limit 1;
    select id into v_pendiente from public.pedidos where id not in (v_viejo, v_reciente) order by creado_en limit 1;
    select id into v_otro_pedido from public.pedidos
      where id not in (v_viejo, v_reciente, v_pendiente) order by creado_en limit 1;
    if v_otro_pedido is null then
      raise exception 'FALLO: la base de ensayo necesita al menos cuatro pedidos.';
    end if;

    -- La copia puede no tener citas: se crean dos con el recurso que haya y un
    -- producto de su negocio. La base exige que los tres sean del mismo.
    insert into public.citas (negocio_id, producto_id, recurso_id, rango, nombre_cliente, telefono_cliente)
    select r.negocio_id, p.id, r.id,
           tstzrange(now() + interval '400 days', now() + interval '400 days 30 minutes'),
           'Temporal', '59170000099'
    from public.recursos r
    join public.productos p on p.negocio_id = r.negocio_id and p.eliminado_en is null
    order by p.creado_en limit 1
    returning id into v_cita_vieja;
    insert into public.citas (negocio_id, producto_id, recurso_id, rango, nombre_cliente, telefono_cliente)
    select r.negocio_id, p.id, r.id,
           tstzrange(now() + interval '401 days', now() + interval '401 days 30 minutes'),
           'Temporal', '59170000098'
    from public.recursos r
    join public.productos p on p.negocio_id = r.negocio_id and p.eliminado_en is null
    order by p.creado_en limit 1
    returning id into v_cita_futura;
    if v_cita_futura is null then
      raise exception 'FALLO: no se pudieron crear las citas de prueba.';
    end if;

    -- Las pendientes de la copia no estorban.
    update public.pedidos set estado = 'expirado' where estado = 'pendiente';

    update public.pedidos
    set cliente_nombre = 'Ana Viejo', cliente_telefono = '59170000001',
        estado = 'expirado', creado_en = now() - interval '6 months 1 day',
        datos_cliente_borrados_en = null
    where id = v_viejo;
    update public.pedidos
    set cliente_nombre = 'Beto Reciente', cliente_telefono = '59170000002',
        estado = 'expirado', creado_en = now() - interval '5 months 29 days',
        datos_cliente_borrados_en = null
    where id = v_reciente;
    update public.pedidos
    set cliente_nombre = 'Caro Pendiente', cliente_telefono = '59170000003',
        estado = 'pendiente', creado_en = now() - interval '7 months',
        expira_en = now() + interval '1 hour', datos_cliente_borrados_en = null
    where id = v_pendiente;
    update public.pedidos
    set cliente_nombre = 'Ana Viejo', cliente_telefono = '59170000001',
        estado = 'expirado', creado_en = now() - interval '1 day',
        datos_cliente_borrados_en = null
    where id = v_otro_pedido;

    -- La cita vieja: pedida hace un año, el turno hace siete meses. La futura:
    -- pedida hace siete meses para dentro de un mes.
    update public.citas
    set nombre_cliente = 'Dani Vieja', telefono_cliente = '59170000004',
        nota = 'Vivo en la calle Sucre 123', nota_interna = 'Cliente de siempre',
        creado_en = now() - interval '1 year',
        rango = tstzrange(now() - interval '7 months', now() - interval '7 months' + interval '30 minutes'),
        datos_cliente_borrados_en = null
    where id = v_cita_vieja;
    update public.citas
    set nombre_cliente = 'Eli Futura', telefono_cliente = '59170000005',
        nota = 'Llego puntual', creado_en = now() - interval '7 months',
        rango = tstzrange(now() + interval '30 days', now() + interval '30 days 30 minutes'),
        datos_cliente_borrados_en = null
    where id = v_cita_futura;

    -- -----------------------------------------------------------------------
    -- 1. El borrado por antigüedad.
    -- -----------------------------------------------------------------------
    select * into v_resultado from public.borrar_datos_de_clientes_viejos();

    select * into v_fila from public.pedidos where id = v_viejo;
    if v_fila.cliente_nombre is not null or v_fila.cliente_telefono is not null
       or v_fila.datos_cliente_borrados_en is null then
      raise exception 'FALLO: el pedido cerrado de hace seis meses y un día conserva al cliente.';
    end if;
    if v_fila.total is null or v_fila.items is null then
      raise exception 'FALLO: se borró más que el cliente: el pedido perdió su total o sus productos.';
    end if;

    if (select cliente_telefono from public.pedidos where id = v_reciente) is distinct from '59170000002' then
      raise exception 'FALLO: se borró un pedido de cinco meses y 29 días.';
    end if;
    if (select cliente_telefono from public.pedidos where id = v_pendiente) is distinct from '59170000003' then
      raise exception 'FALLO: se borró el cliente de un pedido todavía pendiente.';
    end if;

    select * into v_fila from public.citas where id = v_cita_vieja;
    if v_fila.nombre_cliente <> public.texto_datos_borrados()
       or v_fila.telefono_cliente is not null or v_fila.nota is not null
       or v_fila.datos_cliente_borrados_en is null then
      raise exception 'FALLO: la cita de hace siete meses conserva datos del cliente.';
    end if;
    if v_fila.nota_interna is distinct from 'Cliente de siempre' then
      raise exception 'FALLO: se borró la nota interna, que es del dueño.';
    end if;

    if (select telefono_cliente from public.citas where id = v_cita_futura) is distinct from '59170000005' then
      raise exception 'FALLO: se borró una cita pedida hace siete meses pero con el turno por delante.';
    end if;

    if v_resultado.pedidos < 1 or v_resultado.citas < 1 then
      raise exception 'FALLO: la función no contó lo que borró (% pedidos, % citas).',
        v_resultado.pedidos, v_resultado.citas;
    end if;

    -- Una segunda vuelta no vuelve a tocar lo ya borrado.
    select * into v_resultado from public.borrar_datos_de_clientes_viejos();
    if v_resultado.pedidos <> 0 or v_resultado.citas <> 0 then
      raise exception 'FALLO: la segunda vuelta volvió a borrar (% pedidos, % citas).',
        v_resultado.pedidos, v_resultado.citas;
    end if;

    begin
      perform public.borrar_datos_de_clientes_viejos(0);
      raise exception 'FALLO: se aceptó un plazo de cero meses.';
    exception
      when raise_exception then
        if sqlerrm <> 'PLAZO_INVALIDO' then raise; end if;
    end;

    -- -----------------------------------------------------------------------
    -- 2. El borrado a pedido de un cliente, por su teléfono.
    -- -----------------------------------------------------------------------
    select * into v_resultado from public.borrar_datos_de_un_cliente('59170000005');
    if v_resultado.citas <> 1 then
      raise exception 'FALLO: el borrado a pedido no encontró la cita del cliente.';
    end if;
    if (select telefono_cliente from public.citas where id = v_cita_futura) is not null then
      raise exception 'FALLO: el borrado a pedido dejó el teléfono en la cita.';
    end if;

    -- Un pedido reciente del mismo cliente también se borra si lo pide.
    update public.pedidos set cliente_telefono = '59170000009', cliente_nombre = 'Fede'
      where id = v_otro_pedido;
    select * into v_resultado from public.borrar_datos_de_un_cliente('59170000009');
    if v_resultado.pedidos <> 1
       or (select cliente_nombre from public.pedidos where id = v_otro_pedido) is not null then
      raise exception 'FALLO: el borrado a pedido no borró el pedido reciente.';
    end if;
    if (select cliente_telefono from public.pedidos where id = v_reciente) is distinct from '59170000002' then
      raise exception 'FALLO: el borrado a pedido tocó a otro cliente.';
    end if;

    begin
      perform public.borrar_datos_de_un_cliente('70000000');
      raise exception 'FALLO: se aceptó un teléfono mal escrito.';
    exception
      when raise_exception then
        if sqlerrm <> 'TELEFONO_INVALIDO' then raise; end if;
    end;

    -- -----------------------------------------------------------------------
    -- 3. Nadie más que la plataforma puede borrar, y la tarea está programada
    --    y vigilada.
    -- -----------------------------------------------------------------------
    if has_function_privilege('anon', 'public.borrar_datos_de_clientes_viejos(integer)', 'execute')
       or has_function_privilege('authenticated', 'public.borrar_datos_de_clientes_viejos(integer)', 'execute')
       or has_function_privilege('anon', 'public.borrar_datos_de_un_cliente(text)', 'execute')
       or has_function_privilege('authenticated', 'public.borrar_datos_de_un_cliente(text)', 'execute') then
      raise exception 'FALLO: anon o authenticated pueden borrar datos de clientes.';
    end if;

    if not exists (
      select 1 from cron.job
      where jobname = 'mipuesto-borrar-datos-clientes'
        and command like '%borrar_datos_de_clientes_viejos%'
    ) then
      raise exception 'FALLO: la tarea diaria no está programada.';
    end if;
    if not exists (select 1 from public.estado_tareas() where tarea = 'mipuesto-borrar-datos-clientes') then
      raise exception 'FALLO: el vigilante no cuenta la tarea nueva.';
    end if;

    raise exception 'PRIVACIDAD_TODO_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'PRIVACIDAD_TODO_EN_VERDE' then raise; end if;
  end;
end;
$prueba$;
