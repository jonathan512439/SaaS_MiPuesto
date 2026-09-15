# 06 · Fases

Nueve fases. **Cada una se despliega a producción antes de empezar la
siguiente**, y ninguna se da por cerrada sin su criterio de salida verificado en
el sitio publicado, no en local.

El orden no es arbitrario: cada fase deja el sistema funcionando y entregable. No
hay una fase que rompa el catálogo y otra que lo arregle.

| # | Fase | Días | Deja funcionando |
|---|---|---|---|
| 1 | La categoría toma identidad | 3 | Iconos y esferas |
| 2 | Los campos de la categoría | 4 | El editor de campos |
| 3 | Los campos en el producto | 4 | Datos en tarjeta, ficha y WhatsApp |
| 4 | Variantes | 3 | Talla, color, presentación con stock |
| 5 | Agenda y citas | 6 | Reservar hora sin doble agendamiento |
| 6 | El catálogo nuevo | 7 | El diseño de referencia, y la poda |
| 7 | Identidad y apariencia | 4 | Logo, banners, paletas, patrón, Google |
| 8 | Alta guiada y siembra | 5 | Un dueño se da de alta solo |
| 9 | Refinamiento y salida | 4 | Vocabulario, portada, dominio |

**40 días de trabajo efectivo.**

---

## Fase 1 — La categoría toma identidad

**Objetivo:** que una categoría tenga icono, se pueda ocultar, y declare si vende
cosas o tiempo.

**Migraciones:** `categorias` con `icono`, `visible`, `vende` y el único
compuesto `(id, negocio_id)`.

**Entregables**

- `lib/iconos.ts` con el juego permitido y los subconjuntos por rubro.
- `SelectorDeIcono` con buscador.
- El formulario de categoría con icono, visibilidad y qué vende.
- Las esferas en el catálogo, con **todas** las categorías visibles.

**Pruebas**

- El icono inválido se rechaza, en el validador y en la base.
- Ocultar una categoría saca su esfera y **no esconde sus productos**.
- La clave foránea compuesta rechaza una categoría de otro negocio.

**Criterio de salida:** en producción, un negocio real muestra sus esferas con
icono, y ocultar una la saca del catálogo sin perder productos.

**Lo que quedó fuera a propósito:** `vende` se agrega a la base, a la API y al
validador, pero **no tiene control en el panel todavía**. Elegir «tiempo» no
haría nada hasta que exista la agenda, en la fase 5, y un interruptor que no
cambia nada le enseña al dueño que los controles no sirven — el mismo motivo por
el que se descartaron las pestañas «Pedidos» y «Perfil». El control aparece en la
fase 5, junto con lo que enciende.

---

## Fase 2 — Los campos de la categoría

**Objetivo:** que el dueño defina qué datos lleva cada categoría.

**Migraciones:** `atributos_categoria` y el disparador del tope.

**Entregables**

- `lib/catalogo/atributos.ts`: validación de definiciones.
- `PUT /api/catalogo/categorias/[id]/atributos`.
- El editor de campos: agregar, renombrar, reordenar, borrar.
- El aviso al borrar un campo con valores cargados.

**Pruebas**

- Los cuatro tipos, cada uno con su forma válida e inválida.
- `opcion` sin opciones se rechaza; con 25, también.
- `unidad` en un campo que no es número, rechazado.
- El campo once, rechazado. El séptimo en tarjeta, rechazado.
- Dos campos con la misma clave, rechazados.

**Criterio de salida:** en producción, una categoría real tiene cinco campos
definidos y el intento de agregar el once falla con mensaje claro.

**Se adelantó de la fase 3:** la columna `productos.atributos` con su índice.
Sin ella, el aviso al borrar un campo no podría decir en cuántos productos se
pierde el dato y diría siempre «cero», que es un aviso que miente. La pantalla
para cargar valores sigue en la fase 3.

---

## Fase 3 — Los campos en el producto

**Objetivo:** que el producto lleve valores y que se vean donde importan.

**Migraciones:** `productos.atributos` con su índice `gin`.

**Entregables**

- `lib/catalogo/valores.ts`: valida un valor contra su definición.
- El formulario de producto dibuja **los campos de su categoría**, no una lista
  fija.
- `LineaAtributos` en la tarjeta, hasta seis.
- `Especificaciones` en la ficha, de uno a diez.
- **Los atributos marcados viajan en el mensaje de WhatsApp.**
- El buscador encuentra por valor de atributo.

