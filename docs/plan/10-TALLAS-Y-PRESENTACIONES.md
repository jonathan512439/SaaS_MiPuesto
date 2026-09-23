# Fase 13 — La talla llega al pedido

Tallas de ropa (S, M, L), números de calzado (38, 40, 40,5, 42) y tamaños
(3 kg, 7,5 kg) que se eligen, se reservan, se cobran y le llegan al dueño. Con
existencias propias por presentación y sin que dos compradores se lleven el
último par.

Escrito el 23 de septiembre de 2026. Reemplaza lo que la fase 4 dejó anotado
como «lo que quedó fuera» en [`06-FASES.md`](06-FASES.md).

---

## 1. Por qué es una fase y no un arreglo

### Lo que pasa hoy

La fase 4 construyó las presentaciones pensando en el pedido de a un producto
por WhatsApp, y ahí funcionan: el mensaje dice «Remera lisa (M)» con su precio.
**En los negocios con carrito (`tienda_virtual`) no funcionan**, y el error no
se ve desde el panel:

| Qué hace el comprador | Qué pasa |
|---|---|
| En la página del producto elige «7,5 kg» | El precio en pantalla cambia al de la bolsa grande |
| Toca «Agregar» | Se agrega el producto **sin la presentación**: `alAgregarProducto(producto.id)` |
| Envía el pedido | El servidor recalcula con el **precio base del producto**. Si la bolsa grande cuesta más, el pedido sale con el precio menor |
| Agrega desde la tarjeta del catálogo | Se agrega sin elegir nada |
| El dueño abre el pedido | No sabe qué talla le pidieron |

Y por debajo:

- Las existencias por presentación **no participan de la reserva**. Se reserva
  sobre `productos.cantidad_stock`, y las de cada presentación son un número que
  el dueño anota para sí.
- `pedido_items` tiene `unique (pedido_id, producto_codigo)`: **un pedido no
  puede llevar el mismo producto en dos tallas.**
- La regla de [`AGENTS.md`](../../AGENTS.md) —«si un producto tiene variantes,
  su `cantidad_stock` es `null` por restricción de la base»— **no está en la
  base**. Hoy son dos fuentes de verdad que pueden contradecirse.

### Por qué ahora

En producción hay **un solo producto con presentaciones**: el «Vaso de agua» de
Broaster SAOLITO, con una presentación «Grande» a Bs 15 y sin control de
existencias. Y hay 29 renglones de pedidos históricos, todos sin presentación.
Cambiar el modelo hoy no obliga a convertir datos de nadie. El día que haya una
zapatería con cuarenta modelos en diez números cada uno, sí.

---

## 2. Lo que se construye

### 2.1 El tipo de presentación

Una remera, una zapatilla y una bolsa de alimento no se eligen igual. Cada
producto declara **qué tipo** de presentación tiene, y el tipo decide cómo se
pregunta, cómo se ordena y qué se acepta:

| Tipo | Se pregunta | Se ordena | Se acepta | Ejemplo |
|---|---|---|---|---|
| `talla` | «Elegí tu talla» | XS, S, M, L, XL, XXL, XXXL, Única; lo demás al final en el orden del dueño | Las de la lista, y texto libre para lo que no esté («2 años») | Remera, pantalón |
| `numero` | «Elegí tu número» | De menor a mayor | Números de 16 a 50, enteros o con medio: `38`, `38,5`. Se escriben `38.5` y `38½` y se guardan como `38,5` | Zapatilla, sandalia, bota |
| `tamano` | «Elegí el tamaño» | En el orden del dueño | Texto libre | 3 kg, 7,5 kg, Familiar |
| `presentacion` | «Elegí una opción» | En el orden del dueño | Texto libre | Lo que no es ninguna de las tres |

**En la base:** `productos.tipo_presentacion text not null default
'presentacion'` con `check` sobre los cuatro valores. La normalización y el
orden viven en `lib/catalogo/variantes.ts` y se validan **también en la base**
para `numero`: un disparador rechaza lo que no sea un número de 16 a 50 con
medio opcional, y dos presentaciones que valen lo mismo (`40` y `40,0`).

**El calzado en Bolivia se numera en europeo** (35 a 45 adulto). Las tallas
americanas —«US 8»— no son un `numero`: van como `presentacion`, con el texto
que ponga el dueño. Mezclar los dos sistemas en una misma lista ordenada
produciría un orden sin sentido.

