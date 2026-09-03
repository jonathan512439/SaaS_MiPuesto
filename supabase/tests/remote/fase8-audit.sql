begin;

do $$
declare
  v_negocio_id uuid;
  v_sesion_id uuid := gen_random_uuid();
  v_intento integer;
  v_producto_id uuid;
  v_limite_rechazado boolean := false;
begin
  if has_table_privilege('anon', 'public.eventos_analitica', 'select') then
    raise exception 'Fase 8: anon no debe leer eventos_analitica';
  end if;

  if not has_table_privilege('anon', 'public.eventos_analitica', 'insert') then
    raise exception 'Fase 8: anon debe poder registrar eventos';
  end if;

  if has_table_privilege('authenticated', 'public.eventos_analitica', 'update')
    or has_table_privilege('authenticated', 'public.eventos_analitica', 'delete') then
    raise exception 'Fase 8: los eventos registrados deben ser inmutables';
  end if;

  select id into v_negocio_id
  from public.negocios
  where activo = true
  order by creado_en
  limit 1;

  if v_negocio_id is null then
    raise exception 'Fase 8: se necesita un negocio activo para auditar analítica';
  end if;

  for v_intento in 1..60 loop
    insert into public.productos (negocio_id, nombre, precio, visible)
    values (v_negocio_id, 'Auditoría Fase 8 ' || v_intento, 1, true)
    returning id into v_producto_id;

    insert into public.eventos_analitica (negocio_id, tipo, sesion_id, producto_id)
    values (v_negocio_id, 'clic_producto', v_sesion_id, v_producto_id);
  end loop;

  begin
    insert into public.eventos_analitica (negocio_id, tipo, sesion_id)
    values (v_negocio_id, 'vista_catalogo', v_sesion_id);
  exception
    when raise_exception then
      if sqlerrm <> 'Límite de eventos alcanzado para esta sesión.' then
        raise;
      end if;
      v_limite_rechazado := true;
  end;

  if not v_limite_rechazado then
    raise exception 'Fase 8: el evento 61 no fue rechazado';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'eventos_analitica'
      and indexname = 'idx_analitica_evento_sesion'
  ) then
    raise exception 'Fase 8: falta el índice único por sesión';
  end if;
end
$$;

select 'Auditoría de Fase 8 aprobada.' as resultado;

rollback;
