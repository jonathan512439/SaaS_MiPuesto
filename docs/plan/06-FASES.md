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

**Criterio de salida:** en producción, una remera en tres tallas con stock
distinto, y el pedido dice cuál.

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

- Logo y subnombre en la cabecera, en lugar del emoji.
- Banners con eyebrow, título, bajada y botón. **El de abajo, opcional.**
- Las diez paletas, alcanzando cabecera, fondo y tarjetas.
- Patrón armado con los iconos de las categorías, con opacidad de 0 a 30.
- `POST /api/negocios/maps/resolver` y el botón de Google.
- La tarea semanal de `pg_cron` y el tope duro de consultas.
- Vista previa en vivo en todo el panel de apariencia.

**Pruebas**

- Las diez paletas pasan contraste en las tres superficies.
- Sin `GOOGLE_PLACES_API_KEY`, el botón aparece sin número.
- `maps_visible` no se puede activar sin `place_id`.
- La opacidad 31, rechazada.
- Sin categorías, el patrón cae al del rubro.
- La tarea está declarada en `tareas_programadas`.

**Criterio de salida:** en producción, un negocio con logo, dos banners, paleta
propia, patrón al 12 % y su calificación de Google.

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

## Fase 9 — Refinamiento y salida

**Objetivo:** cerrar lo que se dejó anotado para el final.

**Entregables**

- `scripts/check-vocabulario.mjs` y la lista de palabras prohibidas.
- Todo el texto del sistema revisado según [`08-VOCABULARIO.md`](08-VOCABULARIO.md).
- **La portada, menos saturada**: fundir la franja de horario con la de
  confianza, cargar los productos al desplazar, revisar qué bloque sobra.
- Repaso de contraste del panel con los tokens existentes.
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