**Atajos en el editor**, para no escribir diez números a mano:

- Tallas: «XS a XL», «S a XXL».
- Números: «Dama 35 a 40», «Varón 38 a 45», «Niños 20 a 34», y la casilla
  «con medios números».

El atajo carga la lista; el dueño borra los que no tiene.

### 2.2 El tope sube de 12 a 24

Doce entraban las tallas de una remera, pero no un calzado: de 35 a 45 con
medios números son 21. El tope pasa a **24**, en el disparador
`limitar_variantes_por_producto` y en `MAXIMO_VARIANTES`, con prueba de que los
dos dicen lo mismo.

### 2.3 Una sola fuente de verdad para las existencias

Si el producto controla existencias y tiene presentaciones visibles:

- `productos.cantidad_stock` y `productos.cantidad_reservada` quedan en `null` y `0`.
- Cada presentación visible **tiene que** tener su `cantidad_stock` (cero es un
  número válido: «no me quedan»).
- `variantes_producto` suma `cantidad_reservada integer not null default 0`, con
  `check (cantidad_reservada between 0 and coalesce(cantidad_stock, 0))`.

Lo sostiene la base con disparadores en las dos tablas, no la aplicación: se
puede escribir con la clave privilegiada y saltarse la ruta.

**Agotado** deja de ser una columna y pasa a ser un cálculo: un producto con
presentaciones está agotado cuando **todas** sus presentaciones visibles lo
están. Agotar la M no agota la L.

### 2.4 El pedido guarda la presentación

En `pedido_items`:

- `variante_id uuid` que referencia `variantes_producto(id)` con
  `on delete set null`: si el dueño borra la talla, el pedido viejo no se rompe.
- `variante_nombre text` y `tipo_presentacion text`: la **copia** de lo que se
  pidió, por la misma razón que el renglón ya copia nombre y precio. Es lo que
  se cobró y lo que el dueño tiene que leer aunque mañana cambie.
- `unique (pedido_id, producto_codigo)` se reemplaza por
  `unique nulls not distinct (pedido_id, producto_codigo, variante_id)`: la M y
  la L del mismo producto son dos renglones.
- Un índice para las reservas activas por presentación, igual al que ya existe
  por producto.

### 2.5 El motor de compra: las cinco piezas

| Pieza | Qué cambia |
|---|---|
| `crear_pedido_reservado` | Recibe `{producto_id, variante_id, cantidad}`. Un producto con presentaciones visibles **exige** `variante_id` (`PRESENTACION_REQUERIDA`). La presentación tiene que ser de ese producto, de ese negocio y visible (`PRESENTACION_NO_DISPONIBLE`). Reserva sobre la presentación. |
| El precio | `coalesce(variante.precio, producto.precio)`. La promoción del catálogo alcanza a las presentaciones **sin** precio propio y no a las que lo fijaron, que es la regla que ya aplica `lib/catalogo/publico.ts` y que `private.calcular_precio_producto` tiene que respetar igual. El navegador no manda precios; si los manda, se ignoran. |
| Confirmar (`cambiar_estado_pedido_admin`) | Descuenta de la existencia de la presentación y libera su reserva. |
| Cancelar | Libera la reserva de la presentación. |
| Expirar (`expirar_reservas_vencidas`) | Libera la reserva de la presentación. Una reserva que ya expiró y después se confirma no se devuelve dos veces. |

**Concurrencia:** las filas se bloquean con `for update` y **siempre en el mismo
orden** —por `id`, primero productos y después presentaciones— para que dos
pedidos que se cruzan no se esperen el uno al otro para siempre.

### 2.6 La ruta y la validación

`/api/pedidos` acepta `varianteId` por renglón y lo valida con el mismo tipo
que la base (`lib/pedidos/validacion.ts`). La firma del pedido (`firma.ts`)
incluye la presentación: dos pedidos iguales en todo menos la talla son dos
pedidos distintos. El pedido guardado en la sesión (`pedido-guardado.ts`)
acepta los renglones viejos sin presentación.

### 2.7 El catálogo

**La página del producto**

