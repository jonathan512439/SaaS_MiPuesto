-- Registro de cada llamada al modelo, para poder medir contra los límites reales.
--
-- Google **no devuelve cabeceras de cuota**: se comprobó contra la API y la
-- respuesta no trae ni `x-ratelimit-remaining` ni equivalente. Tampoco hay un
-- endpoint público que diga cuánto queda del nivel gratuito.
--
-- Así que se mide de este lado, y el número es exacto por una razón concreta:
-- **el Worker es el único que usa esa clave**. Lo único que este registro no ve
-- son las pruebas que el dueño haga directamente en AI Studio, que consumen la
-- misma cuota del proyecto sin pasar por acá.
--
-- Se guarda una fila por llamada, con su hora y sus tokens, porque los límites
-- de Google son por ventana: pedidos por minuto, pedidos por día y tokens por
-- minuto. Un contador acumulado no puede responder «cuántas van en el último
-- minuto»; una fila con hora, sí.

create table public.llamadas_ia (
  id bigint generated always as identity primary key,
  negocio_id uuid references public.negocios (id) on delete set null,
  herramienta text not null check (herramienta in ('producto', 'lista')),
  tokens integer not null default 0 check (tokens >= 0),
  exito boolean not null,
  creado_en timestamptz not null default now()
);

comment on table public.llamadas_ia is
  'Una fila por llamada al modelo. Sirve para medir contra los límites por minuto y por día del nivel gratuito.';

-- Todas las consultas son «lo que pasó desde tal momento», así que el índice va
-- por fecha descendente y no por negocio.
create index idx_llamadas_ia_creado_en on public.llamadas_ia (creado_en desc);

alter table public.llamadas_ia enable row level security;
revoke all on table public.llamadas_ia from anon, authenticated;
grant select, insert, delete on table public.llamadas_ia to service_role;

-- Los intentos fallidos también cuentan: Google descuenta el pedido aunque la
-- respuesta no sirva, y un medidor que solo cuenta los éxitos miente justo
-- cuando más importa.
create or replace function public.registrar_llamada_ia(
  p_negocio_id uuid,
  p_herramienta text,
  p_tokens integer,
  p_exito boolean
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.llamadas_ia (negocio_id, herramienta, tokens, exito)
  values (p_negocio_id, p_herramienta, greatest(0, coalesce(p_tokens, 0)), p_exito);
$$;

revoke all on function public.registrar_llamada_ia(uuid, text, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.registrar_llamada_ia(uuid, text, integer, boolean) to service_role;

-- Las ventanas que Google usa para limitar, medidas de una sola pasada.
--
-- El día de cuota se cuenta en hora del Pacífico y no en hora de Bolivia: es
-- ahí donde Google reinicia el contador diario. Confundirlos hace esperar la
-- medianoche equivocada, y son cuatro horas de diferencia en las que el sistema
-- sigue rechazando.
create or replace function private.calcular_uso_ia()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'minuto', (
      select jsonb_build_object(
        'llamadas', count(*),
        'tokens', coalesce(sum(tokens), 0)
      )
      from public.llamadas_ia
      where creado_en > now() - interval '1 minute'
    ),
    'hora', (
      select jsonb_build_object(
        'llamadas', count(*),
        'tokens', coalesce(sum(tokens), 0)
      )
      from public.llamadas_ia
      where creado_en > now() - interval '1 hour'
    ),
    'dia_cuota', (
      select jsonb_build_object(
        'llamadas', count(*),
        'tokens', coalesce(sum(tokens), 0)
      )
      from public.llamadas_ia
      where (creado_en at time zone 'America/Los_Angeles')::date
            = (now() at time zone 'America/Los_Angeles')::date
    ),
    'dia_bolivia', (
      select jsonb_build_object(
        'llamadas', count(*),
        'tokens', coalesce(sum(tokens), 0)
      )
      from public.llamadas_ia
      where (creado_en at time zone 'America/La_Paz')::date
            = (now() at time zone 'America/La_Paz')::date
    ),
    'fallidas_hoy', (
      select count(*)
      from public.llamadas_ia
      where exito = false
        and (creado_en at time zone 'America/Los_Angeles')::date
            = (now() at time zone 'America/Los_Angeles')::date
    ),
    'por_herramienta', (
      select coalesce(jsonb_object_agg(herramienta, cantidad), '{}'::jsonb)
      from (
        select herramienta, count(*) as cantidad
        from public.llamadas_ia
        where (creado_en at time zone 'America/Los_Angeles')::date
              = (now() at time zone 'America/Los_Angeles')::date
        group by herramienta
      ) as resumen
    ),
    'ultima', (
      select max(creado_en) from public.llamadas_ia
    ),
    'reinicio_dia_cuota', (
      (((now() at time zone 'America/Los_Angeles')::date + 1)::timestamp
        at time zone 'America/Los_Angeles')
    ),
    'medido_en', now()
  );
$$;

revoke all on function private.calcular_uso_ia() from public, anon, authenticated;
grant execute on function private.calcular_uso_ia() to service_role;

create or replace function public.uso_ia()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.exigir_admin_plataforma();
  return private.calcular_uso_ia();
end;
$$;

revoke all on function public.uso_ia() from public, anon;
grant execute on function public.uso_ia() to authenticated;

create or replace function public.uso_ia_servicio()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select private.calcular_uso_ia();
$$;

revoke all on function public.uso_ia_servicio() from public, anon, authenticated;
grant execute on function public.uso_ia_servicio() to service_role;
