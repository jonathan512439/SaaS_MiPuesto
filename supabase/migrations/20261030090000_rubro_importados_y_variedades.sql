-- Un rubro público nuevo: «Importados y variedades».
--
-- La tienda que vende de todo un poco —juguetes, cosas de casa, electrónica,
-- regalos— no tenía dónde caer. Como «Tienda de barrio», su vista previa le
-- mostraba abarrotes; como «Otro», no aparecía en el buscador con un nombre que
-- la describa. Usa la siembra `otro`: empieza sin categorías y las arma con su
-- propia planilla.
--
-- Solo cambia la lista que aceptan las dos restricciones. Se vuelven a crear
-- con la misma lista de `lib/negocios/rubros-publicos.ts`, en el mismo orden;
-- `ubicacion-y-rubros.test.ts` compara las dos. Ningún valor guardado deja de
-- valer: la lista nueva contiene a la anterior.

alter table public.negocios
  drop constraint negocios_rubro_publico_valido,
  drop constraint negocios_rubros_secundarios_validos;

alter table public.negocios
  add constraint negocios_rubro_publico_valido check (
    rubro_publico is null or rubro_publico in (
      'restaurante', 'polleria', 'comida_rapida', 'salteneria', 'cafeteria', 'panaderia',
      'tienda_barrio', 'minimarket', 'licoreria', 'jugueteria', 'libreria', 'regalos',
      'electronica', 'muebles', 'artesanias', 'importados',
      'ropa_y_calzado', 'accesorios',
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
      'ropa_y_calzado', 'accesorios',
      'ferreteria', 'distribuidora', 'repuestos', 'taller_mecanico',
      'barberia', 'salon_belleza',
      'consultorio', 'clases', 'otros_servicios',
      'veterinaria', 'mascotas',
      'otro'
    ]::text[]
  );
