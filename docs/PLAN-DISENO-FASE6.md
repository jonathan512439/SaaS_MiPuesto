# Plan de diseño — Fase 6: pedidos y reservas

## Objetivo

Convertir la selección local en una reserva verificable sin hacer que el cliente cree una cuenta. El comprador debe entender qué se reservará, durante cuánto tiempo y con qué código continuará por WhatsApp. El dueño debe encontrar primero los pedidos que requieren una decisión.

## Sistema visual

- **Paletas:** el catálogo conserva la paleta elegida por el negocio. El panel usa únicamente los roles base de MiPuesto: marca, superficie, texto, acción, éxito y alerta.
- **Tipografías:** cada plantilla conserva su familia. El formulario de confirmación y el panel usan la tipografía de interfaz existente.
- **Escala:** se reutilizan los tokens de tipografía, espaciado, bordes, radios y controles de la Fase 1.
- **Concepto del catálogo:** una sola lista de compra termina en un bloque de confirmación progresivo: datos opcionales, información de reserva, QR si existe y acción final.
- **Concepto del panel:** los pedidos pendientes forman la zona visual prioritaria; el resto se recorre como historial compacto y legible.

## Flujo del comprador

- Antes del listado puede elegir una categoría en un selector que sigue siendo manejable aunque existan decenas de categorías.
- Se muestran doce productos por página y, tras agregar el primero, un acceso fijo lleva directamente al resumen sin recorrer todo el catálogo.
- Puede cambiar cantidades y revisar el subtotal antes de reservar.
- Nombre y teléfono son opcionales; si se escribe un teléfono debe tener un formato boliviano válido.
- La acción final comunica que primero se reserva y luego se abre WhatsApp.
- El servidor vuelve a leer precios, existencias, modalidad y horario. El navegador no decide el total ni la disponibilidad.
- Una reserva exitosa muestra su código, vencimiento y total calculado antes de continuar a WhatsApp.
- El QR de cobro aparece antes de confirmar cuando el negocio lo configuró; no se interpreta como pago verificado.

## Flujo del administrador

- La lista del catálogo muestra diez productos por página y permite seleccionar fotografías durante el alta del producto.
- En Configuración puede elegir entre `Sin horario publicado`, `Siempre abierto` y `Horario programado`, definir hasta tres intervalos por día y ajustar la duración de cada reserva.
- Cada fila muestra código, fecha, cliente si fue informado, artículos, total, vencimiento y estado escrito.
- Un pedido pendiente permite "Confirmar venta" o "Cancelar pedido". Los demás estados son solo lectura.
- Confirmar descuenta definitivamente las unidades reservadas. Cancelar o expirar libera únicamente esas unidades.
- La interfaz informa quién realizó el cambio y cuándo, sin depender solo del color del estado.

## Códigos y stock

- El producto recibe un código estable para identificarlo sin depender de nombres repetidos.
- El pedido recibe un código corto visible en el panel y en WhatsApp.
- `cantidad_stock` representa existencias físicas y `cantidad_reservada` las unidades apartadas por pedidos pendientes. La disponibilidad es la diferencia entre ambas.
- La ficha pública muestra esa disponibilidad solo cuando el producto controla existencias.
- Un producto sin control de stock se registra en el pedido, pero nunca se bloquea ni cambia de estado por una reserva.

## Adaptación y accesibilidad

- A 360 px, resumen, cantidades, datos del cliente y acciones se apilan sin desplazamiento horizontal.
- Los estados combinan texto y forma. Los botones deshabilitados conservan una explicación cercana.
- Los mensajes de error indican si cambió el precio, se agotó una unidad, cerró el negocio o se alcanzó el límite temporal.
- El foco permanece visible y el estado de envío se anuncia mediante una región viva.

## Revisión contra prohibiciones de `DESIGN.md`

- El panel no convierte cada dato en una tarjeta idéntica; usa una lista operativa y un detalle jerárquico.
- No se agregan gradientes, sombras decorativas, iconos ambiguos ni animaciones de entrada.
- Los códigos son información funcional, no etiquetas monoespaciadas decorativas.
- La única zona de énfasis del panel es la lista de pedidos pendientes.

## Puerta visual

- Crear un pedido desde un catálogo a 360 px, ver el código y abrir el mensaje correcto en WhatsApp.
- Confirmar un pedido desde el panel y comprobar que deja de ofrecer acciones.
- Cancelar otro y verificar que el stock vuelve a estar disponible.
- Esperar o forzar el vencimiento de una reserva y comprobar que pasa a `expirado` sin intervención manual.
- Intentar confirmar fuera de horario y comprobar que el carrito se conserva, se explica el motivo y no se crea ningún pedido.
