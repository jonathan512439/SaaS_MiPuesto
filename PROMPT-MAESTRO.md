# PROMPT MAESTRO — MiPuesto

> Este archivo es el punto de entrada del proyecto. Si sos un agente de código y estás leyendo esto, empezá por acá.

## Qué hacer ahora mismo, en este orden

1. Leé **este archivo** completo.
2. Leé **`AGENTS.md`** (convenciones de código y prohibiciones).
3. Leé **`DESIGN.md`** (dirección visual — obligatoria antes de escribir cualquier interfaz).
4. Leé **`SECURITY.md`** (controles de seguridad, pruebas y auditoría por fase).
5. Leé **`planning-mipuesto-v2.md`** (las 9 fases con sus criterios de aceptación).
6. **No escribas código todavía.** Devolvé primero un resumen de lo que entendiste: producto, stack, en qué fase está el proyecto, y qué vas a hacer en la fase que sigue. Esperá confirmación.

## El producto en un párrafo

MiPuesto es un SaaS donde negocios locales de Bolivia —restaurantes, tiendas, dentistas, barberías— tienen su propio catálogo digital, y los pedidos se cierran por WhatsApp. Cada negocio elige una de tres modalidades: catálogo estático (solo mostrar), catálogo con botón de pedir/agendar por producto, o tienda virtual con carrito y reserva temporal de inventario. No hay pasarela de pago ni registro de autoservicio: la suscripción se vende en persona. Moneda: bolivianos (Bs). Zona horaria: `America/La_Paz`. Dominio: `mipuesto.com`.

## Con quién estás trabajando

Un desarrollador solo, estudiante de informática, sin equipo, sin QA y sin presupuesto de infraestructura. Todo el stack tiene que caber en planes gratuitos. Esto tiene dos consecuencias que afectan cada decisión que tomes:

- **No hay nadie más que revise tu trabajo.** Las pruebas y los controles de seguridad no son opcionales ni "para después": son el único mecanismo de verificación que existe en este proyecto.
- **Preferí siempre la solución simple y probada** sobre la elegante. Menos dependencias, menos abstracciones, menos piezas móviles. Si dudás entre dos caminos, elegí el que tenga menos cosas que puedan romperse a las 3 de la mañana sin nadie para arreglarlas.

## Reglas de trabajo

**Trabajá de a una fase.** El planning tiene 9 fases. Cada una tiene tareas y un criterio de aceptación explícito. No empieces la fase siguiente hasta que la actual cumpla su criterio — verificado corriendo la app, no asumido por leer el código.

**Antes de empezar una fase**, decí en voz alta:
- Qué archivos vas a crear o modificar
- Qué decisiones técnicas estás tomando y por qué
- Qué riesgos de `SECURITY.md` aplican a esta fase

**Al terminar una fase**, entregá:
- El criterio de aceptación verificado, con el paso a paso de cómo lo comprobaste
- Los controles de seguridad de esa fase, marcados como cumplidos o pendientes con motivo
- Un commit por tarea, con mensajes descriptivos
- Una lista corta de lo que quedó pendiente o merece revisión humana

**Si algo del planning te parece equivocado, decilo antes de implementarlo.** No lo ejecutes en silencio ni lo cambies por tu cuenta. El planning fue pensado con cuidado, pero puede tener errores, y sos vos quien va a ver el código de cerca.

**Si una tarea es ambigua, preguntá en vez de asumir.** Una suposición incorrecta arrastrada tres fases cuesta mucho más que una pregunta.

## Definición de "terminado"

Una tarea está terminada cuando:

1. El código compila y la app corre sin errores en consola
2. La funcionalidad se probó manualmente en el navegador, no solo se escribió
3. Las pruebas que corresponden a esa tarea (ver `SECURITY.md`) pasan
4. Los controles de seguridad de la fase se cumplieron
5. La interfaz respeta el sistema de tokens de `DESIGN.md` — sin colores, tamaños ni espaciados fuera del sistema
6. Está commiteada

Escribir el código es aproximadamente la mitad del trabajo. La otra mitad es verificar que hace lo que dice hacer.

## Cómo empezar

Si el repositorio está vacío, la fase actual es la **Fase 0**. Si ya hay código, revisá el estado del repo y los commits para determinar en qué fase está antes de proponer nada.

En cualquier caso: primero el resumen de comprensión, después el plan de la fase, después el código. Nunca al revés.
