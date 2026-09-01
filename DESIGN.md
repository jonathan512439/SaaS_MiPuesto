# DESIGN.md — Dirección visual de MiPuesto

Este documento es la fuente de verdad visual del producto. Codex debe leerlo antes de escribir cualquier componente de interfaz, y las reglas de aquí ganan sobre cualquier default del framework o de Tailwind.

## 1. Quién usa esto (y por qué importa)

Hay **dos audiencias con necesidades opuestas**, y el diseño de cada lado debe reflejarlo:

- **El cliente final** (quien ve el catálogo): entra desde un link de WhatsApp, en un celular de gama media, muchas veces con datos móviles limitados y a plena luz del día en la calle. Escanea, no lee. Necesita ver fotos, precios y el botón de pedir sin pensar.
- **El dueño del negocio** (quien usa el panel): no es una persona técnica. Puede tener 45-60 años, administra desde el celular entre atención y atención de clientes. Necesita que cada acción sea obvia y difícil de arruinar. Un panel "elegante pero ambiguo" es un fracaso aquí.

Regla que se desprende de esto: **el catálogo público es mobile-first obligatorio; el panel de admin también.** Nada de diseñar para escritorio y luego "adaptar".

## 2. Dirección visual: mercado boliviano, no plantilla de SaaS

El nombre y el logo ya fijan el territorio: un puesto de feria dentro de un celular. La identidad debe salir de ahí — del comercio local boliviano — no del vocabulario visual de cualquier startup.

**Punto de partida obligatorio:** el teal profundo del logo (aprox. `#1F5B63`) es el color ancla de la marca. Todo el sistema se construye a partir de él.

**Paleta base sugerida** (Codex puede ajustar los valores exactos, pero debe respetar los roles):

| Rol | Valor | Uso |
|---|---|---|
| Ancla de marca | `#1F5B63` | Encabezados, elementos de identidad |
| Superficie | `#FBFAF8` | Fondo general |
| Texto | `#15292C` | Cuerpo de texto |
| Acción | Un tono cálido y saturado, distinto del teal | Botones de pedir/agendar |
| Éxito | Verde | Confirmaciones, estado "abierto" |
| Alerta | Ámbar | Estado "reservado", vencimientos |

Los estados de producto (disponible / reservado / vendido / oculto) tienen que ser **distinguibles sin depender solo del color** — usa también texto o forma, porque el admin va a mirar esto de reojo en una pantalla con reflejo del sol.

## 3. Prohibiciones explícitas (esto es lo que hace que un diseño se vea "generado")

Codex debe evitar deliberadamente estos patrones. Son defaults, no decisiones, y aparecen sin importar el proyecto:

- **El kit de tarjetas SaaS**: todo el contenido picado en tarjetas redondeadas idénticas, el mismo `border-radius` en todo sin importar la jerarquía, la misma sombra gris suave (`rgba(0,0,0,.1)`) debajo de cada una, y gradientes usados como decoración.
- **Fondo crema (~`#F4F1EA`) con serif de alto contraste y acento terracota (~`#D97757`)** — es la combinación más reconocible de diseño generado por IA.
- **Fondo casi negro con un solo acento verde ácido o bermellón.**
- **Cromo de plantilla**: etiquetas en MAYÚSCULAS con letra espaciada encima de cada título; cadenas de metadatos unidas con puntos medios (`A · B · C`); el patrón `PALABRA — fragmento` con guion largo espaciado; negros teñidos (`#0B0B0B`, `#111`) en vez de negro real; tipografía monoespaciada para etiquetas pequeñas; una flecha `→` pegada al texto de botones y enlaces.
- **Acentuar una sola palabra del titular** en otro color, negrita o cursiva.
- **Marcadores numerados (01 / 02 / 03)** cuando el contenido no es realmente una secuencia. En el panel, los pasos de configuración inicial sí lo son; las categorías del catálogo no.
- **Animaciones de entrada tipo fade-and-slide-up en cada sección** y transiciones de hover en cada tarjeta. La animación que responde a una acción del usuario (agregar al carrito, confirmar un pedido) sí es bienvenida, porque muestra qué cambió.

