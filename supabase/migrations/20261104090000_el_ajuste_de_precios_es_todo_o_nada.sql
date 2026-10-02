-- El ajuste masivo de precios: todo o nada, y nunca dos veces.
--
-- La ruta actualizaba producto por producto y sin transacción. Si se cortaba
-- tras 80 de 300, esos 80 quedaban con el precio nuevo y el aviso decía «Vuelve
-- a intentarlo», que les aplicaba el porcentaje otra vez: cobrar de más por un
-- corte de red. Lo encontró la auditoría del 2026-09-30.
--
-- El cálculo sigue en el código (`aplicarPorcentaje`, en
-- `lib/catalogo/precios-lote.ts`): la ruta manda la lista de cambios —«este
-- producto, de este precio a este otro»— con un identificador del intento, y
-- esta función los aplica en una transacción:
--
-- - Todos o ninguno: si uno viola una regla de la base, no cambia nada.
-- - El mismo intento dos veces no ajusta de nuevo: devuelve lo de la primera.
-- - Un producto cuyo precio ya no es el esperado se salta: alguien lo cambió
--   entre que se leyó y se ajustó.
-- - El negocio sale de la sesión, no de lo que manda el navegador.
--
-- El disparador que guarda el precio anterior es por fila y sigue funcionando:
-- un `update` de muchas filas lo dispara en cada una. Probada en ensayo con
-- `supabase/tests/remote/ajuste-de-precios.sql`.

create table public.ajustes_de_precios (
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  idempotencia uuid not null,
  porcentaje numeric(4, 1) not null,
  ajustados integer not null check (ajustados >= 0),
  creado_en timestamptz not null default now(),
  primary key (negocio_id, idempotencia)
);

comment on table public.ajustes_de_precios is
  'Cada ajuste masivo aplicado, por su identificador de intento: es lo que impide aplicar dos veces el mismo.';

alter table public.ajustes_de_precios enable row level security;

-- El dueño ve los ajustes de su negocio. Nadie escribe directo: solo la
-- función, que corre con sus propios permisos.
create policy "ajustes_de_precios_lectura_del_duenio" on public.ajustes_de_precios
  for select to authenticated
  using (
    negocio_id in (
      select negocio.id from public.negocios as negocio
      where negocio.admin_user_id = (select auth.uid())
    )
  );

revoke all on table public.ajustes_de_precios from public, anon, authenticated;
grant select on table public.ajustes_de_precios to authenticated;
grant all on table public.ajustes_de_precios to service_role;

create or replace function public.aplicar_ajuste_de_precios(
  p_idempotencia uuid,
  p_porcentaje numeric,
  p_cambios jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_negocio uuid;
  v_ajustados integer;
begin
  if p_idempotencia is null
     or p_cambios is null
     or jsonb_typeof(p_cambios) <> 'array'
     or jsonb_array_length(p_cambios) > 1000 then
    raise exception using errcode = 'P0001', message = 'AJUSTE_INVALIDO';
  end if;

  select negocio.id into v_negocio
  from public.negocios as negocio
  where negocio.admin_user_id = (select auth.uid());
  if v_negocio is null then
    raise exception using errcode = 'P0001', message = 'NEGOCIO_NO_ENCONTRADO';
  end if;

  -- Dos ajustes del mismo negocio al mismo tiempo van en fila: el segundo ve
  -- los precios que dejó el primero, y su lista de precios esperados ya no
  -- coincide, así que no ajusta sobre lo ajustado.
  perform pg_advisory_xact_lock(hashtext('ajuste_de_precios:' || v_negocio::text));

  select ajuste.ajustados into v_ajustados
  from public.ajustes_de_precios as ajuste
  where ajuste.negocio_id = v_negocio and ajuste.idempotencia = p_idempotencia;
  if found then
    return v_ajustados;
  end if;

  update public.productos as producto
  set precio = cambio.precio_nuevo
  from jsonb_to_recordset(p_cambios) as cambio(id uuid, precio_actual numeric, precio_nuevo numeric)
  where producto.id = cambio.id
    and producto.negocio_id = v_negocio
    and producto.eliminado_en is null
    and producto.precio = cambio.precio_actual
    and cambio.precio_nuevo is distinct from cambio.precio_actual;
  get diagnostics v_ajustados = row_count;

  insert into public.ajustes_de_precios (negocio_id, idempotencia, porcentaje, ajustados)
  values (v_negocio, p_idempotencia, p_porcentaje, v_ajustados);

  return v_ajustados;
end;
$$;

revoke all on function public.aplicar_ajuste_de_precios(uuid, numeric, jsonb) from public, anon;
grant execute on function public.aplicar_ajuste_de_precios(uuid, numeric, jsonb) to authenticated, service_role;
