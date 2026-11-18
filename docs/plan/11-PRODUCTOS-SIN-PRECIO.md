# Fase 14 — Productos sin precio

Un producto se puede guardar sin precio. **Se muestra en el catálogo como
cualquier otro, pero sin precio y con un solo botón: «Consultar por
WhatsApp».** En ningún lugar que vea el cliente se dice que no tiene precio. El
dueño decide cuáles: es el que deja el precio vacío.

Escrito el 18 de noviembre de 2026 y corregido el mismo día con el dueño del
proyecto. La primera versión escondía los productos sin precio; el dueño pidió
mostrarlos, y es lo que dice este documento.

---

## 1. Por qué

### Lo que pasa hoy

- `productos.precio` es `not null` desde el esquema inicial. Un producto sin
  precio no se puede guardar.
- La lectura con IA ya lee catálogos sin precios (commit `9af2dfd`, el catálogo
  de Ferrovolt: 63 páginas, 181 productos, ninguno con precio). La revisión los
  recibe **desmarcados** y no deja crearlos hasta escribir el precio de cada uno.
- Hay negocios que no publican precios —una ferretería que cotiza, un
  importador que cambia precios cada semana— y negocios que publican unos sí y
  otros no. Hoy ninguno de los dos puede usar MiPuesto con esos productos.

### Lo que quiere el dueño, con sus palabras

- «No quiero que mencione que no tiene precio por ningún lado en el catálogo
  que ve el cliente final. Únicamente no muestra el precio, y solo tiene la
  opción de consultar por WhatsApp.»
- «Los PDFs o listas que no contengan precio se marcan en automático.»
- En un catálogo con carrito, unos productos con precio y otros sin: se sigue la
  recomendación de la sección 4 (opción A).

---

## 2. La regla

**Un producto sin precio es el que tiene `precio` nulo o 0.** Las dos cosas
significan lo mismo. Al guardar, el 0 se guarda como `null`, para que haya un
solo valor.

Un producto sin precio:

1. **Se publica igual** que uno con precio, si es visible y no está en la
   papelera. `visible` sigue siendo del dueño y no se toca.
2. **No muestra precio, y no dice que le falta.** Sin «Precio a consultar», sin
   «Consultar precio», sin «Bs 0», sin guion, sin hueco vacío donde iría el
   precio. La tarjeta se arma como si el producto nunca hubiera tenido precio.
3. **Tiene un solo botón: «Consultar por WhatsApp»**, en las tres modalidades.
4. **No entra al carrito ni a un pedido.** La base rechaza el pedido que lo traiga.
5. **No lleva promoción** ni entra en el ajuste masivo de precios.

| Modalidad | Con precio | Sin precio |
|---|---|---|
| Solo lectura (`catalogo_estatico`) | Precio, sin botón de pedir | Sin precio, con «Consultar por WhatsApp» |
| Pedido por producto (`catalogo_cta`) | Precio y «Pedir por WhatsApp» | Sin precio, con «Consultar por WhatsApp» |
| Carrito (`tienda_virtual`) | Precio y «Agregar» | Sin precio, con «Consultar por WhatsApp» |

El mensaje de WhatsApp que se prellena tampoco habla de precio:

> Hola, quiero consultar por este producto de Ferrovolt: Placa 1P horizontal 4x2.
> \<enlace al producto\>

### Qué no cambia

- **Ningún negocio que hoy funciona cambia lo que muestra.** Medido en producción
  el 2026-11-18: ningún producto vivo tiene precio 0.
- Los pedidos ya hechos no se tocan: guardan su propio precio.
- **La lógica de precios sigue viviendo solo en `lib/precios.ts`** (regla de
  `AGENTS.md`). Ningún componente decide por su cuenta si un producto tiene
  precio: lo pregunta ahí.

---

## 3. Lo que se construye

### 3.1 La base (una migración)

Nombre sugerido: `supabase/migrations/20261121090000_productos_sin_precio.sql`
(tiene que ir después de las dos de la auditoría, `20261119090000` y
`20261120090000`).

| Qué | Cambio |
|---|---|
| `productos.precio` | Admite `null`. El `check` pasa a `precio is null or precio >= 0`. Ninguna columna cambia de tipo |
| `crear_pedido_reservado` | Rechaza un renglón cuyo producto no tenga precio (`precio is null or precio = 0`) con `PRODUCTO_SIN_PRECIO`, y el pedido no se crea. Cubre el carrito que quedó guardado en un teléfono antes de que el dueño quitara el precio |
| `aplicar_ajuste_de_precios` | Salta los productos sin precio |
| Promociones | Una promoción no se aplica a un producto sin precio (en la base si hoy se valida ahí; si no, en `lib/precios.ts`) |
| Reservas de turno | Un servicio sin precio no se agenda en línea (decisión 3) |
| `productos_publicos_visibles`, `variantes_publicas_activas`, `buscar_en_directorio` | **No cambian.** El producto sin precio se publica |

La política de lectura pública **no se toca**: el producto se ve. Lo que la base
garantiza es que **no se puede comprar**: eso es lo que tiene que hacer cumplir
el motor y no la pantalla, porque una petición armada a mano salta la pantalla.

