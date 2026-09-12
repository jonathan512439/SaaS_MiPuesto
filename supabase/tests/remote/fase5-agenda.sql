-- Fase 5: la agenda y las citas.
--
-- Lo que comprueba es la garantía de la fase: **que la base impida el doble
-- agendamiento por su cuenta**. La prueba de concurrencia
-- (`npm run test:citas:concurrencia`) mide el comportamiento con pedidos
-- simultáneos; esto mide que la restricción exista y esté activa, que es lo que
-- podría desaparecer en una migración futura sin que nadie lo note.
--
-- Corre dentro de una transacción que termina en `rollback`.

begin;

do $$
declare
  negocio uuid;
  producto uuid;
  categoria uuid;
  ajeno_categoria uuid;
  ajeno uuid;
  fallo boolean;
  inicio timestamptz;
begin
  -- 1. La extensión que permite mezclar la igualdad de un uuid con el
  --    solapamiento de un rango. **No estaba instalada** cuando se escribió el
  --    plan: se daba por puesta. Queda vigilada.
  if not exists (select 1 from pg_extension where extname = 'btree_gist') then
    raise exception 'Fase 5: btree_gist no está instalada';
  end if;

  -- 2. La restricción de exclusión existe y es **por categoría**, no por
  --    producto. Ese cambio es el que impide que un consultorio con un solo
  --    profesional acepte dos citas a la misma hora en servicios distintos. Se
  --    comprueba el texto de la definición porque la columna es justo lo que
  --    distingue el modelo corregido del que tenía el defecto.
  if not exists (
    select 1
    from pg_constraint as restriccion
    join pg_class as tabla on tabla.oid = restriccion.conrelid
    join pg_namespace as espacio on espacio.oid = tabla.relnamespace
    where espacio.nspname = 'public'
      and tabla.relname = 'citas'
      and restriccion.conname = 'citas_sin_solapamiento'
      and restriccion.contype = 'x'
      and pg_get_constraintdef(restriccion.oid) like '%categoria_id WITH =%'
  ) then
    raise exception 'Fase 5: falta la restricción de exclusión de citas';
  end if;

  -- 3. Las claves foráneas compuestas de las dos tablas nuevas.
  if not exists (
    select 1 from pg_constraint as restriccion
    join pg_class as tabla on tabla.oid = restriccion.conrelid
    join pg_namespace as espacio on espacio.oid = tabla.relnamespace
    where espacio.nspname = 'public' and tabla.relname = 'agenda_categoria'
      and restriccion.contype = 'f' and cardinality(restriccion.conkey) = 2
  ) then
    raise exception 'Fase 5: agenda_categoria no tiene clave foránea compuesta';
  end if;

  if not exists (
    select 1 from pg_constraint as restriccion
    join pg_class as tabla on tabla.oid = restriccion.conrelid
    join pg_namespace as espacio on espacio.oid = tabla.relnamespace
    where espacio.nspname = 'public' and tabla.relname = 'citas'
      and restriccion.contype = 'f' and cardinality(restriccion.conkey) = 2
  ) then
    raise exception 'Fase 5: citas no tiene clave foránea compuesta';
  end if;

  -- 4. RLS en las dos.
  if exists (
    select 1 from pg_class as clase
    join pg_namespace as espacio on espacio.oid = clase.relnamespace
    where espacio.nspname = 'public'
      and clase.relname in ('citas', 'agenda_categoria')
      and clase.relrowsecurity = false
  ) then
    raise exception 'Fase 5: alguna de las tablas nuevas no tiene RLS';
  end if;

  -- 5. **`anon` no puede leer las citas.** Guardan nombre y teléfono de personas;
  --    lo que el catálogo público necesita es la cuenta de cupos, y para eso
  --    está `cupos_tomados`. Si esto se rompe, los datos de quien reservó quedan
  --    a la vista de cualquiera con la clave pública.
  if has_table_privilege('anon', 'public.citas', 'select') then
    raise exception 'Fase 5: anon puede leer las citas';
  end if;

  if not has_function_privilege('anon', 'public.ocupacion_categoria(uuid, timestamptz, timestamptz)', 'execute') then
    raise exception 'Fase 5: anon no puede contar cupos, el calendario público no funciona';
  end if;

  -- 6. La función que cuenta cupos fija `search_path` vacío. Es `security
  --    definer`, así que sin eso sería un agujero.
  if not exists (
    select 1 from pg_proc as funcion
    join pg_namespace as espacio on espacio.oid = funcion.pronamespace
    where espacio.nspname = 'public'
      and funcion.proname = 'ocupacion_categoria'
      and funcion.prosecdef = true
      and exists (
        select 1 from unnest(funcion.proconfig) as ajuste
        where ajuste in ('search_path=', 'search_path=""')
      )
  ) then
    raise exception 'Fase 5: ocupacion_categoria no fija search_path vacío';
  end if;

  -- 7. Desde acá, comportamiento.
  select p.id, p.negocio_id, p.categoria_id into producto, negocio, categoria
  from public.productos as p
  where p.eliminado_en is null and p.categoria_id is not null
  order by p.creado_en limit 1;

  if producto is null then
    raise notice 'Fase 5: no hay productos para probar el comportamiento. Solo se auditó la forma.';
    return;
  end if;

  -- Un horario muy lejano, para no chocar con datos reales.
  inicio := date_trunc('hour', now()) + interval '500 days';

  insert into public.citas (negocio_id, producto_id, categoria_id, rango, cupo, nombre_cliente, telefono_cliente)
  values (negocio, producto, categoria, tstzrange(inicio, inicio + interval '30 minutes'), 1,
          'Auditoría', '59170000000');

  -- 8. **La misma hora, el mismo cupo: rechazada.** Es la garantía de la fase.
  fallo := false;
  begin
    insert into public.citas (negocio_id, producto_id, categoria_id, rango, cupo, nombre_cliente, telefono_cliente)
    values (negocio, producto, categoria, tstzrange(inicio, inicio + interval '30 minutes'), 1,
            'Segunda', '59170000001');
  exception when exclusion_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 5: la base aceptó dos citas en el mismo horario y cupo';
  end if;

  -- 9. Un horario que **se solapa parcialmente** también choca. Sin esto, un
  --    turno de 10:00 a 10:30 y otro de 10:15 a 10:45 convivirían.
  fallo := false;
  begin
    insert into public.citas (negocio_id, producto_id, categoria_id, rango, cupo, nombre_cliente, telefono_cliente)
    values (negocio, producto, categoria, tstzrange(inicio + interval '15 minutes',
            inicio + interval '45 minutes'), 1, 'Solapada', '59170000002');
  exception when exclusion_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 5: la base aceptó dos citas que se solapan a medias';
  end if;

  -- 10. Otro cupo a la misma hora **sí entra**: son dos consultorios.
  insert into public.citas (negocio_id, producto_id, categoria_id, rango, cupo, nombre_cliente, telefono_cliente)
  values (negocio, producto, categoria, tstzrange(inicio, inicio + interval '30 minutes'), 2,
          'Segundo consultorio', '59170000003');

  -- 11. Cancelar libera: la exclusión deja fuera las canceladas.
  update public.citas
  set estado = 'cancelada', cancelado_en = now()
  where producto_id = producto and cupo = 1 and lower(rango) = inicio;

  insert into public.citas (negocio_id, producto_id, categoria_id, rango, cupo, nombre_cliente, telefono_cliente)
  values (negocio, producto, categoria, tstzrange(inicio, inicio + interval '30 minutes'), 1,
          'Después de cancelar', '59170000004');

  -- 12. Una cancelada sin marca de tiempo no se puede auditar después.
  fallo := false;
  begin
    insert into public.citas (negocio_id, producto_id, categoria_id, rango, cupo, nombre_cliente,
                              telefono_cliente, estado)
    values (negocio, producto, categoria, tstzrange(inicio + interval '2 hours',
            inicio + interval '2 hours 30 minutes'), 1, 'Sin marca', '59170000005', 'cancelada');
  exception when check_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 5: la base aceptó una cita cancelada sin cuándo';
  end if;

  -- 13. Un teléfono que no es de Bolivia no sirve para avisar a nadie.
  fallo := false;
  begin
    insert into public.citas (negocio_id, producto_id, categoria_id, rango, cupo, nombre_cliente, telefono_cliente)
    values (negocio, producto, categoria, tstzrange(inicio + interval '3 hours',
            inicio + interval '3 hours 30 minutes'), 1, 'Mal teléfono', '12345');
  exception when check_violation then
    fallo := true;
  end;
  if not fallo then
    raise exception 'Fase 5: la base aceptó un teléfono inválido';
  end if;

  -- 14. Una cita del negocio A no puede colgar de un producto del B.
  select p.id, p.categoria_id into ajeno, ajeno_categoria
  from public.productos as p
  where p.negocio_id <> negocio and p.eliminado_en is null and p.categoria_id is not null
  limit 1;

  if ajeno is not null and ajeno_categoria is not null then
    fallo := false;
    begin
      insert into public.citas (negocio_id, producto_id, categoria_id, rango, cupo, nombre_cliente, telefono_cliente)
      values (negocio, ajeno, ajeno_categoria, tstzrange(inicio + interval '4 hours',
              inicio + interval '4 hours 30 minutes'), 1, 'Colada', '59170000006');
    exception when foreign_key_violation then
      fallo := true;
    end;
    if not fallo then
      raise exception 'Fase 5: una cita pudo colgar del producto de otro negocio';
    end if;
  end if;

  raise notice 'Fase 5: la base impide el doble agendamiento y las citas están aisladas.';
end;
$$;

rollback;
