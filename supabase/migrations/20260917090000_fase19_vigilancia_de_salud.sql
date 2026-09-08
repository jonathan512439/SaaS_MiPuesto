-- Vigilancia de salud del sitio.
--
-- El problema que resuelve: `/api/salud` existe desde hace tiempo y nadie la
-- mira. Una caída un domingo se descubre cuando escribe un cliente.
--
-- **El vigilante vive en Supabase y no en Cloudflare a propósito.** Lo que
-- vigila corre en Cloudflare, y algo que se apaga junto con lo que vigila no
-- vigila nada. Desde acá, si el Worker deja de responder, el reloj de la base
-- sigue andando y lo nota.
--
-- El límite es honesto y conviene escribirlo: si Supabase entero se cae, este
-- vigilante se cae con él y no avisa nada. No se vigila desde GitHub cada pocos
-- minutos porque el repositorio es privado —dos mil minutos al mes, y una
-- comprobación cada diez minutos gasta cuatro mil—, así que de allá viene solo
-- una comprobación diaria como red de último recurso.

-- Se elige `http` y no `pg_net` porque es **síncrono**: pide y devuelve la
-- respuesta en la misma llamada. `pg_net` contesta con un número de pedido y la
-- respuesta aparece después en otra tabla, lo que obligaría a partir esto en dos
-- tareas que se hablan por una tabla intermedia para no ganar nada.
create schema if not exists private;
create extension if not exists http with schema extensions;

-- **Sobre el permiso de esta extensión, y lo que no se pudo hacer.**
--
-- `create extension` deja `http_get` ejecutable por PUBLIC, o sea también por
-- `anon` y `authenticated`. La primera versión de esta migración traía un bucle
-- que revocaba ese permiso función por función. **No servía de nada**, y se
-- descubrió porque la prueba de la fase lo comprobó y salió en rojo: en Supabase
-- la extensión la posee `supabase_admin`, las migraciones corren como
-- `postgres`, y un rol solo puede revocar lo que él mismo otorgó. El bucle
-- corría sin error y sin efecto, que es la peor forma de un control de
-- seguridad: la que tranquiliza.
--
-- Se quitó en vez de dejarlo. Un control que no controla es peor que ninguno.
--
-- La contención real es otra y está comprobada contra la API pública: PostgREST
-- expone solo `public` y `graphql_public`, así que una llamada a
-- `extensions.http_get` con la clave del navegador recibe «Invalid schema». Para
-- llegar a esta función hay que tener una conexión directa a la base, que exige
-- la contraseña del servidor y no la clave pública.
--
-- Lo que sí se puede vigilar desde acá, y vigila la prueba de la fase, es que
-- nadie envuelva esto en una función de `public`: ahí sí quedaría al alcance de
-- cualquiera con la clave del navegador.

create table if not exists public.vigilancia_salud (
  id bigint generated always as identity primary key,
  medido_en timestamptz not null default now(),
  sano boolean not null,
  -- El estado que devolvió la ruta —`ok`, `sin_base`, `tareas_atrasadas`— o el
  -- motivo por el que no se pudo preguntar. Se guarda el texto y no un número
  -- porque lo que se lee después es «qué pasó», no «cuánto».
  estado text not null,
  http integer,
  latencia_ms integer
);

comment on table public.vigilancia_salud is
  'Cada comprobación de /api/salud, hecha por la tarea mipuesto-vigilar-salud.';

-- Se lee siempre por fecha descendente: la pregunta es «cómo viene ahora», no
-- «qué pasó el 3 de marzo».
create index if not exists vigilancia_salud_medido_en_idx
  on public.vigilancia_salud (medido_en desc);

alter table public.vigilancia_salud enable row level security;

-- Solo quien administra la plataforma. No hay datos de nadie acá, pero decir en
-- público a qué hora se cae el sitio no le sirve a ningún cliente y sí a quien
-- quiera elegir el momento.
drop policy if exists "vigilancia_salud_lectura_admin" on public.vigilancia_salud;
create policy "vigilancia_salud_lectura_admin"
  on public.vigilancia_salud
  for select
  to authenticated
  using (public.es_admin_plataforma());

revoke all on public.vigilancia_salud from anon, authenticated;
grant select on public.vigilancia_salud to authenticated;

-- Dónde preguntar y a dónde avisar. En una tabla y no escrito dentro de la
-- función para poder cambiar la dirección el día que se compre el dominio sin
-- publicar una migración.
create table if not exists private.ajustes_vigilancia (
  id boolean primary key default true check (id),
  url_salud text not null,
  -- Opcional. Sin esto la caída queda anotada pero nadie se entera hasta que
  -- alguien mira el panel, que es la mitad del problema que esto resuelve.
  url_aviso text
);

revoke all on private.ajustes_vigilancia from public, anon, authenticated;