**Pruebas**

- Un valor que no está entre las opciones, rechazado.
- Un texto donde va un número, rechazado.
- Cambiar la categoría de un producto: qué pasa con los valores viejos.
- El mensaje de WhatsApp incluye los atributos con `en_resumen`.

**Criterio de salida:** en producción, un pedido de la ferretería llega por
WhatsApp con «Potencia: 9 W · Casquillo: E27» debajo del nombre.

Esta es la fase que hace visible el valor del sistema. Si se cae una, que no sea
esta.

---

## Fase 4 — Variantes

**Objetivo:** talla, color y presentación con stock y precio propios.

**Migraciones:** `variantes_producto`.

**Entregables**

- `lib/catalogo/variantes.ts`.
- `PUT /api/catalogo/productos/[id]/variantes`.
- El editor de variantes en el producto.
- El selector en la ficha, con el precio actualizándose.
- La variante viaja en el pedido y en el mensaje.

**Pruebas**

- Precio nulo hereda el del producto.
- Stock de variante mayor que el del producto, rechazado.
- Una categoría con `vende = tiempo` no admite variantes.
- Agotar una variante no agota el producto.

**Criterio de salida:** en producción, una remera en tres tallas, y el pedido
por WhatsApp dice cuál.

**Lo que quedó fuera, y por qué está dicho en pantalla:** el carrito **todavía
reserva sobre el total del producto**, no por presentación. Reservar por
presentación toca cinco funciones de la base —la que crea el pedido y reserva,
más las tres que devuelven lo reservado al confirmar, cancelar y expirar, más
`pedido_items`—, que es el motor de compra completo. Eso es una fase en sí misma
y no entra en tres días.

Mientras tanto **no se le miente a nadie**: las existencias por presentación son
del panel, para que el dueño lleve su cuenta, y el editor lo dice donde se cargan.
El catálogo público muestra los nombres y los precios de cada presentación, que
sí son ciertos, y la disponibilidad que muestra sigue siendo la del producto,
igual que antes de esta fase.

---

## Fase 5 — Agenda y citas

**Objetivo:** reservar una hora, sin que dos personas ganen la misma.

Es la fase más larga y la más riesgosa. Se hace ahora, antes del rediseño, y no
después: **es preferible romperla acá que en producción con clientes**.

**Migraciones:** `agenda_categoria`, `citas`, y la restricción de exclusión con
`btree_gist`.

**Entregables**

- `lib/agenda/franjas.ts` y `lib/agenda/horarios.ts`, los dos puros.
- El editor de agenda por categoría.
- `GET /api/publico/[slug]/horarios`.
- `POST /api/publico/[slug]/citas`, idempotente, que **confía en la exclusión**.
- `SelectorDeFecha` en la ficha.
- Las citas del día en el panel, junto a los pedidos.
- La confirmación por WhatsApp con fecha y hora.

**Pruebas**

- De la semana a los horarios: turno que cruza el mediodía, día sin franjas,
  duración que no divide la franja exacta.
- La anticipación mínima esconde los horarios de las próximas dos horas.
- Una franja llena devuelve `libres: 0` y **no se omite**.
- **Prueba de concurrencia contra base real**: dos inserciones simultáneas del
  mismo horario, una gana y la otra recibe 409.
- Con `cupo_por_franja = 2`, la tercera falla.
- Cancelar libera el cupo.

**Corrección al plan:** esta fase **no toca las cinco funciones del motor de
compra**. Aquellas manejan `productos.cantidad_reservada`, que es existencias;
una cita aparta una hora, con otro mecanismo. Estaban separadas por diseño y el
plan las juntó mal. La que sí las toca sigue siendo la reserva por presentación
que dejó pendiente la fase 4.

**Corrección de modelo, 2026-09-12: el calendario es de la categoría.**

La primera versión puso la agenda en la categoría y el choque en el producto.
Dos niveles para la misma cosa: un consultorio con un profesional y cinco tipos
de consulta aceptaba dos citas a la misma hora, porque eran productos distintos.

Lo que un negocio tiene no es un calendario por servicio, es **un profesional**.
El recurso escaso es la persona, y la persona es la categoría: la exclusión pasó
a `(categoria_id, cupo, rango)` y `cupo_por_franja` significa cuántos
profesionales o consultorios hay. La duración bajó al producto, para que una
valoración de una hora y una vacunación de quince minutos compartan calendario.

