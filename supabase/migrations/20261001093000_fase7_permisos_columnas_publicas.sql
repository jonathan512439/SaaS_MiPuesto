-- El catálogo público no podía leer las columnas nuevas.
--
-- `negocios` no concede `select` sobre la tabla entera: concede **columna por
-- columna** al rol `anon`, para que el catálogo público solo pueda leer lo que
-- de verdad sale publicado y nada más. Es la decisión correcta, pero tiene un
-- filo: una columna nueva **no queda concedida sola**, y pedirla en la consulta
-- pública hace fallar la consulta entera —no devuelve la fila sin esa columna,
-- devuelve un error de permisos—.
--
-- Eso fue exactamente lo que pasó con `patron_opacidad` y `subnombre`: se
-- agregaron en la fase 7, se sumaron a la consulta del catálogo, y desde ese
-- despliegue **ningún catálogo público cargó**. La página devolvía 200 con el
-- cuerpo vacío, así que ni el código de estado lo delataba.

grant select (patron_opacidad, subnombre) on public.negocios to anon;
