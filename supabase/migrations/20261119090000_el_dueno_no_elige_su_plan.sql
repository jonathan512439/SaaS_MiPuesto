-- El dueño no elige su plan, ni su vencimiento, ni si está publicado.
--
-- Encontrado en la auditoría de seguridad del 2026-11-15, y comprobado en la
-- base de ensayo con un usuario común: con su propia sesión, directo contra la
-- API, un dueño podía **borrar su negocio y volver a crearlo** con el plan
-- Activo, el vencimiento en 2099, publicado y verificado. Sin pagar nunca, y
-- sin pasar por la prueba de quince días. Un catálogo suspendido por falta de
-- pago volvía a estar en línea de la misma forma.
--
-- La causa viene del esquema inicial. El permiso de **actualizar** `negocios`
-- se concede columna por columna desde la fase 7, justamente para que el panel
-- pueda tocar el nombre pero no `activo`, `verificado` ni la suscripción. El de
-- **insertar** y el de **borrar** quedaron sobre la tabla entera: quien da de
-- alta una fila le pone lo que quiere a todas sus columnas, y la política solo
-- mira que la fila sea suya.
--
-- Desde acá:
--
-- 1. **Insertar, solo las columnas del alta** —las que manda
--    `app/api/negocios/perfil/route.ts`—. Todo lo demás nace con su valor por
--    omisión: el plan `prueba`, quince días, sin verificar. Lo que el dueño
--    edita después lo edita con `update`, como hasta hoy.
-- 2. **Borrar, nadie con sesión de dueño.** El panel nunca borró un negocio: lo
--    hace la plataforma. Y sin borrado no hay segunda alta —`admin_user_id` es
--    único—, así que la prueba de quince días es una sola.
--
-- No cambia nada para un negocio que hoy funciona: el alta manda las mismas
-- nueve columnas que mandaba. `lib/negocios/alta-por-columnas.test.ts` compara
-- esta lista con lo que arma la ruta, y `npm run test:permisos:linked` con lo
-- que la base tiene concedido de verdad.

revoke insert, delete on table public.negocios from authenticated;

grant insert (
  admin_user_id,
  nombre,
  slug,
  descripcion,
  subnombre,
  tipo_negocio,
  telefono_whatsapp,
  rubro,
  pide_numero_mesa
) on table public.negocios to authenticated;

comment on table public.negocios is
  'Un negocio por dueño. El dueño inserta solo las columnas del alta y actualiza solo las suyas; plan, vencimiento, publicación y verificación los escribe la plataforma. No puede borrarlo.';
