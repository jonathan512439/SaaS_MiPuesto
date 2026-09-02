# Plan de diseño — Fase 2

## Pantallas

- `/login`: acceso de administradores invitados.
- `/recuperar-clave`: solicitud de correo de recuperación.
- `/actualizar-clave`: definición de una contraseña nueva desde una sesión de recuperación.
- `/dashboard/configuracion`: alta y edición de los datos básicos del negocio.

## Dirección visual

- **Paleta:** se conservan los seis roles de Fase 1: marca `#1F5B63`, superficie `#FBFAF8`, texto `#15292C`, acción `#B3440E`, éxito `#1E6A45` y alerta `#8A5500`.
- **Tipografía:** pila del sistema ya definida; títulos en peso 800, controles en 700 y texto corriente en 400.
- **Escala:** se reutilizan únicamente las variables tipográficas y de espaciado de `app/globals.css`.
- **Concepto:** “mostrador de acceso”. Una franja teal identifica el producto y explica el siguiente paso; el formulario se presenta como una superficie de trabajo plana y directa, no como una tarjeta flotante.
- **Rasgo único:** en autenticación, la franja de marca funciona como señal de entrada privada. En configuración, un resumen lateral muestra qué verá el cliente cuando el perfil esté publicado.

## Revisión contra las prohibiciones de DESIGN.md

- No se usa el kit de tarjetas SaaS: no hay mosaicos repetidos, sombras ni gradientes.
- No hay etiquetas decorativas en mayúsculas, metadatos con puntos medios ni flechas pegadas a enlaces.
- Los pasos numerados se reservan al alta inicial, donde sí existe una secuencia real.
- No se introducen colores, radios, tamaños ni espaciados fuera de los tokens existentes.
- El movimiento solo comunica estado de carga y respeta `prefers-reduced-motion`.
- Se concentra la identidad visual en una sola franja de marca; el resto permanece silencioso y funcional.

## Criterios de revisión

- Flujo completo utilizable a 360 px y escritorio sin desplazamiento horizontal.
- Etiquetas persistentes, mensajes de error accionables y foco visible.
- Estados de éxito y error expresados con texto y símbolo, no solo con color.
- El mensaje de recuperación es idéntico exista o no el correo.