- El selector muestra botones, no un desplegable: se ven todas las tallas de un
  vistazo, que es como se elige un número de calzado.
- La etiqueta sale del tipo: «Elegí tu número».
- Una presentación agotada se ve tachada **y** dice «Agotado» —el color no es el
  único indicador—, y no se puede elegir.
- Con tres o menos: «Quedan 2».
- **Nada preseleccionado.** «Agregar» queda deshabilitado hasta elegir, con el
  motivo escrito al lado: «Elegí tu número». Preseleccionar la primera haría que
  quien no mira pida la 35 sin saberlo.
- El precio cambia con la elección, como hoy.

**La tarjeta del catálogo**

- Un producto con presentaciones no se agrega desde la tarjeta: el botón dice
  «Elegir talla» (o «número», o «tamaño») y lleva a su página.
- Si las presentaciones tienen precios distintos, el precio dice «Desde Bs 120».
- Si están todas agotadas, la tarjeta dice «Agotado».

**El carrito**

- Cada renglón es producto más presentación: «Zapatilla Runner · N.º 40 ×1» y
  «Zapatilla Runner · N.º 41 ×1» son dos renglones.
- El máximo por renglón sale de lo que queda de esa presentación.

**El mensaje de WhatsApp**

- `1 × Zapatilla Runner (N.º 40,5) — Bs 280`
- `2 × Remera lisa (Talla M) — Bs 160`
- `1 × Alimento adulto (7,5 kg) — Bs 250`

### 2.8 El panel

- **Editor de presentaciones:** el tipo arriba, los atajos, la existencia de
  cada una obligatoria si el producto controla existencias, y el orden
  automático para tallas y números.
- **Al activar presentaciones en un producto que ya tenía existencias:** el
  editor pide repartirlas y no deja guardar hasta que la suma esté puesta. No se
  inventa un reparto.
- **La lista de productos** muestra «3 de 6 tallas agotadas».
- **Pedidos:** cada renglón dice su presentación.
- **La importación por planilla** no carga presentaciones en esta fase: queda
  dicho en la ayuda de la importación.

---

## 3. Decisiones tomadas

**El color no es una presentación.** Una zapatilla negra y una blanca son dos
productos: cada una tiene sus fotos, y la foto es lo que se compra. Combinar
color por talla en un mismo producto —una matriz de 5 × 10— multiplica el
editor, el selector y el motor por dos, para un caso que se resuelve con dos
productos. Se vuelve a pensar si un cliente real lo necesita.

**Una sola dimensión por producto.** Talla, o número, o tamaño. Nunca dos.

**Medios números con coma:** `40,5`, como se escribe en Bolivia. La base
normaliza lo que llegue.

**La presentación se copia en el pedido.** Borrar o renombrar una talla no
cambia lo que dice un pedido viejo.

---

## 4. Migración de datos

- El único producto con presentaciones queda con tipo `tamano` y sin control de
  existencias. No hay stock que repartir.
- Los 29 renglones históricos quedan con `variante_id` nulo, y siguen siendo
  válidos: la nueva restricción de unicidad los acepta tal cual.
- No hay carritos guardados que convertir: el carrito vive en la memoria de la
  página, y lo único que se guarda en la sesión es el pedido ya enviado, que
  acepta la forma vieja.

Antes de aplicar la migración en la base real se vuelve a contar: si para
entonces algún negocio cargó presentaciones con existencias, se decide con él
cómo quedan.

---

## 5. Pruebas

La regla de siempre vale doble acá: **cada guardia se prueba rompiéndola a
propósito** antes de darla por hecha.

### 5.1 Unitarias (Vitest)

- Normalizar números: `38.5`, `38½`, `38,5` → `38,5`. Rechazar `38,3`, `15`,
  `51`, `treinta`.
- Duplicados equivalentes: `40` y `40,0` no pueden estar juntos.
- Ordenar: tallas en su orden canónico con lo libre al final; números de menor a
  mayor; tamaños en el orden del dueño.
- Los atajos generan exactamente la lista que dicen, con y sin medios números.
- El tope de 24 es el mismo número en la base y en `lib/`.
- La clave del renglón del carrito separa la M de la L.
- El mensaje de WhatsApp con cada tipo, con y sin precio propio.
- El precio de una presentación, con y sin promoción, y la regla de que la
  promoción no toca una presentación con precio fijo.
