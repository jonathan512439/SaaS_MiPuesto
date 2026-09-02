# Plan de diseño — Fase 3

## Pantalla

- `/dashboard/plantilla`: comparación, vista previa y selección de la plantilla del catálogo.

## Dirección visual

- **Paletas:** Mercado, Tierra, Océano y Noche reasignan roles semánticos documentados en `DESIGN.md`. El panel conserva la identidad MiPuesto.
- **Tipografía:** Clásica usa títulos editoriales con Georgia; Moderna una pila Arial/Segoe pesada; Mínima una pila humanista Trebuchet/Segoe. No se descargan fuentes externas.
- **Escala:** todos los tamaños de texto y espacios usan las variables existentes de `app/globals.css`.
- **Concepto:** “tres maneras de recorrer el mismo puesto”. Los mismos productos permiten comparar estructura, densidad e intención sin que el contenido altere el resultado.
- **Rasgo único:** cada plantilla nace de un contexto real: carta de restaurante, vitrina de tienda y agenda de servicios.

## Diferencias estructurales

- **Clásica:** carta editorial, cabecera centrada, navegación por capítulos, fotografías compactas, productos en filas y cierre de contacto sobrio.
- **Moderna:** escaparate con portada compacta, navegación horizontal, fotografías dominantes, cuadrícula y botones de compra por producto.
- **Mínima:** agenda de servicios, contacto y horario al inicio, fotografías discretas, recorrido vertical y llamada principal a reservar.

Las tres reciben el mismo objeto de datos por propiedades, incluidas exactamente las mismas fotografías. Ninguna plantilla consulta la base ni contiene lógica de selección.

## Selector y vista previa

- Se elige primero la plantilla y luego una de cuatro paletas compatibles.
- La vista activa se muestra a un ancho suficiente para simular portada, navegación, productos, botones, horario, WhatsApp y resumen de pedido; las otras plantillas conservan una muestra compacta para comparar sin cargar tres interfaces completas a la vez.
- Las tres vistas usan los mismos productos y fotografías.
- Cada opción tiene un control de selección con nombre persistente y explicación breve.
- Cambiar de opción actualiza el estado local, pero no modifica el negocio hasta pulsar **Guardar plantilla**.
- El resultado de guardado se expresa con texto y no depende solo del color.
- La plantilla elegida puede modificarse después.
- La paleta se guarda de forma independiente y también puede modificarse sin perder contenido.

## Revisión contra las prohibiciones de DESIGN.md

- No hay sombras, gradientes ni una colección de tarjetas SaaS idénticas.
- Los contenedores de comparación son neutros; la diferencia visual está dentro de la estructura de cada plantilla.
- No hay etiquetas en mayúsculas, metadatos con puntos medios, flechas decorativas ni animaciones de entrada.
- Los únicos movimientos corresponden a foco, selección y guardado; respetan `prefers-reduced-motion`.
- No se añaden colores, radios, tamaños ni espacios fuera del sistema de tokens.

## Criterios de revisión

- Las tres plantillas se distinguen por estructura, tipografía, navegación, botones y densidad usando los mismos datos.
- Las cuatro paletas funcionan en las tres plantillas: 12 combinaciones sin pérdida de contraste.
- La pantalla funciona a 360 px y en escritorio sin desplazamiento horizontal.
- Selección, foco y estado guardado son visibles con teclado y lector de pantalla.
- El valor guardado persiste al recargar la página.
- Las plantillas renderizan texto como React; no usan HTML crudo.
