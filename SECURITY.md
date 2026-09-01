# SECURITY.md — Seguridad, pruebas y controles de MiPuesto

Este documento define los controles que se aplican en cada fase del proyecto. No son recomendaciones: son parte del criterio de aceptación de cada fase.

## Contexto de riesgo

MiPuesto es multi-tenant: muchos negocios comparten una sola base de datos. Eso concentra el riesgo en un lugar muy específico — **el aislamiento entre negocios**. Un error ahí no es un bug visual, es un negocio leyendo los pedidos, precios y clientes de otro. Es el único fallo de este proyecto que podría costarte la reputación con la que vendés, así que recibe atención desproporcionada respecto a su tamaño en código.

El proyecto **no procesa pagos ni guarda tarjetas**, lo que elimina toda una categoría de riesgo. Pero sí guarda datos personales de terceros (nombre y teléfono de clientes que hacen pedidos), lo cual implica responsabilidades de privacidad reales.

## Estrategia de pruebas para un desarrollador solo

Sin equipo ni QA, escribir pruebas para todo es irreal y te va a frenar. La estrategia es **cobertura desigual y deliberada**: pruebas automáticas donde un error es caro y silencioso, prueba manual donde un error es obvio a simple vista.

| Qué | Cómo se prueba | Por qué |
|---|---|---|
| Políticas RLS (aislamiento entre negocios) | Automática, obligatoria | Un fallo es invisible hasta que es un desastre |
| Cálculo de precios y promociones | Automática, obligatoria | Un error se traduce en plata mal cobrada |
| Expiración de reservas | Automática, obligatoria | Depende del tiempo; no se puede probar a ojo |
| Generación del link de WhatsApp | Automática (formato) + manual (celular real) | El formato se testea; que abra bien WhatsApp, no |
| Lógica de horario abierto/cerrado | Automática | Casos borde de medianoche y zona horaria |
| Interfaz y flujos visuales | Manual, con checklist | Automatizarlo cuesta más de lo que ahorra a esta escala |

Herramienta sugerida: Vitest para la lógica pura (`lib/`), y un script de pruebas contra una base de Supabase local para RLS. Nada de Cypress/Playwright por ahora — el costo de mantenimiento no se justifica todavía.

## Controles por fase

### Fase 0 — Setup
- `.env.local` en `.gitignore` desde el primer commit. Verificá que ninguna clave haya entrado nunca al historial de git.
- `SUPABASE_SERVICE_ROLE_KEY` nunca en código con prefijo `NEXT_PUBLIC_`, nunca importada en un componente de cliente.
- RLS activado en **todas** las tablas en la misma migración que las crea. Una tabla sin RLS en Supabase es pública.
- Configurar el linter para que falle el build si detecta `service_role` en código de cliente.
- **Control de auditoría:** correr `git log -p | grep -i "service_role\|anon_key"` y confirmar que no hay secretos en el historial.

### Fase 1 — Sistema de diseño
- Contraste de color verificado en los tokens: texto normal 4.5:1, texto grande 3:1.
- Los indicadores de estado (disponible/reservado/vendido/oculto) no dependen solo del color.
- Foco de teclado visible en todos los componentes base.

### Fase 2 — Autenticación (fase de máximo riesgo)
- **Pruebas de RLS automatizadas, no negociables.** Escribir un script que: cree dos usuarios con un negocio cada uno, y verifique que el usuario A no puede leer, actualizar ni borrar ninguna fila de las 7 tablas del usuario B. Este script se corre de nuevo al final de **cada** fase posterior, porque una migración nueva puede romper una política vieja.
- Longitud mínima de contraseña y verificación de email activadas en Supabase Auth.
- Límite de intentos de login (Supabase lo trae; confirmá que está habilitado).
- El flujo de recuperación de contraseña no revela si un email existe o no en el sistema.
- Validación de slug también **del lado del servidor**, no solo en el formulario: lista negra de slugs reservados y formato estricto.
- **Control de auditoría:** documentar en el repo qué política RLS protege cada tabla y qué prueba la cubre.

### Fase 3 — Plantillas
- Las plantillas reciben datos por props y no ejecutan HTML crudo. Si en algún momento hace falta renderizar contenido del negocio como HTML, sanitizarlo primero — la descripción de un negocio es entrada de usuario.

