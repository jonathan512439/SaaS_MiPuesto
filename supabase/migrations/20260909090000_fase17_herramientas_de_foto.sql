-- Lectura de fotos con inteligencia artificial, habilitada de a un negocio.
--
-- Es la primera función del sistema con **costo por uso**: cada foto que alguien
-- manda se paga. Por eso no se enciende para todos, sino que el dueño de
-- MiPuesto la habilita negocio por negocio, y cada uno tiene un tope mensual.
--
-- Arranca apagada para todos, incluidos los que ya existen. Nadie gasta hasta
-- que alguien decida que gaste.

alter table public.negocios
  add column foto_ia_habilitada boolean not null default false,
  add column foto_ia_habilitada_en timestamptz;

comment on column public.negocios.foto_ia_habilitada is
  'Si el negocio puede usar las herramientas de lectura de fotos. La habilita la plataforma, no el dueño.';
comment on column public.negocios.foto_ia_habilitada_en is
  'Cuándo se le habilitó. Sirve para avisarle una sola vez y para saber desde cuándo cuenta su consumo.';

-- El dueño la lee para saber si tiene la función; no la escribe. La omisión en
-- el `grant update` es lo que impide que se la habilite solo.
grant select (foto_ia_habilitada, foto_ia_habilitada_en)
  on table public.negocios to authenticated;

create table public.uso_ia_negocio (
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  mes date not null,
  cantidad integer not null default 0 check (cantidad >= 0),
  tokens bigint not null default 0,
  primary key (negocio_id, mes)
);

comment on table public.uso_ia_negocio is
  'Fotos leídas por negocio y por mes. El mes se guarda como el día 1, en hora de Bolivia.';

alter table public.uso_ia_negocio enable row level security;
revoke all on table public.uso_ia_negocio from anon, authenticated;
grant select, insert, update, delete on table public.uso_ia_negocio to service_role;

-- El dueño ve su propio consumo: sin eso, un tope que se alcanza es un error
-- inexplicable. No ve el de nadie más.
create policy "consulta_su_propio_uso"
on public.uso_ia_negocio for select to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = uso_ia_negocio.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
);
grant select on table public.uso_ia_negocio to authenticated;

-- Contar y autorizar en el mismo paso, dentro de la base: comprobar el tope en
-- el servidor y después sumar deja una ventana entre las dos cosas por la que
-- se cuelan las peticiones simultáneas. Acá es una sola operación.
create or replace function public.consumir_credito_ia(
  p_negocio_id uuid,
  p_tope integer,
  p_tokens bigint default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mes date := (date_trunc('month', (now() at time zone 'America/La_Paz')))::date;
  v_cantidad integer;
  v_habilitada boolean;
begin
  select foto_ia_habilitada into v_habilitada
  from public.negocios
  where id = p_negocio_id;

  if v_habilitada is not true then
    return jsonb_build_object('autorizado', false, 'motivo', 'no_habilitada');
  end if;

  insert into public.uso_ia_negocio as uso (negocio_id, mes, cantidad, tokens)
  values (p_negocio_id, v_mes, 1, p_tokens)
  on conflict (negocio_id, mes) do update
  set cantidad = uso.cantidad + 1,
      tokens = uso.tokens + p_tokens
  returning cantidad into v_cantidad;

  if v_cantidad > p_tope then
    return jsonb_build_object(
      'autorizado', false,
      'motivo', 'tope_alcanzado',
      'usadas', v_cantidad,
      'tope', p_tope
    );
  end if;

  return jsonb_build_object('autorizado', true, 'usadas', v_cantidad, 'tope', p_tope);
end;
$$;

revoke all on function public.consumir_credito_ia(uuid, integer, bigint)
  from public, anon, authenticated;
grant execute on function public.consumir_credito_ia(uuid, integer, bigint) to service_role;

-- Habilitar y deshabilitar, solo desde la plataforma y siempre en la bitácora.
create or replace function public.admin_cambiar_foto_ia(
  p_negocio_id uuid,
  p_habilitada boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := private.exigir_admin_plataforma();
  v_negocio public.negocios%rowtype;
begin
  update public.negocios
  set
    foto_ia_habilitada = p_habilitada,
    /* Se anota la fecha solo al encender, y no se borra al apagar: sirve para
       saber si al dueño ya se le avisó alguna vez. */
    foto_ia_habilitada_en = case
      when p_habilitada then coalesce(foto_ia_habilitada_en, now())
      else foto_ia_habilitada_en
    end
  where id = p_negocio_id
  returning * into v_negocio;

  if not found then
    raise exception using errcode = 'P0001', message = 'NEGOCIO_NO_ENCONTRADO';
  end if;

  insert into public.bitacora_plataforma (actor_user_id, negocio_id, accion, detalle)
  values (
    v_actor,
    p_negocio_id,
    case when p_habilitada then 'foto_ia_habilitada' else 'foto_ia_deshabilitada' end,
    jsonb_build_object('nombre', v_negocio.nombre)
  );

  return jsonb_build_object(
    'negocio_id', v_negocio.id,
    'foto_ia_habilitada', v_negocio.foto_ia_habilitada,
    'foto_ia_habilitada_en', v_negocio.foto_ia_habilitada_en
  );
end;
$$;

revoke all on function public.admin_cambiar_foto_ia(uuid, boolean) from public, anon;
grant execute on function public.admin_cambiar_foto_ia(uuid, boolean) to authenticated;
