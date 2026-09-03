# Plan de diseño — Fase 7

## Objetivo

Completar el panel operativo sin convertirlo en un tablero técnico: el dueño debe poder preparar promociones y presentar su negocio con imágenes y datos reconocibles desde un celular.

## Sistema visual

- Marca y acciones principales: `#1F5B63`, mediante `--color-marca` y `--color-marca-fuerte`.
- Fondo general: `#FBFAF8`, mediante `--color-fondo`.
- Superficie de trabajo: blanco del token `--color-superficie`.
- Texto principal: `#15292C`, mediante `--color-texto`.
- Confirmación: verde de `--color-exito`; advertencia: ámbar de `--color-alerta`; errores: `--color-peligro`.
- Tipografía: pila del sistema ya definida. Precios con peso fuerte y formato único de `lib/precios.ts`.

No se agregan colores, tamaños ni espaciados fuera de los tokens existentes.

## Promociones

Concepto de layout: **mesa de ofertas**, con un formulario corto primero y una lista cronológica debajo. Cada fila responde de inmediato qué se descuenta, a qué se aplica, durante cuánto tiempo y si está vigente.

Lo distintivo de esta pantalla es el resumen de precio de ejemplo: antes de guardar muestra el efecto real del descuento y nunca permite un resultado negativo. No se repetirá el patrón de tarjetas idénticas; formulario y listado tendrán jerarquías y bordes distintos.

## Identidad del negocio

Concepto de layout: **fachada editable**, con la portada como único foco visual y el logo superpuesto de forma funcional. Los controles se agrupan por imagen, presentación, contacto y cobro.

Lo distintivo es que la previsualización usa las mismas proporciones que el catálogo público. Logo, portada y QR conservan espacio estable durante la carga; cada reemplazo informa claramente qué archivo anterior se elimina.

## Catálogo público

Las tres plantillas conservarán su estructura propia. La portada y el logo serán el único punto visual dominante; promoción y precio anterior se mostrarán junto al precio vigente sin alterar la navegación ni duplicar lógica.

## Decisiones técnicas

- Se reutiliza `lib/imagenes.ts` para validar y comprimir logo, portada y QR antes de subir.
- Se crea un bucket público `negocios`, separado de fotografías de producto porque tiene reglas y ciclo de vida distintos.
- Las rutas de archivos serán `negocio_id/tipo/uuid.ext`; nunca se sobreescribe una ruta para evitar caché obsoleta.
- El servidor sube la nueva imagen, actualiza el negocio y luego borra la anterior. Si no puede vincularla, elimina la nueva para no dejarla huérfana.
- Las promociones de producto y categoría no se acumulan: se aplica la que deje el menor precio válido. Esto evita resultados ambiguos y hace que una oferta específica pueda superar a una general.
- Una promoción comienza con `fecha_inicio` inclusiva y vence en `fecha_fin` exclusiva, siempre en UTC.
- El monto final nunca baja de cero. El cálculo canónico vive en `lib/precios.ts`; la transacción de pedidos replica únicamente la validación necesaria para no confiar en el navegador.
- La auditoría mínima se guarda en columnas de `productos` y `negocios`, como permite `SECURITY.md`, sin introducir un sistema general de logs prematuro.

## Revisión contra prohibiciones

- Sin gradientes, sombras decorativas ni mosaico de tarjetas SaaS.
- Sin etiquetas en mayúsculas, tipografía monoespaciada, guiones largos decorativos ni flechas pegadas a enlaces.
- Sin animaciones de entrada; solo estado de carga y respuesta de guardado.
- Sin colores libres elegidos por el usuario; las cuatro paletas cerradas continúan siendo la única personalización cromática.
- La decoración se concentra en la portada del catálogo y se elimina del resto del panel.

## Accesibilidad y móvil

- Flujo completo a 360 px sin desplazamiento horizontal.
- Controles con etiquetas persistentes, ayuda concreta y foco visible.
- Estado de promoción expresado con texto y forma, no solo color.
- Imágenes con texto alternativo y dimensiones reservadas.
- Los campos de fecha usan hora local del administrador y se convierten a UTC antes de guardarse.
