-- La analítica se podía inundar.
--
-- El tope de sesenta eventos por hora era **por sesión**, y la sesión la elige
-- el navegador: bastaba un bucle rotando UUID para escribir filas sin fin. Se
-- comprobó contra producción —diez eventos desde una sola IP, los diez
-- aceptados— antes de escribir esta migración.
--
-- El costo no era teórico: filas sin límite en una base con cuota, y unas
-- estadísticas envenenadas que son justamente las que el dueño mira para
-- decidir qué reponer.
--
-- La solución es la misma que ya protegía los pedidos: contar por huella de IP.
-- Y como la huella solo vale si el cliente no puede elegirla, el registro deja
-- de estar abierto a `anon` y pasa por una función que solo puede llamar el
-- servidor, que es quien ve la IP de verdad.

create table public.limites_analitica_ip (
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  huella_ip text not null check (huella_ip ~ '^[0-9a-f]{64}$'),
  ventana_inicio timestamptz not null default now(),
  cantidad integer not null default 1 check (cantidad >= 1),
  primary key (negocio_id, huella_ip)
);

comment on table public.limites_analitica_ip is
  'Conteo de eventos de analítica por IP y negocio, en ventanas de 15 minutos.';

-- Sin políticas: nadie la lee ni la escribe salvo la función definer.
alter table public.limites_analitica_ip enable row level security;
revoke all on table public.limites_analitica_ip from anon, authenticated;

-- Trescientos en quince minutos: una casa o una oficina enteras detrás de una
-- sola salida a internet generan muchos eventos legítimos, y cortarles la
-- medición sería peor que el problema. Lo que se acota es el bucle, no la
-- familia.
create or replace function public.registrar_evento_analitica(
  p_negocio_id uuid,
  p_sesion_id uuid,
  p_tipo text,
  p_producto_id uuid,
  p_huella_ip text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cantidad integer;
begin
  if p_huella_ip is null or p_huella_ip !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  if not exists (
    select 1 from public.negocios
    where id = p_negocio_id and activo = true
  ) then
    return false;
  end if;

  -- Un producto en la papelera conserva `visible = true`: la política anterior
  -- lo aceptaba, y así se contaban vistas de algo que el dueño ya borró.
  if p_producto_id is not null and not exists (
    select 1 from public.productos
    where id = p_producto_id
      and negocio_id = p_negocio_id
      and visible = true
      and eliminado_en is null
  ) then
    return false;
  end if;

  insert into public.limites_analitica_ip as limite (
    negocio_id, huella_ip, ventana_inicio, cantidad
  ) values (
    p_negocio_id, p_huella_ip, now(), 1
  )
  on conflict (negocio_id, huella_ip) do update
  set
    ventana_inicio = case
      when limite.ventana_inicio <= now() - interval '15 minutes' then now()
      else limite.ventana_inicio
    end,
    cantidad = case
      when limite.ventana_inicio <= now() - interval '15 minutes' then 1
      else limite.cantidad + 1
    end
  returning cantidad into v_cantidad;

  if v_cantidad > 300 then
    return false;
  end if;

  -- El índice único ya evita repetir el mismo evento de la misma sesión, y el
  -- disparador por sesión sigue en pie: este control se suma, no reemplaza.
  insert into public.eventos_analitica (negocio_id, producto_id, sesion_id, tipo)
  values (p_negocio_id, p_producto_id, p_sesion_id, p_tipo)
  on conflict do nothing;

  return true;
exception
  -- El tope por sesión levanta P0001. Que un evento no entre nunca puede
  -- romperle la página a nadie: la analítica es lo último que debe fallar
  -- ruidosamente.
  when others then
    return false;
end;
$$;

revoke all on function public.registrar_evento_analitica(uuid, uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.registrar_evento_analitica(uuid, uuid, text, uuid, text)
  to service_role;

-- La puerta directa se cierra. Mientras `anon` pudiera insertar por su cuenta,
-- el límite por IP era decorativo: bastaba con no pasar por nuestra ruta.
revoke insert on table public.eventos_analitica from anon;
revoke insert on table public.eventos_analitica from authenticated;

drop policy if exists "registra_eventos_publicos" on public.eventos_analitica;

-- Las filas de conteo no valen nada pasada su ventana, y viven en la misma
-- tarea que ya limpia la analítica vieja.
create or replace function public.purgar_analitica_vieja(p_dias integer default 90)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_borrados integer;
begin
  delete from public.eventos_analitica
  where creado_en < now() - make_interval(days => p_dias);

  get diagnostics v_borrados = row_count;

  delete from public.limites_analitica_ip
  where ventana_inicio < now() - interval '1 day';

  return v_borrados;
end;
$$;

revoke all on function public.purgar_analitica_vieja(integer) from public, anon, authenticated;
