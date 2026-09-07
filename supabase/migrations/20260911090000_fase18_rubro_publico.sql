-- El rubro pasa a ser legible por el catálogo público.
--
-- Al crearlo se dejó fuera a propósito, con este argumento: «nada de lo que se
-- muestra al comprador depende del rubro, y una columna que no se sirve es una
-- columna que no se puede filtrar por error».
--
-- Ahora sí depende: el fondo del catálogo lleva un patrón distinto según el
-- rubro, y esa decisión se toma al dibujar la página. La alternativa era pasar
-- el dato por otro camino solo para evitar el `grant`, que es esconder la misma
-- información con más piezas.
--
-- Lo que se expone es qué clase de negocio es, algo que cualquiera deduce
-- mirando el catálogo. No cambia nada del resto: el `grant` sigue siendo por
-- columna y todo lo que no está en la lista sigue afuera.

grant select (rubro) on table public.negocios to anon;