### 3.2 La lógica

- **`lib/precios.ts`**: una función `tienePrecio(producto)` —`precio > 0`— y
  `calcularPrecioProducto` que acepta `null` y devuelve «sin precio», sin
  promoción y sin subtotal. Todo componente que dibuja un precio o elige una
  acción pregunta acá.
- **`lib/catalogo/validacion.ts`**: el precio pasa a ser opcional. Vacío o 0 se
  guarda como `null`.
- **`lib/whatsapp.ts`**: `construirMensajeConsulta(negocio, producto, enlace)`
  con el texto de la sección 2. `construirMensajeProducto` deja de llamarse con
  un producto sin precio. `construirMensajePedido` sigue igual: ya solo recibe
  productos con precio.
- **Tipos**: después de la migración, `precio` llega como `number | null`.
  `npm run types:db:linked` y seguir los errores de `tsc`.

### 3.3 El catálogo público

Todos leen con la clave pública; un producto sin precio llega con `precio: null`.

| Archivo | Qué cambia |
|---|---|
| `components/templates/mipuesto/tarjeta-mipuesto.tsx` | Sin precio: no se dibuja el bloque de precio, y la acción es «Consultar por WhatsApp» |
| `components/templates/accion-producto.tsx` | Una acción nueva, `consultar`, para las tres modalidades. Lleva el ícono de WhatsApp |
| `components/catalogo/ficha-producto.tsx` y `producto-con-pedido.tsx` | La ficha y la página del producto: sin precio y con «Consultar por WhatsApp» |
| `components/catalogo/catalogo-interactivo.tsx` | No agrega al carrito un producto sin precio; la consulta abre WhatsApp aparte y registra `clic_whatsapp` |
| `components/carrito/carrito-catalogo.tsx` | Si un producto guardado en el carrito ya no tiene precio, sale del carrito con el aviso que ya existe para lo que dejó de estar disponible |
| `app/(public)/[slug]/p/[codigo]/page.tsx` | Sin precio en la página; si hay datos estructurados para buscadores, sin `offers` |
| `app/(public)/[slug]/p/[codigo]/opengraph-image.tsx` | La imagen para compartir, sin precio |
| `app/(public)/[slug]/imprimir/page.tsx` | El menú para imprimir: el renglón sin precio, sin hueco ni guion |
| Directorio (`buscar_en_directorio` y su tarjeta) | Si muestra precio, lo omite |
| Filtros u orden por precio, si existen | Los sin precio van al final de «menor a mayor», y no entran en un filtro de rango de precio |

**Cómo se comprueba que no dice nada:** una prueba de dibujo arma la tarjeta, la
ficha y la página de un producto sin precio en las tres modalidades y exige que
el HTML no contenga «precio», «Bs», «consultar precio» ni «a consultar», y que
sí contenga «Consultar por WhatsApp».

### 3.4 El panel del dueño

- **Formulario del producto**: el precio deja de ser obligatorio. Debajo: «Sin
  precio, tu catálogo lo muestra sin precio y con el botón Consultar por
  WhatsApp».
- **Lista de Productos**:
  - una etiqueta **«Sin precio»**, escrita y no solo de color (esta sí: el panel
    es del dueño);
  - un filtro «Sin precio», en la dirección como los demás filtros;
  - **ponerle precio desde la lista**, sin abrir el producto: el campo se escribe
    en la fila y se guarda al salir. Con 181 productos es la diferencia entre una
    tarde y 181 formularios.
- **Inicio**: «178 productos sin precio: tus clientes los consultan por
  WhatsApp. Ponles precio →», con el enlace al filtro. Informativo, no alarma.
- **Apariencia**: la vista previa dibuja los sin precio igual que el catálogo.
- **Promociones**: no ofrece productos sin precio.
- **Pedidos**: no cambia (opción A: un pedido nunca trae productos sin precio).

### 3.5 La importación: lo que llega sin precio se marca solo

- **Lectura con IA** (PDF y fotos): desde `9af2dfd` la IA no inventa precios. Lo
  que vuelve sin precio se crea con `precio = null`: queda marcado «sin precio»
  sin que el dueño haga nada.
- **Revisión** (`components/catalogo/revision-de-productos.tsx`): los que llegan
  sin precio vienen **marcados** y se crean sin precio, con «Sin precio» en su
  fila. Se quita el bloqueo de `9af2dfd` (`tienePrecio`, `elegidosSinPrecio`,
  `aviso-sin-precio`, el desmarcado inicial). El aviso de arriba dice: «178
  productos llegaron sin precio. Se crean igual: tus clientes los ven sin precio
  y los consultan por WhatsApp. Puedes ponerles precio después desde Productos».
  La ruta recibe `precio: null`, nunca 0.
- **Excel** (`lib/importacion/planilla.ts`): una fila sin precio ya no se
  descarta. Las plantillas (`lib/importacion/plantillas.ts`) lo dicen en «Cómo
  llenarla».
- **Exportar** (`lib/exportacion/catalogo.ts`): la columna de precio sale vacía,
  no con 0.

