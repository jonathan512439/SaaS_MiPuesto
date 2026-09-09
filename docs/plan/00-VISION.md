# 00 — Visión y alcance

## 1. El producto que se quiere

MiPuesto es un SaaS boliviano de catálogos digitales donde el pedido se cierra por
WhatsApp. Eso no cambia. Lo que cambia es **qué es un catálogo**.

Hasta hoy un producto tenía: nombre, descripción, precio, hasta cuatro fotos, una
categoría, una subcategoría y una cantidad. Con eso se cubre bien un minimarket y a
medias un restaurante. Las 44 fichas de `Catalogos_Ejemplo/` describen 44 negocios
distintos, y **ninguno queda cubierto al 100 % con ese modelo**. Los de servicio
—barbería, dental, veterinaria, canchas, hotel— quedan cerca de cero, porque todos
dependen de una agenda que no existe.

El objetivo de este plan es que **un vendedor pueda abrir el catálogo de demostración
del rubro del prospecto y que el prospecto se reconozca en él**. Esa es la fase de
conseguir clientes, y es la que gobierna las prioridades de acá en adelante.

## 2. La evidencia

`Catalogos_Ejemplo/` tiene 44 fichas de una página. Cada una trae cinco bloques:

1. Campos obligatorios
2. Atributos especiales
3. Funciones clave
4. Qué espera el cliente
5. Impacto en el sistema

Más dos maquetas de teléfono: portada y ficha de producto.

Esto es exactamente la investigación de campo que el plan anterior decía que faltaba
antes de construir campos por categoría. La decisión de aplazar —«no ahora; con cero
clientes son nueve días sobre una suposición»— **queda revocada por este documento**:
ya no es una suposición.

## 3. El hallazgo que hace viable el plan

Las 44 fichas parecen 44 desarrollos. No lo son. Convergen en **ocho mecanismos**:

| # | Mecanismo | Rubros que lo piden | Fase |
|---|---|---|---|
| 1 | Atributos por categoría (ficha técnica) | **44** | 2 |
| 2 | Variantes con precio y existencias propias | 15 | 3 |
| 3 | Filtros por atributo, orden y búsqueda por código | **44** | 4 |
| 4 | Precio por unidad de medida, escalas por volumen, moneda | 14 | 5 |
| 5 | Modificadores y extras con precio | 8 | 5 |
| 6 | Agenda: recursos, turnos, cupos y disponibilidad | 15 | 6 |
| 7 | Presets por rubro (categorías y campos ya cargados) | **44** | 7 |
| 8 | Logística: sucursales, zonas, fecha de entrega, fichas | 12 | 8 |

Y **siete familias de comportamiento** cubren los 44 rubros (ver `06-RUBROS.md`).
Un rubro nuevo, después de esto, cuesta **dos horas y cero migraciones**.

## 4. El filtro — qué entra y qué no

Se conserva el filtro del plan anterior, con una regla nueva arriba de todo.

| Pregunta | Si la respuesta es no |
|---|---|
| **¿Aparece en tres o más de las 44 fichas?** | Va a la lista de excepciones, no al plan |
| ¿Un negocio real lo pidió o lo pediría en la primera demostración? | Se aplaza |
| ¿Se puede sostener con un desarrollador solo, sin QA? | Se simplifica hasta que sí |
| ¿Cabe en los planes gratuitos de Supabase y Cloudflare? | Se rediseña o se descarta |
| ¿Se puede probar automáticamente? | Se rediseña hasta que sí |

**Un caso de un solo rubro no justifica una tabla.** Se resuelve reusando un mecanismo
existente o se anota como excepción con nombre y apellido. Ejemplo trabajado: la
compatibilidad vehicular de los repuestos **no** es una tabla nueva; es un atributo de
tipo lista con valores múltiples (mecanismo 1).

## 5. Lo que se descarta, con motivo

| Pedido de las fichas | Decisión | Por qué |
|---|---|---|
| Reseñas y valoraciones con estrellas | **No** | Sin cuentas de comprador, una reseña es un formulario anónimo: se llena de correo basura y de reseñas propias. Se mantiene el enlace a Google, que ya existe (`resenas_url`) y tiene moderación gratis |
| Favoritos, comparador e historial de pedidos | **Sí, pero sin base de datos** | Viven en `localStorage` del comprador. Cero tablas, cero costo, cero datos personales guardados |
| Cuentas de comprador | **No** | Rompe la promesa del producto: se compra sin registrarse. Todo lo que necesitaría cuenta se resuelve con `localStorage` o con el código de reserva |
| Pasarela de pago | **No** | Decisión de producto anterior, sigue vigente. El QR de pago cubre el caso |
| Galería 360° | **No** | Un rubro y medio, y multiplica el peso de las imágenes, que es el costo que sí duele |
| Conversación dentro del catálogo | **No** | La conversación es WhatsApp. Ese es el producto |
| Varios idiomas | **No** | Mercado boliviano, español |
| Aplicación nativa | **No** | El manifiesto web ya instala el catálogo en la pantalla de inicio |

## 6. Lo que se hereda del plan anterior y sigue mandando

