# Plan de diseño — Fase 4: catálogo

## Objetivo

Permitir que una persona no técnica organice categorías, subcategorías, productos y fotografías desde el celular, y que el resultado aparezca de inmediato en el enlace público de su negocio.

## Panel administrativo

- La navegación incorpora **Catálogo** como sección principal. Categorías y productos conviven en una sola pantalla para evitar saltos innecesarios.
- En móvil el flujo es lineal: resumen, organización, productos y formulario. En escritorio la organización ocupa una columna auxiliar y los productos la columna principal.
- Las categorías se presentan como una lista jerárquica sobria, no como una cuadrícula de tarjetas. Las acciones de editar, mover y borrar siempre llevan texto.
- El alta y edición de producto utiliza un formulario amplio con secciones numeradas reales: información, organización, disponibilidad y fotografías.
- El interruptor de visibilidad aparece junto al estado escrito **Visible** u **Oculto**; nunca depende solo del color.
- Los estados vacíos explican la siguiente acción: crear la primera categoría o el primer producto.

## Fotografías

- Hasta cuatro imágenes por producto, mostradas en una tira numerada con vista previa, peso final y acción explícita para quitar.
- Se aceptan JPEG, PNG y WebP de hasta 5 MB antes de comprimir.
- El navegador corrige orientación mediante decodificación, limita el lado mayor a 1600 px y genera WebP antes de subir.
- El servidor acepta como máximo 2 MB por archivo comprimido, verifica la firma WebP/JPEG/PNG y genera la ruta; nunca conserva el nombre original.
- Una fotografía eliminada o un producto borrado desaparecen también de Supabase Storage.

## Catálogo público

- La ruta `/{slug}` carga únicamente negocios activos y productos visibles.
- Se reutilizan la plantilla y paleta elegidas en la Fase 3. Las plantillas reciben los datos por propiedades y no consultan Supabase.
- Categorías y subcategorías ordenan el contenido. Los productos sin categoría quedan en **Otros** y los que no tienen fotografía muestran un espacio reservado legible.
- La primera fotografía representa al producto en la vista general; las restantes quedan disponibles en el contrato para una galería posterior.
- La Fase 4 muestra el catálogo navegable. El comportamiento de pedir, agendar o usar carrito se habilita en las Fases 5 y 6.

## Adaptación y accesibilidad

- Ancho mínimo verificado: 360 px, sin desplazamiento horizontal.
- Todos los formularios tienen etiquetas persistentes, ayuda, errores asociados y foco visible.
- Los botones de orden usan texto **Subir** y **Bajar**. No se incorpora arrastrar y soltar ni una dependencia adicional.
- Las confirmaciones destructivas nombran el elemento y explican qué ocurrirá con productos o fotografías.

## Revisión contra prohibiciones de `DESIGN.md`

- No se usa una cuadrícula repetitiva de tarjetas para toda la administración: la jerarquía se expresa con listas, separadores y paneles solo donde existe una agrupación real.
- No se introducen colores, sombras, radios, tamaños ni espaciados fuera de los tokens existentes.
- No hay gradientes, adornos decorativos, etiquetas técnicas ni iconos sin texto.
- La interfaz mantiene español boliviano natural y acciones directas.

## Puerta visual

- Crear una categoría, una subcategoría y un producto completo desde 360 px.
- Editar, reordenar, ocultar y volver a mostrar el producto sin perder contexto.
- Subir cuatro fotografías, eliminar una y borrar el producto comprobando que no quedan archivos.
- Abrir `/{slug}` en móvil y escritorio y confirmar que solo aparecen productos visibles con la apariencia guardada.

## Ajuste de usabilidad posterior a la primera validación

- La cabecera administrativa usa dos niveles en móvil: identidad y salida en la primera fila, navegación amplia en la segunda. En escritorio se convierte en una sola fila sin comprimir las etiquetas.
- La marca MiPuesto conserva un símbolo y nombre visibles; **Salir** reemplaza el texto largo del cierre de sesión sin cambiar su nombre accesible.
- La navegación emplea etiquetas breves y completas: **Negocio**, **Diseño** y **Catálogo**. La sección activa se distingue por fondo, borde y texto, no solo por color.
- Las categorías muestran cinco elementos por página. Cambiar de página evita una lista móvil interminable y cada categoría despliega sus subcategorías únicamente al seleccionarla.
- Se retiran **Subir** y **Bajar** de las categorías por no aportar suficiente valor en el flujo cotidiano. El orden interno se conserva para compatibilidad, pero la interfaz prioriza búsqueda visual y edición.
- Las acciones genéricas se reemplazan por nombres explícitos: **Crear categoría**, **Cambiar nombre**, **Eliminar categoría** y **Crear subcategoría**.
- Al abrir el formulario de producto, la vista se desplaza hacia él y enfoca el nombre. El cambio visible confirma que el botón respondió incluso cuando el formulario estaba fuera de pantalla.
