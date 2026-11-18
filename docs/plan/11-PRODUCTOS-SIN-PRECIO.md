# Fase 14 — Productos sin precio

Un producto se puede guardar sin precio. **Sin precio, o con precio 0, no se
muestra en el catálogo**: queda en el panel, con sus fotos y sus datos, hasta
que el dueño le pone uno. El dueño decide cuáles: es el que deja el precio vacío.

Escrito el 18 de noviembre de 2026, a pedido del dueño del proyecto.

---

## 1. Por qué

### Lo que pasa hoy

- `productos.precio` es `not null` desde el esquema inicial. Un producto sin
  precio no se puede guardar.
- La lectura con IA ya lee catálogos sin precios (`9af2dfd`, el de Ferrovolt:
  181 productos, ninguno con precio). La revisión los recibe **desmarcados** y
  no deja crearlos hasta que el dueño escriba el precio de cada uno. Con 181,
  son 181 precios antes de poder guardar nada.
- Un catálogo de proveedor trae marca, fotos y datos técnicos, pero el precio
  lo pone el negocio, y cambia. El dueño quiere cargar todo ahora y ponerle
  precio de a poco.

### Lo que no se construye

No es la «vitrina» con «Precio a consultar». Un producto sin precio **no se ve**,
no se ve con otra etiqueta. Si algún día se quiere mostrar sin precio, es otra
decisión y otra fase (sección 8).

---

## 2. La regla

**Un producto se publica si es visible, no está en la papelera y su precio es
mayor que cero.** `null` y `0` significan lo mismo: «todavía sin precio».

La regla vive **en la base**, en la política que ya decide qué ve un visitante
(`productos_publicos_visibles`), y no en las pantallas. Todas las páginas
públicas leen con la clave pública (`crearClienteSupabasePublico`): el
catálogo, la página de cada producto, su imagen para compartir, el menú para
imprimir y el mapa del sitio. Cambiar la política las cubre a todas de una vez,
y una pantalla nueva que se olvide del filtro no puede saltárselo.

Es la regla 3 del [README](README.md) —«nada se muestra si no es cierto»—: un
precio 0 en pantalla dice «gratis», y no es cierto.

### Qué no cambia

- **`visible` sigue siendo del dueño.** Un producto sin precio no se marca
  oculto: se le pone precio y aparece solo. Si el dueño lo había ocultado a
  propósito, sigue oculto.
- **Ningún negocio que hoy funciona pierde un producto.** Medido en producción
  el 2026-11-18: ningún producto vivo tiene precio 0.
- Los pedidos ya hechos no se tocan: guardan su propio precio.

---

## 3. Lo que se construye

### 3.1 La base (una migración)

| Qué | Cambio |
|---|---|
| `productos.precio` | Pasa a admitir `null`. El `check` queda en `precio is null or precio >= 0` |
| `productos_publicos_visibles` | Suma `and precio > 0` (`null > 0` no es verdadero, así que cubre los dos casos) |
| `variantes_publicas_activas` | La misma condición sobre el producto: las tallas de un producto sin precio no se ven |
| `buscar_en_directorio` | Suma `p.precio > 0` donde hoy filtra `p.visible and p.eliminado_en is null` |
| `crear_pedido_reservado` | Rechaza un producto sin precio con `PRODUCTO_SIN_PRECIO`. Cubre el carrito que quedó guardado en un teléfono antes de que el dueño le quitara el precio |
| `registrar_evento_analitica` | No cuenta clics de un producto que no se publica |
| `aplicar_ajuste_de_precios` | Salta los que no tienen precio: subir un 10 % a `null` no tiene sentido |
| Promociones | Una promoción no se aplica a un producto sin precio |

El tope de productos del plan **los cuenta igual** (decisión 1, sección 4).

### 3.2 La lógica y la validación

- `lib/catalogo/validacion.ts`: el precio pasa a ser opcional. Vacío o 0 se
  guarda como `null`; así hay un solo valor para «sin precio» y no dos.
- `lib/precios.ts`: `calcularPrecioProducto` acepta `null` y devuelve «sin
  precio», sin promoción ni total. Toda la lógica de precios sigue ahí.
- Tipos: después de la migración, `precio` llega como `number | null` en todo el
  panel. El catálogo público no cambia de tipo: lo que lee con la clave pública
  siempre tiene precio, y se estrecha una vez en `lib/catalogo/pagina-publica.ts`.

### 3.3 El panel

- **Formulario del producto**: el precio deja de ser obligatorio. Debajo, sin
  alarma: «Sin precio, este producto no se muestra en tu catálogo».
- **Lista de Productos**:
  - una etiqueta **«Sin precio · no se publica»**, escrita y no solo de color;
  - un filtro «Sin precio», en la dirección como los demás filtros;
  - **ponerle precio desde la lista**, sin abrir el producto: el campo se escribe
    en la fila y se guarda. Es lo que convierte «181 productos sin precio» en
    una tarde de trabajo y no en 181 formularios.
