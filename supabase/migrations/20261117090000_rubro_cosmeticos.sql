-- Un rubro nuevo, con siembra propia: «Cosméticos y cuidado de la piel».
--
-- La tienda de cremas, sérums y protector solar no cabía en ninguno: «Belleza»
-- es de turnos —barbería, salón, uñas— y no vende frascos, y en «Importados»
-- arrancaba sin un solo campo. Lo que pregunta quien compra un sérum es para qué
-- piel es, cuándo se pone y qué trae (`lib/rubros/siembra/cosmeticos.ts`).
--
-- Igual que con mochilas, solo cambian las listas que aceptan las tres
-- restricciones. Se vuelven a crear con las mismas listas de
-- `lib/negocios/rubros.ts` y `lib/negocios/rubros-publicos.ts`, en el mismo
-- orden; `rubros.test.ts` y `ubicacion-y-rubros.test.ts` las comparan. Ningún
-- valor guardado deja de valer: cada lista nueva contiene a la anterior.

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
      'cosmeticos',
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
      'barberia', 'salon_belleza', 'cosmeticos',
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
      'barberia', 'salon_belleza', 'cosmeticos',
      'consultorio', 'clases', 'otros_servicios',
      'veterinaria', 'mascotas',
      'otro'
    ]::text[]
  );
