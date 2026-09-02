# Plan de diseño — Fase 5: modalidades y horario

## Objetivo

Hacer que el catálogo comunique con claridad qué puede hacer cada cliente: solamente revisar, iniciar una consulta individual por WhatsApp o preparar varios productos en un carrito. Cuando el negocio esté cerrado, la información continúa disponible y la restricción aparece junto a la acción afectada.

## Sistema visual

- **Paletas:** cada catálogo conserva la paleta cerrada elegida en la Fase 3. El aviso usa los roles semánticos `alerta`, `texto`, `superficie` y `borde`; no incorpora colores nuevos.
- **Tipografías:** Clásica conserva Georgia y Arial, Moderna conserva Arial y Mínima conserva Trebuchet. El carrito usa la familia de interfaz del catálogo que lo contiene.
- **Escala:** solamente se usan las variables de tipografía, espaciado, bordes y radios definidas en la Fase 1.
- **Concepto de layout:** la acción aparece dentro del contexto del producto; el carrito se presenta como una lista de compra compacta debajo del catálogo y el aviso de cierre permanece visible cerca de las acciones sin bloquear la navegación.

## Comportamiento por modalidad

- **Catálogo para mostrar:** conserva fotografías, detalles y precios, pero no presenta botones para iniciar pedidos.
- **Pedidos o reservas por WhatsApp:** cada producto disponible muestra una acción descriptiva que abre WhatsApp con el negocio y producto ya identificados.
- **Tienda con carrito:** cada producto disponible puede agregarse a una lista local. La lista permite aumentar, disminuir y quitar cantidades, muestra el subtotal y prepara un mensaje consolidado para WhatsApp.
- Los productos agotados mantienen su estado escrito y no pueden iniciar acciones.

## Horario y aviso

- `sin_horario` no muestra un estado ni restringe acciones.
- `siempre_abierto` informa disponibilidad permanente y mantiene las acciones habilitadas.
- `programado` se evalúa en `America/La_Paz`, con apertura inclusiva, cierre exclusivo, varios intervalos por día y cruces de medianoche.
- Fuera de horario se muestra un aviso persistente, sobrio y no modal. El cliente puede recorrer categorías y productos; la acción individual o la confirmación del carrito quedan deshabilitadas.
- Un horario programado inválido falla de forma segura: informa que no está disponible y no permite confirmar pedidos.

## Adaptación y accesibilidad

- En 360 px, los controles del carrito se distribuyen sin desplazamiento horizontal y conservan áreas táctiles claras.
- Enlaces y botones tienen nombre accesible, foco visible y estado `disabled` real cuando no pueden usarse.
- El aviso usa texto y borde además de color. No depende únicamente del ámbar.
- Los enlaces externos indican la acción completa y abren WhatsApp sin convertir toda la tarjeta del producto en un enlace.

## Revisión contra prohibiciones de `DESIGN.md`

- El carrito es una única lista funcional, no una colección de tarjetas SaaS repetidas.
- No se agregan gradientes, sombras decorativas, animaciones de entrada, iconos ambiguos ni colores arbitrarios.
- El aviso de cierre no interrumpe con una ventana modal ni cubre el catálogo.
- Cada plantilla conserva su estructura propia; solamente comparte la lógica de acción y horario.

## Límite con la Fase 6

La Fase 5 prepara el carrito en memoria y el mensaje de WhatsApp. La Fase 6 reemplazará la confirmación directa por una operación validada en el servidor que crea el pedido, recalcula precios y reserva inventario. No se crean pedidos ni reservas en esta fase.

## Puerta visual

- Cambiar la modalidad en el panel y comprobar que el mismo catálogo pasa de solo lectura a acción individual o carrito sin modificar productos.
- Revisar los tres modos a 360 px y escritorio.
- Simular un horario cerrado: el catálogo sigue navegable, el aviso se mantiene visible y no se puede iniciar o confirmar la acción correspondiente.
- Abrir un enlace individual y uno consolidado en un celular real para comprobar que WhatsApp recibe el texto esperado.
