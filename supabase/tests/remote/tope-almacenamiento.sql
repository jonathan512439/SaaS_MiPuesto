-- El tope de espacio por negocio, probado como lo vive el dueño.
--
-- Corre SOLO contra la base de ensayo, porque escribe filas:
--   npm run test:almacenamiento:ensayo
--
-- Un único bloque que deshace todo: termina con una excepción que el bloque de
-- afuera atrapa. Las filas de `storage.objects` que crea son solo registros,
-- sin archivo detrás, y desaparecen con la transacción.

do $prueba$
declare
  v_negocio uuid;
  v_duenio uuid;
  v_ajeno uuid;
  v_uso bigint;
begin
  begin
    select id, admin_user_id into v_negocio, v_duenio
    from public.negocios where activo order by creado_en limit 1;
    select id into v_ajeno from public.negocios where id <> v_negocio order by creado_en limit 1;
    if v_ajeno is null then
      raise exception 'FALLO: la base de ensayo necesita al menos dos negocios.';
    end if;

    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', v_duenio, 'role', 'authenticated')::text,
      true
    );
    set local role authenticated;

    -- 1. El dueño ve cuánto ocupa lo suyo, y no lo de otro.
    v_uso := public.uso_almacenamiento_negocio(v_negocio::text);
    if v_uso is null or v_uso < 0 then
      raise exception 'FALLO: el dueño no puede ver cuánto ocupa su negocio.';
    end if;
    if public.uso_almacenamiento_negocio(v_ajeno::text) is not null then
      raise exception 'FALLO: un dueño puede ver cuánto ocupa un negocio ajeno.';
    end if;

    -- 2. Con espacio, una foto entra.
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('productos', v_negocio || '/prueba-tope/una.webp', v_duenio, jsonb_build_object('size', 1000));

    -- 3. Se llena el negocio —como la base, sin pasar por la regla— y la
    --    siguiente foto se rechaza, en los dos depósitos.
    reset role;
    insert into storage.objects (bucket_id, name, owner, metadata)
    values (
      'productos', v_negocio || '/prueba-tope/grande.webp', v_duenio,
      jsonb_build_object('size', public.tope_almacenamiento_negocio())
    );
    set local role authenticated;

    begin
      insert into storage.objects (bucket_id, name, owner, metadata)
      values ('productos', v_negocio || '/prueba-tope/otra.webp', v_duenio, jsonb_build_object('size', 1000));
      raise exception 'FALLO: con el negocio lleno se aceptó otra foto de producto.';
    exception
      when insufficient_privilege then null;
    end;

    begin
      insert into storage.objects (bucket_id, name, owner, metadata)
      values ('negocios', v_negocio || '/logo/nuevo.webp', v_duenio, jsonb_build_object('size', 1000));
      raise exception 'FALLO: con el negocio lleno se aceptó un logo nuevo.';
    exception
      when insufficient_privilege then null;
    end;

    -- 4. Liberar espacio lo devuelve: con la grande achicada, vuelve a entrar.
    --    (Supabase no deja borrar filas de Storage desde SQL; achicarla prueba
    --    lo mismo: la regla mide lo que hay.)
    reset role;
    update storage.objects set metadata = jsonb_build_object('size', 1000)
    where bucket_id = 'productos' and name = v_negocio || '/prueba-tope/grande.webp';
    set local role authenticated;
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('productos', v_negocio || '/prueba-tope/despues.webp', v_duenio, jsonb_build_object('size', 1000));

    reset role;
    raise exception 'TOPE_TODO_EN_VERDE';
  exception
    when raise_exception then
      if sqlerrm <> 'TOPE_TODO_EN_VERDE' then raise; end if;
  end;
end;
$prueba$;
