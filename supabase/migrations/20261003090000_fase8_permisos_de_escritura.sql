-- El dueño no podía escribir ninguna de las columnas nuevas.
--
-- `negocios` no concede `update` sobre la tabla entera: concede **columna por
-- columna** al rol `authenticated`, para que el panel solo pueda tocar lo que de
-- verdad es del dueño y no `verificado`, `activo` ni la fecha de suscripción.
-- Es la decisión correcta y tiene el mismo filo que del lado de la lectura: una
-- columna nueva **no queda concedida sola**.
--
-- Pasó con todo lo agregado en las fases 7 y 8. El alta fallaba en el paso 1 sin
-- decir por qué, y el subnombre y la intensidad del fondo de la fase 7 nunca se
-- llegaron a guardar: el panel mostraba el control, el dueño lo movía, y la
-- escritura se rechazaba.
--
-- Se conceden solo las que el dueño edita. Las que escribe el servidor con la
-- clave de servicio —la ficha de Google que resuelve el sistema, el estado de la
-- suscripción— quedan fuera a propósito.
grant update (
  nombre_admin,
  alta_paso,
  alta_completada_en,
  rubro_bloqueado_en,
  subnombre,
  patron_opacidad,
  direccion_manual,
  -- Solo esta de las `maps_*`: mostrar o no la calificación es del dueño; el
  -- `place_id` y el número los resuelve el servidor contra Google.
  maps_visible
) on public.negocios to authenticated;