-- Anota una medición y contesta si hay que avisar.
--
-- La decisión vive acá y no dentro de la tarea por dos razones. Una: es la parte
-- que se puede probar sin salir a la red. La otra: necesita ver las mediciones
-- anteriores, que están acá.
--
-- **Avisa a la segunda falla seguida, no a la primera.** Un vigilante que grita
-- por un tropiezo de red se silencia a la semana, y un vigilante silenciado es
-- peor que ninguno porque además da tranquilidad falsa.
create or replace function public.registrar_medicion_salud(
  p_sano boolean,
  p_estado text,
  p_http integer default null,
  p_latencia_ms integer default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anterior boolean;
  v_penultima boolean;
  v_aviso text := null;
begin
  select sano into v_anterior
  from public.vigilancia_salud
  order by medido_en desc, id desc
  limit 1;

  select sano into v_penultima
  from public.vigilancia_salud
  order by medido_en desc, id desc
  offset 1
  limit 1;

  insert into public.vigilancia_salud (sano, estado, http, latencia_ms)
  values (p_sano, p_estado, p_http, p_latencia_ms);

  -- Segunda falla seguida, y la de antes estaba sana: recién ahí es una caída y
  -- no un tropiezo. Si no hay ninguna medición previa tampoco se avisa: la
  -- primera vez que corre esto, todo es «nuevo».
  if not p_sano
     and v_anterior is not null and not v_anterior
     and (v_penultima is null or v_penultima) then
    v_aviso := 'caido';
  end if;

  -- La vuelta se avisa solo si antes se avisó la caída. Anunciar que algo volvió
  -- sin haber dicho que se fue deja a quien lee buscando un mensaje que nunca
  -- existió.
  if p_sano
     and v_anterior is not null and not v_anterior
     and v_penultima is not null and not v_penultima then
    v_aviso := 'recuperado';
  end if;

  return v_aviso;
end;
$$;

revoke all on function public.registrar_medicion_salud(boolean, text, integer, integer)
  from public, anon, authenticated;

-- La tarea: pregunta, anota y avisa.
create or replace function public.vigilar_salud()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ajustes private.ajustes_vigilancia%rowtype;
  v_inicio timestamptz := clock_timestamp();
  v_respuesta extensions.http_response;
  v_sano boolean := false;
  v_estado text;
  v_http integer := null;
  v_latencia integer;
  v_aviso text;
begin
  select * into v_ajustes from private.ajustes_vigilancia where id;
  if not found then
    return 'sin_configurar';
  end if;

  -- Ocho segundos. La ruta contesta en menos de uno cuando está sana; más que
  -- esto ya es una caída para quien está mirando la pantalla, aunque el
  -- servidor termine contestando.
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '8000');

  begin
    v_respuesta := extensions.http_get(v_ajustes.url_salud);
    v_http := v_respuesta.status;
    -- Sano es doscientos **y** que el cuerpo lo diga. Un intermediario puede
    -- devolver doscientos con una página de error, y ahí el vigilante estaría
    -- mirando el semáforo equivocado.
    v_sano := v_respuesta.status = 200 and v_respuesta.content like '%"estado":"ok"%';
    v_estado := coalesce(
      substring(v_respuesta.content from '"estado":"([a-z_]+)"'),
      'respuesta_ilegible'
    );
  exception when others then
    -- Que no se pueda ni preguntar es el caso que más importa: es exactamente lo
    -- que pasa cuando el sitio no está.
    v_sano := false;
    v_estado := 'sin_respuesta';
  end;

  v_latencia := (extract(epoch from clock_timestamp() - v_inicio) * 1000)::integer;
  v_aviso := public.registrar_medicion_salud(v_sano, v_estado, v_http, v_latencia);

  if v_aviso is not null and v_ajustes.url_aviso is not null then
    begin
      perform extensions.http_post(
        v_ajustes.url_aviso,
        case v_aviso
          when 'caido' then 'MiPuesto no responde: ' || v_estado
          else 'MiPuesto volvió a responder.'
        end,
        'text/plain'
      );
    exception when others then
      -- Si el aviso no sale, la medición ya quedó anotada. Perder el mensaje es
      -- malo; perder también el registro sería quedarse sin saber qué pasó.
      null;
    end;
  end if;

  return coalesce(v_aviso, v_estado);
end;
$$;

revoke all on function public.vigilar_salud() from public, anon, authenticated;

-- Cómo viene la vigilancia, para mostrarla en el panel de plataforma.
create or replace function public.estado_vigilancia()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'ultima', (
      select jsonb_build_object(
        'medido_en', medido_en, 'sano', sano, 'estado', estado, 'latencia_ms', latencia_ms
      )
      from public.vigilancia_salud
      order by medido_en desc, id desc
      limit 1
    ),
    -- Sobre los últimos siete días, que es el plazo en el que alguien todavía se
    -- acuerda de lo que pasó y puede hacer algo al respecto.
    'mediciones_semana', (
      select count(*) from public.vigilancia_salud
      where medido_en >= now() - interval '7 days'
    ),
    'caidas_semana', (
      select count(*) from public.vigilancia_salud
      where medido_en >= now() - interval '7 days' and not sano
    )
  );
$$;

revoke all on function public.estado_vigilancia() from public, anon;
grant execute on function public.estado_vigilancia() to authenticated, service_role;

-- Un mes de historia alcanza: sirve para ver si algo se repite, y más viejo que
-- eso no cambia ninguna decisión. Sin la purga, una medición cada cinco minutos
-- deja cien mil filas al año de algo que nadie consulta.
create or replace function public.purgar_vigilancia_salud()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_borradas integer;
begin
  delete from public.vigilancia_salud
  where medido_en < now() - interval '30 days';
  get diagnostics v_borradas = row_count;
  return v_borradas;
end;
$$;

revoke all on function public.purgar_vigilancia_salud() from public, anon, authenticated;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname = 'mipuesto-vigilar-salud';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  -- Cada cinco minutos. Con el aviso a la segunda falla, una caída se anuncia
  -- dentro de los diez minutos de empezada.
  perform cron.schedule(
    'mipuesto-vigilar-salud',
    '*/5 * * * *',
    $cron$select public.vigilar_salud();$cron$
  );

  select jobid into v_job_id from cron.job where jobname = 'mipuesto-purgar-vigilancia';
  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'mipuesto-purgar-vigilancia',
    '30 4 * * *',
    $cron$select public.purgar_vigilancia_salud();$cron$
  );
end;
$$;
