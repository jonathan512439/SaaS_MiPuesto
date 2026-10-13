# PROMPT MAESTRO — MiPuesto

> Punto de entrada del proyecto. Si eres un agente de código y estás leyendo esto,
> empieza por acá.

## Qué hacer ahora mismo, en este orden

1. Lee **este archivo** completo.
2. Lee **`docs/ESTADO.md`** — cómo está el proyecto hoy, en una pantalla.
3. Lee **`AGENTS.md`** — convenciones de código y prohibiciones.
4. Lee **`DESIGN.md`** — dirección visual, obligatoria antes de escribir cualquier
   interfaz.
5. Lee **`SECURITY.md`** — controles de seguridad, sobre todo la sección «Cosas que NO
   hay que hacer todavía».
6. Lee **`docs/plan/`** en el orden que dice su `README.md`. Es el plan vigente.
7. Lee **`docs/AVANCE.md`** para saber qué está cerrado y con qué evidencia.
8. Si la máquina es nueva o recién formateada, **`docs/REINSTALAR.md`** tiene qué
   instalar, qué copiar y cómo comprobar que quedó todo andando.
9. **No escribas código todavía.** Devuelve primero un resumen de lo que entendiste:
   producto, stack, en qué está el proyecto y qué vas a hacer después. Espera
   confirmación.

## El producto en un párrafo

MiPuesto es un SaaS donde negocios locales de Bolivia tienen su propio catálogo digital y
los pedidos se cierran por WhatsApp. Cada negocio elige una de tres modalidades —catálogo
estático, catálogo con acción por producto, o tienda con carrito y reserva temporal— y un
**rubro**, que trae su preset de categorías, campos y paleta. No hay pasarela de pago ni
registro de autoservicio: la suscripción se vende en persona. Moneda: bolivianos (Bs),
con dólares donde el rubro lo exige. Zona horaria: `America/La_Paz`. Dominio:
`mi-puesto.com`, con guion (el que no lo lleva es de un tercero).

## Cómo está armado

**Un solo diseño de catálogo**, la plantilla MiPuesto (`components/templates/mipuesto/`).
El dueño elige su aspecto con dos cosas cerradas: una de **tres formas de tarjeta**
—cuadrícula, fila o vitrina— y una de **dieciséis paletas** (`lib/apariencia.ts`). La
forma decide cómo se dibuja el producto; lo que se puede hacer con él lo decide la
modalidad.

**La categoría declara sus campos**: una ferretería y una veterinaria no cargan lo mismo,
y el modelo de producto no se parte por rubro.

El estado del día —qué está en producción, qué falta, qué decisiones esperan— está en
**`docs/ESTADO.md`**, no acá: este archivo cambia poco a propósito.

## Con quién estás trabajando

Un desarrollador solo, estudiante de informática, sin equipo, sin QA y con un presupuesto
de infraestructura mínimo: todo cabe en planes gratuitos salvo Workers Paid (5 dólares al
mes), que va antes del piloto. Dos consecuencias que afectan cada decisión:

- **No hay nadie más que revise tu trabajo.** Las pruebas y los controles de seguridad son
  el único mecanismo de verificación que existe.
- **Prefiere siempre la solución simple y probada** sobre la elegante. Menos dependencias,
  menos abstracciones, menos piezas móviles. Si dudas entre dos caminos, elige el que
  tenga menos cosas que puedan romperse a las tres de la mañana sin nadie para arreglarlas.

## Reglas de trabajo

**Trabaja de a una fase.** No empieces la siguiente hasta que la actual cumpla su
criterio de aceptación — verificado corriendo la app en producción, no asumido por leer
el código.

**Antes de empezar una fase**, di en voz alta: qué archivos vas a tocar, qué decisiones
técnicas estás tomando y por qué, y qué riesgos de `SECURITY.md` aplican.

**Al terminar una fase**, entrega: el criterio de aceptación verificado con el paso a
paso de cómo lo comprobaste, los controles de seguridad marcados como cumplidos o
pendientes con motivo, un commit por tarea, y una lista corta de lo que quedó pendiente.

**Cada cambio se despliega a producción para validarlo.** Empujar a `main` despliega
solo (Workers Builds), así que **primero la migración, después el código**: si sale el
código antes, lo que usa la migración responde 500. Desde el 2026-10-13 una guardia lo
frena (`scripts/check-migraciones-aplicadas.mjs`).

**Si algo del plan te parece equivocado, dilo antes de implementarlo.** No lo ejecutes
en silencio ni lo cambies por tu cuenta.

**Si una tarea es ambigua, pregunta en vez de asumir.** Una suposición arrastrada tres
fases cuesta mucho más que una pregunta.

## Definición de «terminado»

1. El código compila y la app corre sin errores en consola.
2. La funcionalidad se probó **en un teléfono real, en producción**, no solo se escribió.
3. Las pruebas que corresponden a esa tarea pasan (`docs/plan/07-PRUEBAS.md`).
4. Los controles de seguridad de la fase se cumplieron.
5. La interfaz respeta los tokens de `DESIGN.md`: sin colores, tamaños ni espaciados fuera
   del sistema.
6. Está commiteada.

Escribir el código es aproximadamente la mitad del trabajo. La otra mitad es verificar que
hace lo que dice hacer.

## Secretos

`GEMINI_API_KEY` va **solo** en `.env.local` y como secreto del Worker de Cloudflare.
Nunca con prefijo `NEXT_PUBLIC_`, nunca en código que llegue al navegador, nunca pegada en
una conversación. Lo verifica `scripts/check-client-secrets.mjs` y falla el build.
