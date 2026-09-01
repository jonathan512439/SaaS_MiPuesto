-- La función pertenece al mecanismo de Supabase que habilita RLS al crear tablas.
-- El event trigger puede invocarla sin exponerla como RPC en la Data API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Índices de cobertura para todas las claves foráneas restantes.
create index if not exists idx_negocios_admin_user
  on public.negocios(admin_user_id);

create index if not exists idx_productos_categoria
  on public.productos(categoria_id);

create index if not exists idx_productos_subcategoria
  on public.productos(subcategoria_id);

create index if not exists idx_promociones_producto
  on public.promociones(producto_id);

create index if not exists idx_promociones_categoria
  on public.promociones(categoria_id);

create index if not exists idx_analitica_producto
  on public.eventos_analitica(producto_id);