**Y la tercera, del mismo día: el recurso explícito.** La categoría tampoco
era el calendario. En una veterinaria, «Consultas» agrupa la consulta del doctor
y el baño del peluquero porque al cliente le resulta natural buscarlos juntos,
pero son dos agendas. Son dos ejes distintos y quedaron separados:

| Eje | Para qué | Quién lo decide |
|---|---|---|
| Categoría | Cómo navega el cliente: las esferas | El marketing del negocio |
| Recurso | Quién hace el trabajo: el doctor, el consultorio | La realidad del local |

La exclusión es `(recurso_id, cupo, rango)`. El horario es del recurso —el
peluquero viene los sábados y el doctor no—. Cada producto dice quién lo
atiende. Y el dueño tiene una pantalla de **Agenda** con: quién atiende y
cuándo, un interruptor para apagar las reservas de alguien, el cronograma de los
próximos catorce días, y la carga a mano con nota interna para lo que llega por
teléfono o para bloquear una hora.

Lo que llega del catálogo entra **sin confirmar**. El dueño lo confirma si le
parece serio o lo cancela y la hora vuelve a ofrecerse. Nada queda aceptado sin
que él lo haya visto.

**Criterio de salida:** en producción, dos teléfonos piden el mismo horario a la
vez y solo uno lo consigue. **Probado a mano, no solo en pruebas.**

---

## Fase 6 — El catálogo nuevo

**Objetivo:** el diseño de `Catalogos_Ejemplo/`, adaptado al sistema.

**Entregables**

- Los once bloques de la portada, con su orden en una lista.
- `TarjetaProducto` única.
- `FichaProducto` con galería, especificaciones y acciones.
- `BarraInferior` según modalidad.
- Se borran las cinco plantillas, las seis tarjetas y sus hojas.
- **Migración de poda**: `plantilla` y `tarjeta_producto`, al final y solo
  después de verificar en producción.

**Pruebas**

- La tarjeta con 0, 3 y 6 atributos.
- La ficha con 1 y con 10.
- La barra inferior en las tres modalidades, y sin promociones activas.
- Ninguna referencia viva a `PLANTILLAS` ni a `TARJETAS`.
- Contraste y tokens, en las diez paletas.

**Criterio de salida:** los seis catálogos abiertos en un teléfono real, con la
misma estructura y seis identidades distintas. Recién ahí corre la poda.

---

## Fase 7 — Identidad y apariencia

**Objetivo:** que el dueño controle cómo se ve, sin poder romperlo.

**Migraciones:** identidad y patrón; campos de Maps; banners extendidos.

**Entregables**

- ✅ Logo y subnombre en la cabecera, en lugar del emoji.
- ✅ Banner con eyebrow, título, bajada y botón. **Uno solo, antes del pie.**
  Eran dos; el de arriba se retiró del diseño porque la portada ya lleva su
  propio título y botón encima, y dos franjas anchas seguidas empujaban los
  productos abajo del pliegue.
- ✅ Las diez paletas, alcanzando cabecera, fondo y tarjetas.
- ✅ Patrón armado con los iconos de las categorías, con opacidad de 0 a 30.
- ✅ El botón de Google, **en su forma sin clave**: enlaza al mapa, sin número.
- ✅ Vista previa en vivo en todo el panel de apariencia.
- ⏸ `POST /api/negocios/maps/resolver` y la calificación. **Diferido.**
- ⏸ La tarea semanal de `pg_cron` y el tope duro de consultas. **Diferido.**

**Pruebas**

- Las diez paletas pasan contraste en las tres superficies.
- Sin `GOOGLE_PLACES_API_KEY`, el botón aparece sin número.
- `maps_visible` no se puede activar sin `place_id`.
- La opacidad 31, rechazada.
- Sin categorías, el patrón cae al del rubro.
- La tarea está declarada en `tareas_programadas`.

**Criterio de salida:** en producción, un negocio con logo, subnombre, su
banner, paleta propia y patrón al 12 % armado con sus propias categorías.

### Lo que queda diferido, y por qué no bloquea

**La calificación de Google.** Decidido el 14 de septiembre de 2026: se pospone
hasta tener capital. Google cobra en Bolivia con cuenta prepaga y pide **30 USD
de recarga inicial** para habilitar la facturación. No es una tarifa —es saldo
que se consume— pero a **una consulta por negocio por semana** ese saldo duraría
años, y no se justifica adelantarlo por una función cosmética antes de tener
negocios que la pidan.

