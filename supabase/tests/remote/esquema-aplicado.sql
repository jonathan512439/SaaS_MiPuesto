-- La última migración aplicada, que `/api/salud` informa al despliegue.
--
-- Corre SOLO contra la base de ensayo:
--   npm run test:esquema:ensayo
--
-- Comprueba que devuelve la versión más alta de la historia de migraciones y
-- que solo la clave de servicio puede llamarla.

do $prueba$
declare
  v_esperada text;
  v_obtenida text;
begin
  select max(version) into v_esperada from supabase_migrations.schema_migrations;
  if v_esperada is null then
    raise exception 'FALLO: la base de ensayo no tiene historia de migraciones.';
  end if;

  v_obtenida := public.esquema_aplicado();
  if v_obtenida is distinct from v_esperada then
    raise exception 'FALLO: devolvió % y la última es %', v_obtenida, v_esperada;
  end if;

  if v_obtenida < '20261106090000' then
    raise exception 'FALLO: devolvió %, anterior a la migración que la crea.', v_obtenida;
  end if;

  if has_function_privilege('anon', 'public.esquema_aplicado()', 'execute') then
    raise exception 'FALLO: la clave pública puede llamarla.';
  end if;
  if has_function_privilege('authenticated', 'public.esquema_aplicado()', 'execute') then
    raise exception 'FALLO: un usuario con sesión puede llamarla.';
  end if;
  if not has_function_privilege('service_role', 'public.esquema_aplicado()', 'execute') then
    raise exception 'FALLO: la clave de servicio no puede llamarla.';
  end if;

  raise notice 'esquema aplicado: % — todo en verde', v_obtenida;
end
$prueba$;