## 4. Tipografía

- Una o dos familias como máximo. Si son dos, que sean claramente distintas entre sí — no dos sans parecidas.
- No hace falta una tipografía distinta para títulos y cuerpo; una sola familia bien usada con una escala de pesos clara suele ser más sólida.
- El logo ya usa una sans redondeada y gruesa: la familia del producto debe convivir con ella, no pelearse.
- Longitud de línea por debajo de 80 caracteres en textos largos (descripciones de producto, páginas informativas).
- Sentence case en toda la interfaz. Nada de MAYÚSCULAS como recurso de estilo.
- **Los precios son contenido de primera clase**, no un detalle: tratamiento tipográfico deliberado, siempre legibles de un vistazo, siempre con el mismo formato (`Bs 45` o `Bs 45,00` — elige uno y respétalo en todo el producto).

## 5. Las tres plantillas deben ser realmente distintas

Este es el punto donde es más fácil fallar. Si `clasica`, `moderna` y `minimal` son la misma cuadrícula con distintos colores, el selector de plantilla no aporta nada y el producto pierde su argumento de venta.

Cada plantilla debe diferir en **estructura**, no solo en paleta:

- **Clásica** — pensada para restaurantes: el catálogo se lee como una carta. Lista vertical, foto pequeña o ausente, énfasis en el nombre del plato y el precio, categorías como secciones de menú.
- **Moderna** — pensada para retail: la foto manda. Cuadrícula de productos, imágenes grandes, ideal para ropa, accesorios, productos donde la compra es visual.
- **Mínima** — pensada para servicios (dentistas, barberías): sin cuadrícula de productos. Lista de servicios con precio y descripción, con la información de contacto y el horario en primer plano, porque ahí la conversión es que te llamen, no que agreguen al carrito.

Que cada plantilla nazca de un rubro real es lo que evita que sean tres variantes de lo mismo.

## 6. Copy de interfaz (las palabras también son diseño)

- Nombra las cosas como las entiende el dueño del negocio, no como está construido el sistema. "Productos ocultos", no "items con visible=false". "Pedidos por confirmar", no "órdenes en estado pendiente".
- Voz activa, y el botón dice exactamente qué va a pasar: "Confirmar venta", no "Enviar". La acción conserva su nombre en todo el flujo — si el botón dice "Publicar", el mensaje de confirmación dice "Publicado".
- **Estados vacíos como invitación a actuar, no como decoración.** "Todavía no cargaste ningún producto. Empieza con el primero." con el botón al lado — no una ilustración simpática sin salida.
- **Los errores no piden disculpas y nunca son vagos.** Explican qué pasó y cómo arreglarlo: "No se pudo subir la foto: pesa más de 5 MB. Probá con una imagen más liviana."
- Todo el producto en español boliviano natural, sin tecnicismos y sin traducciones literales del inglés.

## 7. Piso de calidad (no se anuncia, se cumple)

- Responsive real hasta 360 px de ancho
- Foco de teclado visible en todos los controles
- `prefers-reduced-motion` respetado
- Contraste accesible en texto y en los indicadores de estado
- Imágenes con `alt` descriptivo (importa doble aquí: catálogo con fotos pesadas y conexiones lentas)
- Placeholders de carga que no muevan el layout cuando llega la imagen

## 8. Método de trabajo para Codex al diseñar

Antes de escribir CSS de una pantalla nueva:

1. **Escribí un plan corto de diseño**: paleta (4-6 hex con nombre y rol), tipografías por rol, concepto de layout en una frase, y qué hace única a esta pantalla.
2. **Revisá ese plan contra la sección 3.** Si alguna parte es lo que producirías para cualquier otro SaaS de catálogos, cambiala y explicá qué cambiaste y por qué.
3. Recién ahí escribí el código.
4. Al terminar, quitá un elemento decorativo. Casi siempre sobra uno.

Concentrá la audacia visual en **un solo lugar** por pantalla — el resto, disciplinado y silencioso. En el catálogo público, ese lugar es la portada del negocio. En el panel, es la lista de pedidos pendientes, porque es la pantalla que el dueño abre veinte veces al día.