- **Inicio / Mi catálogo**: «12 productos sin precio no se ven en tu catálogo»,
  con el enlace al filtro.
- **Apariencia**: la vista previa muestra lo mismo que el catálogo público, sin
  los productos sin precio.
- **Promociones**: no ofrece productos sin precio.

### 3.4 La importación

**Lo que llega sin precio queda marcado solo como «no se publica».** Pedido
por el dueño: un PDF, una foto o una lista sin precios no tiene que publicar
nada que no tenga precio, sin que el dueño lo marque uno por uno.

- **Lectura con IA** (PDF y fotos): la IA ya no inventa precios —ni 0 ni uno
  razonable— desde `9af2dfd`. El producto que vuelve sin precio se crea con
  `precio = null`, y por la regla de la sección 2 no se publica. No hace falta
  ningún indicador aparte: «sin precio» **es** «no se publica».
- **Revisión** (Excel y lectura con IA): los que llegan sin precio vienen
  **marcados** y se crean sin precio, con la etiqueta «Sin precio · no se
  publica» en su fila. El aviso cambia a: «48 productos llegaron sin precio. Se
  crean igual y no se ven en tu catálogo hasta que les pongas uno desde
  Productos». Se quita el bloqueo de `9af2dfd`. Si el dueño escribe un precio en
  la revisión, ese producto se publica al crearse.
- **Excel**: una fila sin precio ya no se descarta. Las plantillas lo dicen.
- **Exportar el catálogo**: la columna de precio sale vacía, no con 0.

---

## 4. Decisiones tomadas

Aprobadas por el dueño el 2026-11-18, según la recomendación de esta tabla.

| # | Pregunta | Decisión |
|---|---|---|
| 1 | ¿Un producto sin precio cuenta para el tope del plan (150 en Catálogo)? | **Sí.** Existe, tiene fotos y ocupa espacio. Si no contara, el tope se saltaría guardando todo sin precio. El catálogo de Ferrovolt (181) necesita el plan Activo igual |
| 2 | Un producto con tallas con precio propio y sin precio base, ¿se publica? | **No**, con aviso: «ponle precio al producto; las tallas que cuestan distinto mantienen el suyo». Una sola regla en la base, sin excepciones |
| 3 | Un servicio con turno sin precio, ¿se puede reservar? | **No**, por la misma regla: no se ve, no se reserva |

---

## 5. Pruebas

- **Base** (ensayo, después `test:rls:linked`):
  - con la clave pública no se lee un producto con precio `null` ni uno con 0, ni
    sus tallas, ni aparece en el directorio;
  - el mismo producto, al ponerle precio, aparece sin tocar nada más;
  - `crear_pedido_reservado` rechaza un renglón sin precio, y el pedido no se crea.
  - **Se prueba rompiéndola**: sin el `precio > 0` en la política, la prueba
    tiene que fallar.
- **Unitarias**: `lib/precios.ts` con `null`; la validación guarda vacío y 0
  como `null`; la revisión crea marcados los que vienen sin precio, y manda
  `precio: null` —no 0— a la ruta de productos.
- **Dibujo** (`.render.test.ts`, es pantalla grande del panel): Productos con un
  producto sin precio muestra la etiqueta y el campo para ponerle precio.
- **A mano, en producción**: cargar el PDF de Ferrovolt, crear los 181 sin
  precio, comprobar que el catálogo público está vacío, ponerle precio a tres
  desde la lista y ver que aparecen esos tres y solo esos.

---

## 6. Orden de trabajo

Un commit por paso, en este orden. Los pasos 1 y 2 van juntos a producción: la
migración sin la validación nueva no rompe nada (nadie manda `null` todavía), y
la validación sin la migración fallaría al guardar.

1. Migración de la sección 3.1, con su prueba de base. Probada en ensayo.
2. Validación, `lib/precios.ts` y tipos (3.2).
3. Panel: formulario, lista con su filtro y el precio en la fila (3.3).
4. Inicio, Apariencia y Promociones (3.3).
5. Importación y exportación (3.4).
6. Prueba a mano con Ferrovolt, y `npm run test:rls:linked`.

**Estimado: un día y medio a dos días de trabajo.** La parte delicada es el paso
1, porque toca la compra; el resto es panel.

---

## 7. Criterio de salida

- Un producto sin precio o con precio 0 no aparece en el catálogo, ni en su
  página, ni en el directorio, ni en el menú para imprimir, y no se puede
  pedir. Lo garantiza la base, comprobado con la clave pública.
- El dueño ve en Productos cuáles no tienen precio y se lo pone desde la lista.
- Los 181 productos de Ferrovolt se crean en una sola importación.
- Ningún negocio existente cambia lo que muestra.

---

## 8. Lo que queda afuera, dicho

- **Mostrar un producto sin precio** («Precio a consultar», con botón de
  WhatsApp): es lo contrario de esta fase. Si se pide, se suma como opción por
  negocio sin tocar la regla de la base para los demás.
- **Precio por presentación sin precio base** (decisión 2): se revisa si un
  rubro real lo necesita.
