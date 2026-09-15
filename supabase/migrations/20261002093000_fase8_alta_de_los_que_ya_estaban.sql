-- Los negocios que ya estaban no tienen que recorrer el alta.
--
-- `alta_completada_en` nace en nulo, y el panel está por empezar a mandar al
-- alta a todo el que lo tenga así. Para un negocio nuevo es lo correcto; para
-- los que ya venían **es una trampa**: llevan meses con su catálogo publicado y
-- el sistema los mandaría a un recorrido de cuatro pantallas que ya hicieron.
--
-- Y una peor: el paso 2 obliga a elegir rubro y lo deja fijo. Un negocio que
-- venía sin rubro tendría que tomar de apuro la decisión más cara de deshacer
-- del sistema solo para volver a su panel.
--
-- Se da por terminada el alta de quien **ya tiene productos cargados**. Es la
-- prueba de que se configuró: nadie llega a tener productos sin haber pasado por
-- lo que el alta pregunta.
--
-- `alta_paso` va a 4 para que la barra de progreso no muestre a un negocio con
-- veinte productos parado en el paso 1 si alguna vez entra a esas pantallas.
update public.negocios
set alta_completada_en = coalesce(alta_completada_en, now()),
    alta_paso = 4
where alta_completada_en is null
  and exists (
    select 1 from public.productos where productos.negocio_id = negocios.id
  );
