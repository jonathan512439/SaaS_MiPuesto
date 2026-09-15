-- Datos exclusivamente locales/de prueba. No ejecutar en producción.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000001', 'restaurante@mipuesto.local', '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000002', 'tienda@mipuesto.local', '{}'::jsonb),
  ('10000000-0000-4000-8000-000000000003', 'servicios@mipuesto.local', '{}'::jsonb)
on conflict (id) do nothing;

insert into public.negocios (
  id, admin_user_id, slug, nombre, descripcion, tipo_negocio,
  telefono_whatsapp, horario, verificado
)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'sabor-camba', 'Sabor Camba', 'Platos bolivianos para compartir.', 'catalogo_estatico', '59170000001', '{"lunes":{"abre":"11:30","cierra":"21:00"}}'::jsonb, true),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'tienda-kantuta', 'Tienda Kantuta', 'Accesorios y regalos hechos en Bolivia.', 'tienda_virtual', '59170000002', '{"lunes":{"abre":"09:00","cierra":"18:30"}}'::jsonb, true),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'barberia-central', 'Barbería Central', 'Cortes, barba y cuidado personal con cita.', 'catalogo_cta', '59170000003', '{"lunes":{"abre":"08:30","cierra":"19:00"}}'::jsonb, true)
on conflict (id) do nothing;

insert into public.categorias (id, negocio_id, nombre, orden)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Platos principales', 1),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Accesorios', 1),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'Servicios', 1)
on conflict (id) do nothing;

insert into public.subcategorias (id, categoria_id, nombre, orden)
values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Tradicionales', 1),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'Para llevar', 1),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'Corte y barba', 1)
on conflict (id) do nothing;

insert into public.productos (
  id, negocio_id, categoria_id, subcategoria_id, nombre, descripcion,
  precio, controla_stock, cantidad_stock, orden
)
values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Majadito batido', 'Arroz con charque, huevo y plátano.', 38.00, false, null, 1),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', 'Bolso tejido', 'Bolso liviano tejido a mano.', 95.00, true, 3, 1),
  ('50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'Corte clásico', 'Corte a tijera o máquina con acabado.', 50.00, false, null, 1)
on conflict (id) do nothing;
