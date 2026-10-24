-- Un rubro nuevo, con siembra propia: «Mochilas, bolsos y maletas».
--
-- Llegó con la primera tienda de mochilas, que cayó en «Otro» porque ningún
-- rubro la cubría. Como «Ropa y calzado» le habrían preguntado la temporada; lo
-- que pregunta quien compra una mochila es cuánto le entra y para quién es. Por
-- eso no alcanza con un rubro público más sobre una siembra existente: trae sus
-- propias categorías y campos (`lib/rubros/siembra/mochilas.ts`).
--
-- Solo cambian las listas que aceptan las tres restricciones. Se vuelven a crear
-- con las mismas listas de `lib/negocios/rubros.ts` y
-- `lib/negocios/rubros-publicos.ts`, en el mismo orden; `rubros.test.ts` y
-- `ubicacion-y-rubros.test.ts` las comparan. Ningún valor guardado deja de
-- valer: cada lista nueva contiene a la anterior.

alter table public.negocios
  drop constraint negocios_rubro_valido,
  drop constraint negocios_rubro_publico_valido,
  drop constraint negocios_rubros_secundarios_validos;

alter table public.negocios
  add constraint negocios_rubro_valido check (
    rubro is null
    or rubro in (
      'restaurante',
      'tienda_barrio',
      'ropa_y_calzado',
      'ferreteria',
      'servicios',
      'belleza',
      'distribuidora',
      'repuestos',
      'veterinaria',
      'mochilas',
      -- Último, igual que en la lista de la aplicación: es la opción de descarte.
      'otro'
    )
  ),
  add constraint negocios_rubro_publico_valido check (
    rubro_publico is null or rubro_publico in (
      'restaurante', 'polleria', 'comida_rapida', 'salteneria', 'cafeteria', 'panaderia',
      'tienda_barrio', 'minimarket', 'licoreria', 'jugueteria', 'libreria', 'regalos',
      'electronica', 'muebles', 'artesanias', 'importados',
      'ropa_y_calzado', 'accesorios', 'mochilas',
      'ferreteria', 'distribuidora', 'repuestos', 'taller_mecanico',
      'barberia', 'salon_belleza',
      'consultorio', 'clases', 'otros_servicios',
      'veterinaria', 'mascotas',
      'otro'
    )
  ),
  add constraint negocios_rubros_secundarios_validos check (
    cardinality(rubros_secundarios) <= 2
    and rubros_secundarios <@ array[
      'restaurante', 'polleria', 'comida_rapida', 'salteneria', 'cafeteria', 'panaderia',
      'tienda_barrio', 'minimarket', 'licoreria', 'jugueteria', 'libreria', 'regalos',
      'electronica', 'muebles', 'artesanias', 'importados',
      'ropa_y_calzado', 'accesorios', 'mochilas',
      'ferreteria', 'distribuidora', 'repuestos', 'taller_mecanico',
      'barberia', 'salon_belleza',
      'consultorio', 'clases', 'otros_servicios',
      'veterinaria', 'mascotas',
      'otro'
    ]::text[]
  );
