# Plan de diseño — Fase 3

## Pantalla

- `/dashboard/plantilla`: comparación, vista previa y selección de la plantilla del catálogo.

## Dirección visual

- **Paleta:** se mantienen los seis roles de Fase 1: marca `#1F5B63`, superficie `#FBFAF8`, texto `#15292C`, acción `#B3440E`, éxito `#1E6A45` y alerta `#8A5500`.
- **Tipografía:** se reutiliza la pila del sistema. Los nombres del negocio y de las categorías establecen la jerarquía mediante peso y escala, sin introducir otra familia.
- **Escala:** todos los tamaños de texto y espacios usan las variables existentes de `app/globals.css`.
- **Concepto:** “tres maneras de recorrer el mismo puesto”. Los mismos productos permiten comparar estructura, densidad e intención sin que el contenido altere el resultado.
- **Rasgo único:** cada plantilla nace de un contexto real: carta de restaurante, vitrina de tienda y agenda de servicios.

## Diferencias estructurales

- **Clásica:** lectura vertical similar a una carta; categorías como secciones, productos en filas y precio alineado para escaneo rápido.
- **Moderna:** portada breve y cuadrícula visual; el espacio de imagen domina y cada producto funciona como unidad de exploración.
- **Mínima:** información del negocio y contacto en primer plano; servicios en una lista tipográfica sin cuadrícula de imágenes.

Las tres reciben el mismo objeto de datos por propiedades. Ninguna plantilla consulta la base ni contiene lógica de selección.

## Selector y vista previa

- Las tres vistas se muestran juntas en escritorio y apiladas en móvil.
- Cada opción tiene un control de selección con nombre persistente y explicación breve.
- Cambiar de opción actualiza el estado local, pero no modifica el negocio hasta pulsar **Guardar plantilla**.
- El resultado de guardado se expresa con texto y no depende solo del color.
- La plantilla elegida puede modificarse después.

## Revisión contra las prohibiciones de DESIGN.md

- No hay sombras, gradientes ni una colección de tarjetas SaaS idénticas.
- Los contenedores de comparación son neutros; la diferencia visual está dentro de la estructura de cada plantilla.
- No hay etiquetas en mayúsculas, metadatos con puntos medios, flechas decorativas ni animaciones de entrada.
- Los únicos movimientos corresponden a foco, selección y guardado; respetan `prefers-reduced-motion`.
- No se añaden colores, radios, tamaños ni espacios fuera del sistema de tokens.

## Criterios de revisión

- Las tres plantillas se distinguen por estructura usando los mismos datos.
- La pantalla funciona a 360 px y en escritorio sin desplazamiento horizontal.
- Selección, foco y estado guardado son visibles con teclado y lector de pantalla.
- El valor guardado persiste al recargar la página.
- Las plantillas renderizan texto como React; no usan HTML crudo.
