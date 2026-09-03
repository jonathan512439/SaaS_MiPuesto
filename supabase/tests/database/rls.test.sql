begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(23);

select ok((select relrowsecurity from pg_class where oid = 'public.negocios'::regclass), 'RLS activo en negocios');
select ok((select relrowsecurity from pg_class where oid = 'public.categorias'::regclass), 'RLS activo en categorias');
select ok((select relrowsecurity from pg_class where oid = 'public.subcategorias'::regclass), 'RLS activo en subcategorias');
select ok((select relrowsecurity from pg_class where oid = 'public.productos'::regclass), 'RLS activo en productos');
select ok((select relrowsecurity from pg_class where oid = 'public.promociones'::regclass), 'RLS activo en promociones');
select ok((select relrowsecurity from pg_class where oid = 'public.pedidos'::regclass), 'RLS activo en pedidos');
select ok((select relrowsecurity from pg_class where oid = 'public.pedido_items'::regclass), 'RLS activo en pedido_items');
select ok((select relrowsecurity from pg_class where oid = 'public.eventos_analitica'::regclass), 'RLS activo en eventos_analitica');
select ok((select relrowsecurity from pg_class where oid = 'public.limites_pedidos_ip'::regclass), 'RLS activo en limites_pedidos_ip');

select ok((select count(*) > 0 from pg_policies where schemaname = 'public' and tablename = 'negocios'), 'negocios tiene políticas');
select ok((select count(*) > 0 from pg_policies where schemaname = 'public' and tablename = 'categorias'), 'categorias tiene políticas');
select ok((select count(*) > 0 from pg_policies where schemaname = 'public' and tablename = 'subcategorias'), 'subcategorias tiene políticas');
select ok((select count(*) > 0 from pg_policies where schemaname = 'public' and tablename = 'productos'), 'productos tiene políticas');
select ok((select count(*) > 0 from pg_policies where schemaname = 'public' and tablename = 'promociones'), 'promociones tiene políticas');
select ok((select count(*) > 0 from pg_policies where schemaname = 'public' and tablename = 'pedidos'), 'pedidos tiene políticas');
select ok((select count(*) > 0 from pg_policies where schemaname = 'public' and tablename = 'pedido_items'), 'pedido_items tiene políticas');
select ok((select count(*) > 0 from pg_policies where schemaname = 'public' and tablename = 'eventos_analitica'), 'eventos_analitica tiene políticas');
select ok((select count(*) = 0 from pg_policies where schemaname = 'public' and tablename = 'limites_pedidos_ip'), 'limites_pedidos_ip no tiene acceso por políticas');

select ok(not has_column_privilege('anon', 'public.negocios', 'admin_user_id', 'select'), 'anon no puede leer admin_user_id');
select ok(not has_table_privilege('anon', 'public.pedidos', 'select'), 'anon no puede leer pedidos');
select ok(not has_table_privilege('anon', 'public.pedido_items', 'select'), 'anon no puede leer items de pedidos');
select ok(not has_table_privilege('anon', 'public.eventos_analitica', 'select'), 'anon no puede leer analítica');
select ok(not has_table_privilege('authenticated', 'public.limites_pedidos_ip', 'select'), 'authenticated no puede leer límites por IP');

select * from finish();
rollback;
