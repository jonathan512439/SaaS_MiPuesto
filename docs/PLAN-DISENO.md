# Plan de diseño — MiPuesto

Este documento fija el sistema visual de la Fase 1. Toda pantalla posterior debe reutilizar estos tokens y componentes; no puede introducir valores visuales aislados.

## Concepto

**Un mostrador boliviano dentro del celular.** La interfaz se organiza en franjas claras y listas fáciles de recorrer con una mano. La identidad se concentra en la cabecera del negocio; el resto es directo, legible y silencioso.

## Paleta base

| Token | Valor | Rol |
|---|---:|---|
| Marca | `#1F5B63` | Identidad, encabezados y acciones secundarias |
| Superficie | `#FBFAF8` | Fondo general cálido y luminoso |
| Texto | `#15292C` | Texto principal, bordes derivados y superficies oscuras |
| Acción | `#B3440E` | Pedir, agendar y acciones principales |
| Éxito | `#1E6A45` | Disponible, confirmaciones y estado abierto |
| Alerta | `#8A5500` | Reservas, vencimientos y atención requerida |

Los fondos suaves, divisores y estados deshabilitados se derivan de esta paleta mediante mezcla u opacidad y también se exponen como tokens. No se agregan hexadecimales sueltos en los componentes.

## Tipografía

- Familia única: `system-ui`, con alternativas nativas. Evita una descarga adicional y funciona bien en celulares de gama media.
- Peso 800 para títulos de producto o pantalla, 700 para subtítulos y precios, 600 para controles, 400 para cuerpo.
- Escala cerrada: 12, 14, 16, 20, 24, 32 y 40 px.
- Alturas de línea: compactas en títulos y precios; amplias en cuerpo. Los textos largos no superan 80 caracteres por línea.
- Precios: formato consistente `Bs 45,00`, peso 800 y cifras tabulares.

## Espaciado y forma

- Escala cerrada: 0, 4, 8, 12, 16, 24, 32, 48 y 64 px.
- Controles: radio de 10 px para que se perciban accionables.
- Paneles y estados vacíos: radio de 16 px, borde visible y sin sombra repetida.
- Hoja modal: 24 px solo en las esquinas superiores, porque emerge desde el borde inferior.
- Indicadores de estado: forma de cápsula únicamente porque contienen texto breve de estado.
- Altura táctil mínima de controles: 44 px.

## Layout

- Mobile-first desde 360 px.
- Contenido principal con ancho máximo de 1120 px y márgenes fluidos.
- En celular, listas y muestras ocupan una sola columna; la cuadrícula aparece solo cuando el espacio realmente permite comparar.
- Las secciones se separan con ritmo, títulos y divisores, no convirtiendo cada bloque en una tarjeta idéntica.

## Componentes base

1. Botón: principal, secundario, discreto y peligro; estados normal, hover, activo, foco, carga y deshabilitado.
2. Campo: etiqueta visible, ayuda, error explícito y control deshabilitado.
3. Indicador: disponible, reservado, vendido y oculto; cada uno combina símbolo, forma y texto.
4. Hoja modal: diálogo nativo, apertura desde abajo, cierre explícito y foco administrado por el navegador.
5. Toast: información, éxito, advertencia y error; usa `status` o `alert` según urgencia.
6. Estado vacío: mensaje que explica el siguiente paso y acción contigua.
7. Esqueleto: conserva el espacio final y desactiva la animación con `prefers-reduced-motion`.

## Revisión contra las prohibiciones de DESIGN.md

- Se descartó una portada formada por tarjetas flotantes: la página usa franjas, listas y divisores; solo los ejemplos que necesitan un límite semántico reciben borde.
- Se descartaron gradientes y sombras grises decorativas. La profundidad de la hoja modal proviene de su superposición y borde superior.
- Se descartó la combinación crema/serif/terracota: la superficie es casi blanca, la tipografía es sans nativa y el acento cálido se reserva para acciones.
- No hay etiquetas en mayúsculas espaciadas, metadatos con puntos medios, flechas decorativas ni números que finjan una secuencia.
- No se acentúa una palabra aislada del titular.
- El movimiento solo comunica carga, apertura o confirmación; no hay animaciones de entrada por sección.
- Se retiró un elemento decorativo previsto: la trama de fondo inspirada en tejidos. La marca tendrá un único foco visual en futuras portadas, sin añadir ruido al sistema base.

## Controles de aceptación

- Contraste automático mínimo: 4.5:1 para texto normal y 3:1 para texto grande.
- Foco de teclado visible con doble señal: contorno y separación.
- Estado comprensible sin color mediante texto y símbolo.
- Movimiento desactivable con `prefers-reduced-motion`.
- Página `/estilos` revisada a 360 px y en escritorio.