---

## 4. Decisiones tomadas

Aprobadas por el dueño el 2026-11-18, según la recomendación de esta tabla.

| # | Pregunta | Decisión |
|---|---|---|
| 1 | Con carrito, ¿un producto sin precio entra al carrito? | **No (opción A).** Tiene su propio «Consultar por WhatsApp», que abre una conversación aparte y no toca el carrito. El total del carrito siempre es real y el pedido nunca trae un renglón sin precio. La opción B —meterlo en el carrito como «por cotizar»— queda en la sección 8 |
| 2 | ¿Cuenta para el tope de productos del plan? | **Sí.** Se publica, tiene fotos y ocupa espacio. El catálogo de Ferrovolt (181) necesita el plan Activo |
| 3 | ¿Un servicio con turno sin precio se agenda en línea? | **No.** Muestra «Consultar por WhatsApp» en lugar del calendario |
| 4 | Producto con tallas con precio propio y sin precio base | Se trata como sin precio: «Consultar por WhatsApp». El panel avisa: «Ponle precio al producto; las tallas que cuestan distinto mantienen el suyo» |
| 5 | ¿Hace falta un interruptor aparte para «no mostrar precio»? | **No.** El precio vacío es la decisión. Un solo dato, sin dos fuentes de verdad |

---

## 5. Pruebas

Las reglas de `AGENTS.md` valen enteras: **toda guardia nueva se prueba
rompiéndola**, y `npm run test:rls:linked` al cerrar la fase.

- **Base** (base de ensayo, nunca producción; `npm run ensayo:push` y una prueba
  nueva en `supabase/tests/remote/`, como `el-dueno-no-elige-su-plan.sql`):
  - un producto con precio `null` se guarda, y uno con 0 también;
  - con la clave pública el producto sin precio **se lee**, y sus tallas también;
  - `crear_pedido_reservado` rechaza un renglón sin precio y el pedido no se
    crea; con el mismo producto con precio, el pedido sale;
  - el ajuste masivo de precios no toca los productos sin precio.
- **Unitarias** (Vitest): `lib/precios.ts` con `null` y con 0; la validación
  guarda vacío y 0 como `null`; `construirMensajeConsulta` no dice «precio»;
  la revisión crea marcados los que vienen sin precio y manda `null`.
- **Dibujo** (`.render.test.ts`): la tarjeta, la ficha y la página de producto
  sin precio en las tres modalidades —son combinaciones que nadie abre a mano—,
  con la comprobación de la sección 3.3. Y la pantalla de Productos con un
  producto sin precio: etiqueta y campo para ponerle precio.
- **A mano, en producción, con el dueño**: importar el PDF de Ferrovolt, crear
  los 181 sin precio, abrir el catálogo en el teléfono y comprobar que se ven
  sin precio y con «Consultar por WhatsApp»; ponerle precio a tres desde la
  lista y ver que esos tres muestran precio y botón de pedir o agregar.

---

## 6. Orden de trabajo

Un commit por paso, en este orden.

1. Migración de la sección 3.1, con su prueba de base. **Probada en ensayo
   antes de producción.**
2. `lib/precios.ts`, validación, `lib/whatsapp.ts` y tipos (3.2).
3. Catálogo público: tarjeta, acción, ficha, página, carrito, imagen y menú para
   imprimir, con la prueba de dibujo (3.3).
4. Panel: formulario, lista con filtro y precio en la fila (3.4).
5. Inicio, Apariencia y Promociones (3.4).
6. Importación y exportación (3.5).
7. `npm run verificar`, `npm run test:rls:linked`, y la prueba a mano.

Los pasos 1 a 3 van juntos a producción: con la migración y sin el catálogo
nuevo, un producto sin precio se dibujaría con «Bs 0».

**Estimado: un día y medio a dos días de trabajo.** Lo delicado es el paso 1,
porque toca la compra, y el 3, porque es lo que ve el cliente.

---

## 7. Criterio de salida

- Un producto sin precio se ve en el catálogo, en su página, en el directorio y
  en el menú para imprimir, **sin precio y sin ninguna mención a que le falta**,
  con «Consultar por WhatsApp» como única acción. Comprobado con la prueba de
  dibujo en las tres modalidades.
- No entra al carrito y la base rechaza un pedido que lo traiga.
- El dueño ve cuáles no tienen precio y se lo pone desde la lista.
- Los 181 productos de Ferrovolt se crean en una sola importación.
- Ningún negocio existente cambia lo que muestra.

---

## 8. Lo que queda afuera, dicho

- **Opción B, «por cotizar» en el carrito**: que el producto sin precio entre al
  mismo carrito y el pedido llegue con «total de lo que tiene precio» y
  renglones por cotizar que el dueño completa en Pedidos. Suma un día, toca el
  pedido y la reserva, y obliga a decir en el carrito que algo no tiene precio.
  Se hace si un negocio real lo pide.
- **Esconder un producto sin precio**: es la primera versión de este plan, y el
  dueño la descartó. Para esconder algo ya existe «Ocultar».
