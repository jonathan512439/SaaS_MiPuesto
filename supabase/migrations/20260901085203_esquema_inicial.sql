create table public.negocios (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete restrict not null,
  slug text unique not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  nombre text not null,
  descripcion text,
  tipo_negocio text not null check (
    tipo_negocio in ('catalogo_estatico', 'catalogo_cta', 'tienda_virtual')
  ),
  logo_url text,
  portada_url text,
  telefono_whatsapp text not null,
  redes_sociales jsonb not null default '{}'::jsonb,
  horario jsonb not null default '{}'::jsonb,
  qr_pago_url text,
  plantilla_id text not null default 'clasica' check (
    plantilla_id in ('clasica', 'moderna', 'minimal')
  ),
  reserva_minutos integer not null default 45 check (reserva_minutos between 5 and 1440),
  verificado boolean not null default false,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  nombre text not null,
  orden integer not null default 0
);

create table public.subcategorias (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  nombre text not null,
  orden integer not null default 0
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete set null,
  subcategoria_id uuid references public.subcategorias(id) on delete set null,
  nombre text not null,
  descripcion text,
  precio numeric(10, 2) not null check (precio >= 0),
  fotos text[] not null default '{}',
  controla_stock boolean not null default false,
  cantidad_stock integer check (cantidad_stock is null or cantidad_stock >= 0),
  visible boolean not null default true,
  estado text not null default 'disponible' check (
    estado in ('disponible', 'reservado', 'vendido', 'agotado')
  ),
  reservado_hasta timestamptz,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  check (cardinality(fotos) <= 4)
);

create table public.promociones (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  tipo text not null check (tipo in ('porcentaje', 'monto_fijo')),
  valor numeric(10, 2) not null check (valor > 0),
  producto_id uuid references public.productos(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete cascade,
  fecha_inicio timestamptz,
  fecha_fin timestamptz,
  activo boolean not null default true,
  check (num_nonnulls(producto_id, categoria_id) = 1),
  check (tipo <> 'porcentaje' or valor <= 100),
  check (fecha_fin is null or fecha_inicio is null or fecha_fin > fecha_inicio)
);

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  cliente_nombre text,
  cliente_telefono text,
  items jsonb not null,
  total numeric(10, 2) not null check (total >= 0),
  estado text not null default 'pendiente' check (
    estado in ('pendiente', 'confirmado', 'cancelado', 'expirado')
  ),
  creado_en timestamptz not null default now(),
  expira_en timestamptz
);

create table public.eventos_analitica (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  tipo text not null check (tipo in ('vista_catalogo', 'clic_whatsapp', 'clic_producto')),
  producto_id uuid references public.productos(id) on delete set null,
  creado_en timestamptz not null default now()
);

create index idx_categorias_negocio on public.categorias(negocio_id);
create index idx_subcategorias_categoria on public.subcategorias(categoria_id);
create index idx_productos_negocio on public.productos(negocio_id);
create index idx_promociones_negocio on public.promociones(negocio_id);
create index idx_pedidos_negocio on public.pedidos(negocio_id);
create index idx_pedidos_pendientes on public.pedidos(estado, expira_en)
  where estado = 'pendiente';
create index idx_analitica_negocio_fecha on public.eventos_analitica(negocio_id, creado_en);

alter table public.negocios enable row level security;
alter table public.categorias enable row level security;
alter table public.subcategorias enable row level security;
alter table public.productos enable row level security;
alter table public.promociones enable row level security;
alter table public.pedidos enable row level security;
alter table public.eventos_analitica enable row level security;

create policy "negocios_publicos_activos"
on public.negocios for select to anon
using (activo = true);

create policy "administra_negocio_propio"
on public.negocios for all to authenticated
using ((select auth.uid()) = admin_user_id)
with check ((select auth.uid()) = admin_user_id);

