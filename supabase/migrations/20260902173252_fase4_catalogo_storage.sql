do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'categorias_nombre_valido_check'
      and conrelid = 'public.categorias'::regclass
  ) then
    alter table public.categorias
      add constraint categorias_nombre_valido_check
      check (char_length(btrim(nombre)) between 1 and 80);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'subcategorias_nombre_valido_check'
      and conrelid = 'public.subcategorias'::regclass
  ) then
    alter table public.subcategorias
      add constraint subcategorias_nombre_valido_check
      check (char_length(btrim(nombre)) between 1 and 80);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'productos_contenido_valido_check'
      and conrelid = 'public.productos'::regclass
  ) then
    alter table public.productos
      add constraint productos_contenido_valido_check
      check (
        char_length(btrim(nombre)) between 1 and 120
        and (descripcion is null or char_length(descripcion) <= 1000)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'productos_stock_coherente_check'
      and conrelid = 'public.productos'::regclass
  ) then
    alter table public.productos
      add constraint productos_stock_coherente_check
      check (
        (controla_stock = true and cantidad_stock is not null)
        or (controla_stock = false and cantidad_stock is null)
      );
  end if;
end
$$;

create index if not exists idx_categorias_negocio_orden
  on public.categorias (negocio_id, orden, nombre);

create index if not exists idx_subcategorias_categoria_orden
  on public.subcategorias (categoria_id, orden, nombre);

create index if not exists idx_productos_negocio_visible_orden
  on public.productos (negocio_id, visible, orden, creado_en);

drop policy if exists "administra_productos_propios" on public.productos;

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
  and (
    categoria_id is null
    or exists (
      select 1 from public.categorias
      where categorias.id = productos.categoria_id
        and categorias.negocio_id = productos.negocio_id
    )
  )
  and (
    subcategoria_id is null
    or exists (
      select 1
      from public.subcategorias
      join public.categorias
        on categorias.id = subcategorias.categoria_id
      where subcategorias.id = productos.subcategoria_id
        and categorias.id = productos.categoria_id
        and categorias.negocio_id = productos.negocio_id
    )
  )
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'productos',
  'productos',
  true,
  2097152,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin_lee_imagenes_productos" on storage.objects;
drop policy if exists "admin_sube_imagenes_productos" on storage.objects;
drop policy if exists "admin_actualiza_imagenes_productos" on storage.objects;
drop policy if exists "admin_borra_imagenes_productos" on storage.objects;

create policy "admin_lee_imagenes_productos"
on storage.objects for select to authenticated
using (
  bucket_id = 'productos'
  and (storage.foldername(name))[1] in (
    select negocios.id::text
    from public.negocios
    where negocios.admin_user_id = (select auth.uid())
  )
);

create policy "admin_sube_imagenes_productos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'productos'
  and (storage.foldername(name))[1] in (
    select negocios.id::text
    from public.negocios
    where negocios.admin_user_id = (select auth.uid())
  )
);

create policy "admin_actualiza_imagenes_productos"
on storage.objects for update to authenticated
using (
  bucket_id = 'productos'
  and (storage.foldername(name))[1] in (
    select negocios.id::text
    from public.negocios
    where negocios.admin_user_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'productos'
  and (storage.foldername(name))[1] in (
    select negocios.id::text
    from public.negocios
    where negocios.admin_user_id = (select auth.uid())
  )
);

create policy "admin_borra_imagenes_productos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'productos'
  and (storage.foldername(name))[1] in (
    select negocios.id::text
    from public.negocios
    where negocios.admin_user_id = (select auth.uid())
  )
);

comment on column public.productos.fotos is
  'Rutas internas del bucket publico productos; maximo cuatro por producto.';
