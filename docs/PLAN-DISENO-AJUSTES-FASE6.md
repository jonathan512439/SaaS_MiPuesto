# Plan de diseño — ajustes de cierre de Fase 6

## Objetivo

Evitar recorridos extensos en catálogos grandes y permitir que el administrador configure las condiciones necesarias para probar una reserva real.

## Sistema visual

- Se conservan las cuatro paletas cerradas del catálogo y los seis roles de color existentes.
- El panel reutiliza exclusivamente los tokens de tipografía, espaciado, bordes, radios y foco de la Fase 1.
- La navegación pública usa una franja funcional: selector nativo de categoría, cantidad de resultados y paginación de doce productos.
- El acceso al carrito es compacto y permanece visible después de agregar el primer artículo.
- El horario se presenta como una lista semanal. Cada día abierto contiene sus intervalos y cada día cerrado ocupa una sola fila.

## Decisiones de interacción

- Un selector nativo escala mejor que cuarenta botones y sigue siendo usable con teclado y lector de pantalla.
- Cambiar de categoría vuelve a la primera página; cambiar de página no borra el carrito.
- La lista administrativa muestra diez productos por página.
- Las fotografías pueden seleccionarse durante el alta. El producto se crea primero para obtener su identificador y después se suben las imágenes preparadas al Storage.
- Los productos con control de existencias informan las unidades realmente disponibles; los servicios o productos sin control no muestran una cantidad ficticia.

## Revisión contra `DESIGN.md`

- No se agregan tarjetas decorativas, gradientes, sombras nuevas, mayúsculas ornamentales ni animaciones de entrada.
- La franja de navegación y el acceso al carrito existen por necesidad operativa, no como decoración.
- La portada de cada plantilla continúa siendo el foco visual del catálogo.
