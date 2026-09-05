-- Fase 13: administración de la plataforma.
--
-- `SECURITY.md` dice no construir un panel de super-admin en las primeras fases
-- y usar la consola de Supabase hasta que administrar a mano duela. Ya duele: el
-- alta de un cliente exige correr un script desde la máquina del vendedor con la
-- clave privilegiada, y eso no escala ni se puede hacer desde un celular.
--
-- La decisión de diseño que importa: **este panel no usa la clave de servicio**.
-- Meterla detrás de una pantalla con botones la convierte en modo dios a un clic
-- de distancia, y un fallo de autorización expondría las bases de todos los
-- clientes. En su lugar hay una tabla de administradores, políticas de RLS que
-- la consultan y funciones acotadas para lo que necesita más permiso que leer.

create table public.plataforma_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nota text,
  creado_en timestamptz not null default now()
);

comment on table public.plataforma_admins is
  'Quién puede administrar la plataforma. Se llena desde la consola de Supabase, nunca desde la aplicación.';

alter table public.plataforma_admins enable row level security;

/* Nadie lee ni escribe esta tabla desde la aplicación: darla de alta es un acto
   deliberado en la consola. Sin políticas, RLS la deja cerrada para `anon` y
   `authenticated`, que es exactamente lo que se busca. */
revoke all on table public.plataforma_admins from anon, authenticated;

/* `stable` y no `volatile` para que el planificador la evalúe una vez por
   consulta en vez de una vez por fila. */
create or replace function public.es_admin_plataforma()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.plataforma_admins
    where user_id = (select auth.uid())
  );
$$;

comment on function public.es_admin_plataforma() is
  'Si quien consulta administra la plataforma. Definer porque plataforma_admins está cerrada a los roles de la aplicación.';

grant execute on function public.es_admin_plataforma() to authenticated;

-- Bitácora. Toda acción del panel queda registrada: es lo que permite responder
-- «quién bajó este catálogo y cuándo» sin depender de la memoria de nadie.
create table public.bitacora_plataforma (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null references auth.users(id) on delete restrict,
  accion text not null,
  negocio_id uuid references public.negocios(id) on delete set null,
  detalle jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

comment on table public.bitacora_plataforma is
  'Qué hizo cada administrador de la plataforma. Solo se escribe desde las funciones del panel; nadie la edita.';

create index idx_bitacora_plataforma_fecha
  on public.bitacora_plataforma (creado_en desc);

alter table public.bitacora_plataforma enable row level security;

revoke all on table public.bitacora_plataforma from anon, authenticated;
grant select on table public.bitacora_plataforma to authenticated;

create policy "bitacora_la_lee_la_plataforma"
on public.bitacora_plataforma for select to authenticated
using (public.es_admin_plataforma());

-- Un administrador de plataforma ve todos los negocios. Es una política
-- adicional: la existente sigue dejando que cada dueño vea el suyo, y Postgres
-- combina las permisivas con «o». Nadie pierde acceso por esto.
create policy "plataforma_lee_negocios"
on public.negocios for select to authenticated
using (public.es_admin_plataforma());

-- Lo mismo para leer los pedidos, que es lo que permite ver si un negocio está
-- usando el sistema antes de decidir qué hacer con su cuenta.
create policy "plataforma_lee_pedidos"
on public.pedidos for select to authenticated
using (public.es_admin_plataforma());
