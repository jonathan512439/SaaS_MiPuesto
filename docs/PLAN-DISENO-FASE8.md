# Plan de diseño — Fase 8

## Objetivo

Ordenar la interfaz completa: que el catálogo público se recorra en dos columnas
desde un celular de 320 px, que el resumen del pedido explique de verdad qué se
está comprando, y que el panel deje de leerse como una suma de pantallas con
criterios distintos.

## Sistema visual

- Se completó la escala de espaciado (`5`, `7`, `10`, `14`, `20`, `24`, `32`).
  Varias hojas ya usaban esos pasos y el navegador los descartaba en silencio.
- Se agregaron `--radius-tarjeta`, `--sombra-elevada`, `--sombra-flotante`,
  `--color-foco`, `--alto-barra-panel`, `--ancho-panel` y `--ancho-lectura`.
- El tema del catálogo deriva de los ocho colores de cada paleta: bordes,
  fondos, texto tenue, velo y sombras. Ninguna paleta repite valores.
- No se agregan colores, tipografías ni tamaños fuera de los tokens.

## Catálogo público

Concepto de layout: **cuadrícula de dos columnas en móvil** para las tres
plantillas, que crece a tres y cuatro columnas en pantallas mayores. Lo que
cambia entre plantillas es la ficha, no la cantidad de columnas:

- **Clásica** — ficha editorial: fotografía 4:3, título en serif recortado a dos
  líneas y una banda tenue con el precio cerrando la tarjeta, como el margen
  derecho de una carta impresa. Las categorías siguen siendo capítulos.
- **Moderna** — escaparate: fotografía cuadrada a sangre, precio grande y botón
  de acción sólido al pie de cada tarjeta.
- **Mínima** — directorio: fichas centradas sobre fondo hundido, fotografía
  circular y acción como botón de contorno. La sección conserva su guía vertical.

En las tres, la acción queda anclada al pie de la ficha para que las filas de la
cuadrícula terminen alineadas aunque los nombres tengan distinto largo, y todo
texto largo se recorta con `line-clamp` en vez de desbordar la tarjeta.

## Resumen del pedido y acceso al carrito

El bloque «Tu selección / Pedido por WhatsApp» pasa a ser un panel cerrado con
cabecera en color de marca, miniatura por artículo, control de cantidad en
pastilla y un cierre de totales que dice cuántas unidades y cuántos productos
entran en el subtotal. Es la única pieza del catálogo con elevación, porque es
donde el cliente decide.

**Ver pedido** deja de ser una etiqueta suelta: es una barra anclada al pie con
contador de unidades, resumen de productos y subtotal, y el contenedor reserva
espacio abajo para que nunca tape el último producto.

## Panel administrativo

- Las cinco pantallas comparten contenedor, ancho, respiro y encabezado. Antes
  convivían anchos de 64, 72 y 76 rem y dos formas distintas de titular.
- La barra superior queda fija y sus cinco secciones pasan a pastillas
  desplazables: repartirlas en cuatro columnas iguales cortaba las etiquetas.
- **Semana de atención**: un renglón por día. Los días cerrados ocupan una sola
  línea y los abiertos muestran sus horas en la misma fila. El recuadro vive en
  la lista y no en el `fieldset`, para que el borde no se corte con la leyenda.
- **Pedidos** es el único lugar con jerarquía fuerte: fichas cerradas con banda
  de estado y los pendientes destacados, porque es la pantalla que el dueño abre
  veinte veces al día.
- El ritmo vertical lo marca el contenedor de página; los bloques dejan de traer
  su propio margen superior.

## Paletas

Tierra pasa a cacao profundo (`#5A3722`) con acción de ladrillo (`#A8341A`):
marca y acción eran dos marrones casi iguales. Océano estrena un acento
frambuesa (`#B03562`) para no repetir el óxido de las otras dos paletas claras.
Las cuatro conservan contraste AA verificado por `test:contraste`.

## Revisión contra las prohibiciones de `DESIGN.md`

- No hay gradientes decorativos ni animaciones de entrada; las transiciones
  siguen respondiendo a acciones del usuario.
- Se quitaron las mayúsculas ornamentales de las portadas de Moderna y Mínima y
  el punto medio que unía metadatos en el acceso al pedido.
- Los radios ya no son idénticos: control, tarjeta, panel y hoja marcan
  jerarquías distintas.
- La audacia visual se concentra en la portada del catálogo y en los pedidos
  pendientes del panel; el resto queda disciplinado.
- Elemento decorativo retirado: la tarjeta destacada a doble ancho de Moderna,
  que rompía la lectura de la cuadrícula sin aportar información.

## Accesibilidad y móvil

- Recorrido completo a 320 px sin desplazamiento horizontal.
- Objetivos táctiles de al menos `2.5rem` en controles secundarios y
  `--control-alto` en las acciones principales.
- Estados de producto y de pedido con texto y fondo propios, no solo color.
- El acceso al pedido anuncia unidades y subtotal en su `aria-label`.