- La validación del pedido: presentación requerida, presentación de otro
  producto, cantidad.

### 5.2 Base de datos (base local y de ensayo)

- Crear un pedido con presentación reserva **solo** esa presentación.
- Agotar la M no agota la L; agotar todas agota el producto.
- Un pedido con la M y la L del mismo producto se guarda en dos renglones.
- Rechazados, cada uno con su código:
  - Producto con presentaciones visibles sin elegir → `PRESENTACION_REQUERIDA`.
  - Presentación de otro producto, de otro negocio u oculta → `PRESENTACION_NO_DISPONIBLE`.
  - Pedir más de lo que queda.
- Un precio manipulado en la petición no cambia lo que se cobra.
- Confirmar descuenta de la presentación; cancelar y expirar liberan su reserva.
- Expirar y después confirmar no devuelve dos veces.
- La restricción de fuente única: un producto con presentaciones no puede
  quedar con `cantidad_stock` propia, ni una presentación visible sin la suya.
- La presentación número 25 se rechaza.
- Borrar una presentación con pedidos deja el pedido con su nombre copiado.

### 5.3 Concurrencia (base de ensayo, nunca producción)

- **Veinte compradores a la vez por el último par del 40:** gana exactamente uno.
- **Cincuenta pedidos mezclados** contra 10 pares del 40 y 10 del 41: ninguna
  existencia baja de cero y la suma de reservas nunca pasa del stock.
- Un pedido que expira mientras el dueño lo confirma: una sola devolución.
- Dos pedidos que se cruzan con las mismas dos presentaciones en orden inverso:
  ninguno queda trabado.

### 5.4 Aislamiento (`test:rls:linked`)

- Las presentaciones y las reservas del negocio A no se leen ni se escriben
  desde el negocio B.
- Un visitante no puede crear un pedido con una presentación de otro negocio.

### 5.5 Dibujo (`.render.test.ts`)

Son combinaciones que nadie va a abrir a mano:

- La página del producto con los cuatro tipos, en las tres modalidades, con y
  sin agotados.
- La tarjeta con presentaciones en las tres formas: cuadrícula, fila y vitrina.
- El carrito con dos presentaciones del mismo producto.

### 5.6 A mano, en producción

En el negocio de prueba, con carrito:

1. Una remera en S a XXL con existencias distintas.
2. Una zapatilla del 38 al 44 con 40,5.
3. Un alimento en 3 kg y 7,5 kg con precios distintos, uno con promoción.

Después:

- Un pedido mezclado de las tres.
- El mensaje de WhatsApp dice cada presentación con su precio.
- El panel muestra el pedido con sus presentaciones.
- Las existencias bajan al confirmar y vuelven al cancelar.
- Todo revisado en un teléfono de 360 px.

---

## 6. Orden de trabajo

Un commit por paso, y cada paso desplegado antes del siguiente:

| Paso | Qué | Se verifica con |
|---|---|---|
| 13.1 | Modelo: tipo, tope 24, fuente única de existencias, reservas por presentación, renglón del pedido con presentación | 5.2 y 5.4 |
| 13.2 | El motor de compra, las cinco piezas | 5.2 y 5.3 |
| 13.3 | La ruta, la validación y la firma del pedido | 5.1 |
| 13.4 | El editor del panel: tipos, atajos, reparto de existencias | 5.1 y a mano |
| 13.5 | El catálogo: página, tarjeta, carrito y mensaje | 5.1 y 5.5 |
| 13.6 | Pedidos en el panel | a mano |
| 13.7 | Pruebas de punta a punta y validación en producción | 5.6 |

---

## 7. Criterio de salida

En producción, en un negocio con carrito:

- Un pedido con dos números distintos de la misma zapatilla y una talla de
  remera llega por WhatsApp con cada presentación y su precio.
- Las existencias de cada presentación bajan al confirmar y vuelven al cancelar.
- Ninguna de las pruebas de concurrencia deja una existencia negativa.
- `test:rls:linked` en verde, y cada guardia nueva probada rompiéndola.

## 8. Lo que queda afuera, dicho

- Color por talla en un mismo producto (ver §3).
- Cargar presentaciones desde una planilla.
- Una guía de tallas por negocio: medidas en centímetros por talla.