create policy "categorias_publicas_activas"
on public.categorias for select to anon
using (
  exists (
    select 1 from public.negocios
    where negocios.id = categorias.negocio_id and negocios.activo = true
  )
);

create policy "administra_categorias_propias"
on public.categorias for all to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = categorias.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.negocios
    where negocios.id = categorias.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

create policy "subcategorias_publicas_activas"
on public.subcategorias for select to anon
using (
  exists (
    select 1
    from public.categorias
    join public.negocios on negocios.id = categorias.negocio_id
    where categorias.id = subcategorias.categoria_id and negocios.activo = true
  )
);

create policy "administra_subcategorias_propias"
on public.subcategorias for all to authenticated
using (
  exists (
    select 1
    from public.categorias
    join public.negocios on negocios.id = categorias.negocio_id
    where categorias.id = subcategorias.categoria_id
      and negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.categorias
    join public.negocios on negocios.id = categorias.negocio_id
    where categorias.id = subcategorias.categoria_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

create policy "productos_publicos_visibles"
on public.productos for select to anon
using (
  visible = true
  and exists (
    select 1 from public.negocios
    where negocios.id = productos.negocio_id and negocios.activo = true
  )
);

create policy "administra_productos_propios"
on public.productos for all to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = productos.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.negocios
    where negocios.id = productos.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

create policy "promociones_publicas_vigentes"
on public.promociones for select to anon
using (
  activo = true
  and (fecha_inicio is null or fecha_inicio <= now())
  and (fecha_fin is null or fecha_fin > now())
  and exists (
    select 1 from public.negocios
    where negocios.id = promociones.negocio_id and negocios.activo = true
  )
);

create policy "administra_promociones_propias"
on public.promociones for all to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = promociones.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.negocios
    where negocios.id = promociones.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

create policy "administra_pedidos_propios"
on public.pedidos for all to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = pedidos.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.negocios
    where negocios.id = pedidos.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

create policy "registra_eventos_publicos"
on public.eventos_analitica for insert to anon
with check (
  exists (
    select 1 from public.negocios
    where negocios.id = eventos_analitica.negocio_id and negocios.activo = true
  )
  and (
    producto_id is null
    or exists (
      select 1 from public.productos
      where productos.id = eventos_analitica.producto_id
        and productos.negocio_id = eventos_analitica.negocio_id
        and productos.visible = true
    )
  )
);

create policy "administra_analitica_propia"
on public.eventos_analitica for all to authenticated
using (
  exists (
    select 1 from public.negocios
    where negocios.id = eventos_analitica.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.negocios
    where negocios.id = eventos_analitica.negocio_id
      and negocios.admin_user_id = (select auth.uid())
  )
);

revoke all on table public.negocios from anon, authenticated;
revoke all on table public.categorias from anon, authenticated;
revoke all on table public.subcategorias from anon, authenticated;
revoke all on table public.productos from anon, authenticated;
revoke all on table public.promociones from anon, authenticated;
revoke all on table public.pedidos from anon, authenticated;
revoke all on table public.eventos_analitica from anon, authenticated;

grant select (
  id, slug, nombre, descripcion, tipo_negocio, logo_url, portada_url,
  telefono_whatsapp, redes_sociales, horario, qr_pago_url, plantilla_id,
  reserva_minutos, verificado, activo, creado_en
) on table public.negocios to anon;
grant select on table public.categorias to anon;
grant select on table public.subcategorias to anon;
grant select on table public.productos to anon;
grant select on table public.promociones to anon;
grant insert on table public.eventos_analitica to anon;

grant select, insert, update, delete on table public.negocios to authenticated;
grant select, insert, update, delete on table public.categorias to authenticated;
grant select, insert, update, delete on table public.subcategorias to authenticated;
grant select, insert, update, delete on table public.productos to authenticated;
grant select, insert, update, delete on table public.promociones to authenticated;
grant select, insert, update, delete on table public.pedidos to authenticated;
grant select, insert, update, delete on table public.eventos_analitica to authenticated;