**No es bloqueante ni determinante.** El botón «Cómo llegar» ya funciona y lleva
al mapa; lo único que falta es el número de estrellas al lado. Las columnas
`maps_*` y la restricción que impide mostrar una calificación sin ficha resuelta
**ya están en la base** desde la migración `20260930090000`, así que retomarlo no
toca el modelo de datos: es conectar el resolvedor, la tarea de `pg_cron` y la
estrella.

Ninguna fase posterior depende de esto. El paso a paso para conseguir la clave
está en [`../GOOGLE-PLACES.md`](../GOOGLE-PLACES.md).

---

## Fase 8 — Alta guiada y siembra

**Objetivo:** que un dueño que nunca vio el sistema publique su catálogo solo.

**Migraciones:** `nombre_admin`, `alta_completada_en`, `rubro_bloqueado_en`.

**Entregables**

- Los cuatro pasos del alta, con progreso y guardado por paso.
- `lib/negocios/slug.ts` con verificación de disponibilidad en vivo.
- Las seis siembras de rubro en `lib/rubros/siembra/`.
- El aviso de rubro irreversible.
- `GET /api/alta/estado` y la lista de «lo que falta para publicar».
- `GET /api/catalogo/exportar`: el Excel de una hoja.
- `POST /api/plataforma/negocios/[id]/rubro`, con exportación previa.
- La importación con IA usando la categoría como esquema, con **el informe de
  cobertura**.
- **La reorganización de las pantallas del panel** según la tabla de
  [`04-PANEL.md`](04-PANEL.md) §4: Inicio, Mi negocio, Mi catálogo, Productos,
  Apariencia, Pedidos y citas, Herramientas. Estaba descrita ahí pero **no
  figuraba como entregable de ninguna fase**, que es como se pierden las cosas
  que todos dan por hechas en otro lado. Entra acá porque el alta guiada toca
  esas mismas pantallas: hacerlo dos veces sería rehacer lo primero.
- **La ficha de producto de la lista**, rehecha: miniatura a la izquierda —con
  seña de cuáles tienen más de una foto—, datos al centro, acciones a la derecha.
  Una por fila en el teléfono, con fotos y botones legibles sin acercar la
  pantalla. Entra acá y no antes porque es la lista que la reorganización mueve.
- *(Las subcategorías del catálogo se agrupan en la fase 9, junto con la carga
  al desplazar: las dos reestructuran la misma lista.)*
- **Las tarjetas de pedidos**, rehechas con la forma de las de Agenda: los
  botones de resolver a la vista, en vez de un resumen que hay que interpretar.
  El dueño con poca experiencia tiene que poder atender un pedido sin aprender
  una pantalla nueva.

**Pruebas**

- El slug: tildes, símbolos, palabras reservadas, nombre repetido.
- Cada siembra: iconos existentes, topes, claves, opciones.
- El cambio de rubro exporta antes de borrar, y **si la exportación falla no
  borra nada**.
- Lo exportado se vuelve a importar y da el mismo catálogo.
- El informe de cobertura cuenta bien los faltantes.

**Criterio de salida:** alguien ajeno al proyecto completa el alta en un teléfono,
sin ayuda y sin preguntar nada. Cronometrado.

---

## Fase 8.5 — El panel con el color del negocio

**Objetivo:** que el dueño reconozca su panel como suyo, sin perder de vista que
el panel es el administrador y el catálogo es su tienda.

Va después de la fase 8 y no antes: pintar pantallas que están por reordenarse
es pintar dos veces.

**Entregables**

- **Solo los acentos**, decidido con el dueño: la barra superior, lo que está
  elegido y los realces. **No** el fondo ni las superficies. Si el panel se
  pintara entero con la paleta del negocio, se perdería la señal que hoy
  distingue de un vistazo «estoy en mi tienda» de «estoy en el administrador».
- El mapa de cada una de las diez paletas a los roles que el panel usa y el
  catálogo no tiene: `lienzo`, `marca-fuerte`, `peligro`, `deshabilitado` y el
  degradado de las herramientas con IA.
- La paleta llega al panel desde el negocio, no desde una preferencia aparte:
  es la misma que ya se elige en Apariencia.

**Pruebas**

- El control de contraste corre sobre el panel **con las diez paletas**, no solo
  con la de MiPuesto. Hoy mide una sola combinación.