### Fase 4 — Catálogo e imágenes
- Validación de tipo de archivo **por contenido, no por extensión**. Un `.jpg` renombrado no es una imagen.
- Peso máximo antes de comprimir (rechazar >5 MB) y después de comprimir.
- Políticas de Storage: un admin solo puede subir y borrar archivos en la carpeta de su propio negocio.
- Los nombres de archivo se generan del lado del sistema (UUID), nunca se usa el nombre que trae el usuario.
- Borrado del archivo en Storage al eliminar o reemplazar una imagen, verificado explícitamente.
- Límite de cantidad de productos por negocio, configurable — protege tu cuota gratuita de un uso desmedido.
- **Control de auditoría:** consulta que liste archivos en Storage sin producto asociado, para correr cada tanto y detectar huérfanos.

### Fase 5 — Modalidades
- La modalidad se valida en el servidor al procesar un pedido: un negocio en modo `catalogo_estatico` debe rechazar un pedido aunque alguien fuerce la petición desde fuera de la interfaz.

### Fase 6 — Carrito y reservas (segunda fase de mayor riesgo)
- **El total del pedido se recalcula en el servidor.** Nunca confíes en el total que manda el cliente — es el vector de abuso más obvio de todo el sistema.
- Los precios se leen de la base al momento de crear el pedido, no del carrito del navegador.
- Límite de pedidos por IP y por ventana de tiempo, para evitar que alguien reserve todo el inventario de un negocio por diversión.
- El teléfono del cliente se valida en formato, y se guarda solo si el cliente lo ingresó.
- La Edge Function de expiración es idempotente: correrla dos veces seguidas no debe producir efectos distintos.
- Confirmar y cancelar un pedido verifica que el pedido pertenezca al negocio del admin que hace la acción.
- **Prueba automática obligatoria:** pedido con `expira_en` en el pasado → tras correr la función, pedido en `expirado` y productos en `disponible`.

### Fase 7 — Panel completo
- Las promociones no pueden generar precios negativos: validación en base (`check`) y en `lib/precios.ts`.
- El QR de cobro que sube el negocio es una imagen y pasa las mismas validaciones que las fotos de producto.
- Los cambios de configuración de un negocio se aplican solo al negocio del admin autenticado, verificado en el servidor.

### Fase 8 — Plataforma
- `eventos_analitica` permite inserción anónima pero **no** lectura anónima. Sin esto, cualquiera puede leer las métricas de todos los negocios.
- Límite de escritura de eventos por sesión, para que la tabla de analítica no sea un vector para llenar tu base de datos gratuita.
- El directorio público expone solo campos pensados para ser públicos — revisá la consulta columna por columna, no uses `select *`.
- Cabeceras de seguridad configuradas en Cloudflare Pages: `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`.

### Fase 9 — Cierre
- Correr la suite completa de pruebas de RLS por última vez.
- Revisar que ninguna variable de entorno de producción esté en el repo.
- Verificar SSL y redirección de HTTP a HTTPS.
- Probar el flujo completo en un celular real con datos móviles, no en el navegador de escritorio.
- **Auditoría final:** recorrer este documento entero y marcar cada control como cumplido o justificadamente omitido.

## Privacidad de datos de clientes finales

Los negocios afiliados van a tener nombres y teléfonos de sus clientes en tu base de datos. Eso implica:

- No guardar más datos de los necesarios para procesar el pedido.
- El negocio ve solo los datos de sus propios pedidos (cubierto por RLS).
- Definir y aplicar un plazo de retención: los pedidos confirmados o expirados con más de X meses se pueden anonimizar (borrar nombre y teléfono, conservar el resto para estadística).
- Tener una respuesta preparada si un cliente final pide que borres sus datos.

## Registro de auditoría mínimo

No hace falta un sistema de logs completo, pero sí dejar rastro de las acciones que cambian dinero o estado:

- Quién confirmó o canceló cada pedido y cuándo
- Cambios de precio de productos (fecha y valor anterior)
- Activaciones y desactivaciones de negocios

Con guardar esto en columnas de la tabla correspondiente alcanza en esta etapa. Sirve para resolver disputas con un negocio sin depender de tu memoria.

## Cosas que NO hay que hacer todavía

Parte de gestionar el riesgo es no gastar esfuerzo donde no hace falta:

- No construyas roles y permisos múltiples por negocio. Un admin por negocio hasta que alguien lo pida.
- No hagas pruebas end-to-end automatizadas. El costo de mantenimiento supera el beneficio a esta escala.
- No implementes autenticación de dos factores todavía. Sí, cuando manejes negocios con volumen real.
- No construyas un panel de super-admin para vos mismo en las primeras fases. Usá la consola de Supabase directamente; construilo cuando administrar a mano te empiece a doler.