Estas decisiones se tomaron con números medidos y **no se reabren en este plan**:

- **Infraestructura:** Supabase gratuito más Cloudflare Workers. Nada que obligue a
  subir de plan entra sin recostear.
- **Una sola base para todos los negocios.** El aislamiento lo da RLS, verificado en el
  cierre de cada fase. Una cuenta por rubro está descartada.
- **Imágenes comprimidas y validadas en el cliente** antes de subir; al borrar un
  producto se borra su archivo en Storage.
- **El rubro oculta interfaz, nunca datos ni permisos.** Cambiar de rubro apaga
  botones; no borra nada. Se extiende a los campos: **borrar un campo de una categoría
  no borra el valor guardado en el producto.**
- **`jsonb` en vez de una tabla de productos por rubro.** Un rubro nuevo no obliga a
  migrar lo existente.
- **El eje de los campos es la categoría, no el rubro.** Una ferretería vende focos,
  cemento, tubos y tornillos: el rubro es demasiado grueso.
- **Los totales se recalculan en el servidor.** Nunca se confía en el navegador.
- **Sin dependencias nuevas sin justificación escrita.**

## 7. Lo que se revisa a propósito

| Decisión anterior | Ahora | Motivo |
|---|---|---|
| Los campos son de **un solo tipo**: nombre más lista cerrada | Cuatro tipos: lista, texto, número y sí/no | Las fichas piden números con unidad (100 W, 500 GB, 60×60) y de ahí salen los filtros por rango, que aparecen en casi todas |
| Máximo **4** campos por categoría | Máximo **8** | Las fichas muestran de cinco a siete atributos típicos. Ocho es el techo, no la meta: la interfaz recomienda tres |
| Las variantes son «capa 3, y probablemente conviene decir que todavía no» | **Fase 3, obligatoria** | Quince rubros la piden, y calzado —el ejemplo más claro— es inviable sin ella. Vender un catálogo de calzado sin existencias por talla genera pedidos que hay que cancelar a mano |
| Las definiciones de campos van en código | Van en **tabla**, con techos duros y tipos cerrados | Las define el dueño por categoría; en código habría que desplegar por cada cliente nuevo |
| Los presets por rubro no existían | Van en **código**, versionados | Un preset es un dato semilla que se aplica una vez y se edita después: pertenece al commit, no a la base |

## 8. La línea que no se cruza, actualizada

La regla vieja decía: *«un atributo puede describir un producto; no puede cambiar cómo
se cobra»*. Sigue siendo cierta, y ahora hay que decir qué **sí** cambia el precio:

| Mecanismo | ¿Toca el precio? | Dónde se calcula |
|---|---|---|
| Atributo de categoría | **Nunca** | En ningún lado. Es texto |
| Variante | Sí, lo reemplaza | `lib/precios.ts`, servidor |
| Modificador | Sí, lo suma | `lib/precios.ts`, servidor |
| Escala por volumen | Sí, lo reemplaza según cantidad | `lib/precios.ts`, servidor |
| Promoción | Sí, lo descuenta | `lib/precios.ts`, servidor |
| Unidad de medida | No, lo multiplica por cantidad | `lib/precios.ts`, servidor |

**Todo lo que toca el precio pasa por un solo archivo y se prueba con casos.** Si un
mecanismo nuevo quiere tocar el precio y no cabe en `lib/precios.ts`, el diseño está
mal.

## 9. Cómo se mide el éxito de este plan

No por fases cerradas. Por esto:

1. **Demostración:** existe un catálogo de muestra para cada una de las siete familias,
   con datos creíbles, que se abre desde la portada y carga en menos de dos segundos en
   un teléfono de gama baja con red móvil.
2. **Alta:** un negocio nuevo de cualquiera de los 44 rubros queda publicado y usable en
   **menos de treinta minutos** desde que se crea la cuenta, sin tocar la base a mano.
3. **Operación:** un negocio piloto opera **una semana completa** —pedidos, cambios de
   precio, altas y bajas de productos— sin que nadie toque la base a mano y sin
   incidentes de datos.

El punto 3 es el mismo criterio de salida que tenía la fase 9 del plan anterior y sigue
sin cumplirse. Nada de lo que se construya lo reemplaza.

## 10. Riesgos declarados

| Riesgo | Señal temprana | Mitigación |
|---|---|---|
| El formulario del panel se vuelve inusable | Un cliente real ya reportó que no encontraba cómo crear una categoría | Fase 7: alta guiada con presets. El dueño no llena campos vacíos, corrige campos ya cargados |
| 300 productos por 8 atributos con variantes revientan la consulta pública | Tiempo de la consulta pública mayor a 400 ms | La fase 9 mide antes de cerrar. Los índices GIN se declaran en la fase 2, no después |
| Las migraciones rompen datos reales | No hay respaldo verificado **hoy** | **La fase 0 es obligatoria y bloquea todo lo demás** |
| El alcance crece rubro por rubro | Aparece una tabla para un solo rubro | El filtro de la sección 4 y la lista de excepciones |
| El costo de imágenes se dispara | Uso de Storage por negocio mayor a 200 MB | El tope de fotos por producto es por plan, no global |