- Con la paleta oscura, la barra superior y lo elegido siguen legibles.

**Criterio de salida:** las diez paletas pasan contraste en el panel, y en
cualquiera de ellas se distingue a simple vista el panel del catálogo.

---

## Fase 9 — Refinamiento y salida

**Objetivo:** cerrar lo que se dejó anotado para el final.

**Entregables**

- `scripts/check-vocabulario.mjs` y la lista de palabras prohibidas.
- Todo el texto del sistema revisado según [`08-VOCABULARIO.md`](08-VOCABULARIO.md).
- **La portada, menos saturada**: fundir la franja de horario con la de
  confianza, cargar los productos al desplazar, revisar qué bloque sobra.
- **Las subcategorías, visibles en el catálogo**, agrupadas dentro de su
  categoría: «Bebidas» se abre en subtítulos *Gaseosas*, *Jugos*, *Aguas*.

  Hoy el panel deja crearlas y asignarles productos, pero **el catálogo no las
  dibuja**: los aplana dentro de la categoría y el nombre de la subcategoría se
  pierde. Es una regresión de la fase 6 —las seis tarjetas viejas sí dibujaban
  esa línea— y no figuraba en ninguna fase.

  **Se agrupa y no se rotula.** Una etiqueta al costado de la tarjeta la
  degradaría a un dato más, y entonces no habría forma de explicar en qué se
  diferencia de un campo de categoría. Una subcategoría es **dónde vive** el
  producto; agrupando, esa diferencia se ve sola.

  **Va en esta fase y no antes** porque toca la misma lista que la carga al
  desplazar, que está en el punto de arriba. Hacer las dos cosas por separado es
  reestructurar la lista de productos dos veces.

  Las reglas con las que no puede chocar, que es lo que hay que resolver al
  construirlo:

  | Regla que ya existe | Lo que obliga |
  |---|---|
  | Hoy la lista **pagina**, y en esta fase pasa a cargar al desplazar | Un grupo no puede partirse entre dos tandas: el subtítulo aparecería dos veces |
  | Las esferas saltan al ancla `categoria-{id}` | El ancla sigue siendo de la categoría; los subgrupos no se la pueden quedar |
  | Elegir una categoría filtra a esa sola | Filtrada, sus subgrupos se siguen viendo |
  | El anuncio va **a la mitad**, contado en categorías | Los subgrupos no cuentan: si contaran, el anuncio se correría de lugar según cómo el dueño subdivide |
  | «Otros» y la carta del día son categorías que el sistema inventa | No tienen subcategorías y no pueden quedar con un subtítulo vacío |
  | Una categoría puede tener productos **sueltos y en subcategorías a la vez** | Los sueltos van primero y **sin subtítulo**: inventarles uno —«Sin subcategoría»— le muestra al comprador un problema de organización que es del dueño |
- ~~Repaso de contraste del panel con los tokens existentes.~~ **Adelantado**:
  se hizo antes de la fase 8, el 15 de septiembre de 2026. El dueño reportó que
  el panel se veía saturado y que no se distinguía dónde termina una opción; la
  corrección 3.6 no depende de cómo queden repartidas las pantallas, así que
  esperar a la fase 9 era dejar el problema puesto sin motivo.
- **Compra del dominio**, DNS comodín, certificado y paso de ruta a subdominio,
  con las direcciones viejas redirigiendo.

**Pruebas**

- La guardia de vocabulario falla con una palabra prohibida sembrada a propósito.
- Las direcciones viejas (`/negocio`) redirigen al subdominio.
- Ningún QR impreso queda muerto.

**Criterio de salida:** los seis catálogos en `nombre.mipuesto.com`, las
direcciones viejas redirigiendo, y todas las guardias en verde.

---

## Riesgos

| Riesgo | Cómo se contiene |
|---|---|
| La Fase 5 se alarga | Es la única con dependencia dura. Si se pasa de 6 días, se despliega la agenda sin el panel de citas y se completa después |
| La poda de plantillas rompe catálogos vivos | Va sola, al final de la Fase 6, y solo después de verificar los seis en producción |
| Google Places cambia de precio | La función degrada sola: sin clave, el botón sigue sirviendo |
| El dominio tarda | La Fase 9 es la única que lo necesita. Todo lo demás funciona en ruta |
| Diez campos por categoría se quedan cortos | El tope está en un solo lugar. Subirlo es una línea, pero exige revisar la ficha en 320 píxeles |
