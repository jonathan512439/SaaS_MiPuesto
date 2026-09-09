-- La plantilla «catálogo técnico».
--
-- Buscador arriba de todo, identidad reducida a una franja y categorías como
-- filtro en vez de recorrido. Es para ferretería, repuestos y electropartes:
-- rubros donde la primera pregunta del comprador no es «¿qué tenés?» sino
-- **«¿tenés esto?»**, y hacerlo bajar tres pantallas hasta el buscador es
-- hacerlo irse.
--
-- Eso no se resuelve con estilos, y por eso es una plantilla y no una paleta.
--
-- La otra plantilla que preveía el plan, `reserva`, **no entra todavía**: se
-- define por poner el calendario primero, y el calendario es la fase 6. Sin él
-- sería un armazón cuyo rasgo distintivo no existe.

alter table public.negocios drop constraint negocios_plantilla_id_check;
alter table public.negocios
  add constraint negocios_plantilla_id_check check (
    plantilla_id in ('clasica', 'moderna', 'minimal', 'feria', 'catalogo')
  );
