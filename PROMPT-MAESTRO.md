# PROMPT MAESTRO — MiPuesto

> Punto de entrada del proyecto. Si sos un agente de código y estás leyendo esto, empezá
> por acá.

## Qué hacer ahora mismo, en este orden

1. Leé **este archivo** completo.
2. Leé **`AGENTS.md`** — convenciones de código y prohibiciones.
3. Leé **`DESIGN.md`** — dirección visual, obligatoria antes de escribir cualquier
   interfaz.
4. Leé **`SECURITY.md`** — controles de seguridad, sobre todo la sección final «Cosas que
   NO hay que hacer todavía».
5. Leé **`docs/plan/`** en el orden que dice su `README.md`. Es el plan vigente.
6. Si la máquina es nueva o recién formateada, **`docs/REINSTALAR.md`** tiene qué instalar,
   qué copiar y cómo comprobar que quedó todo andando.
6. Leé **`docs/AVANCE.md`** para saber qué está cerrado y con qué evidencia.
7. **No escribas código todavía.** Devolvé primero un resumen de lo que entendiste:
   producto, stack, en qué fase está el proyecto y qué vas a hacer en la que sigue.
   Esperá confirmación.

## El producto en un párrafo

MiPuesto es un SaaS donde negocios locales de Bolivia tienen su propio catálogo digital y
los pedidos se cierran por WhatsApp. Cada negocio elige una de tres modalidades —catálogo
estático, catálogo con acción por producto, o tienda con carrito y reserva temporal— y un
**rubro**, que trae su preset de categorías, campos, armazón y paleta. No hay pasarela de
pago ni registro de autoservicio: la suscripción se vende en persona. Moneda: bolivianos
(Bs), con dólares donde el rubro lo exige. Zona horaria: `America/La_Paz`. Dominio
previsto: `mipuesto.com`.

## En qué está el proyecto

Los planes anteriores **están cerrados y borrados**. Lo vigente es `docs/plan/`, que
adopta el frontend de `Catalogos_Ejemplo/` —un sitio real, no un juego de imágenes— como
el único diseño de catálogo del sistema.

Dos decisiones lo ordenan todo: **un solo diseño**, sin plantillas ni formas de tarjeta
elegibles, y **la categoría declara sus campos**, porque el modelo actual de producto no
alcanza para una ferretería ni para una veterinaria.

El plan tiene **nueve fases y 40 días de trabajo efectivo**, para seis rubros. La red de
seguridad de respaldos ya está cerrada y verificada desde el 2026-09-09, que es lo que
permite aplicar diez migraciones sobre la base de producción.

**Al 2026-09-11 hay cuatro fases desplegadas**: la categoría con identidad, sus campos,
los campos cargados y visibles en el producto, y las presentaciones. 578 pruebas en verde
y todo empujado a `main`. El detalle, fase por fase, está en `docs/AVANCE.md`.

**Lo primero que hay que decidir al retomar**: la fase 4 dejó pendiente la reserva por
presentación y la fase 5 es la agenda. Las dos tocan **las mismas cinco funciones** de la
base —crear el pedido, confirmar, cancelar, expirar, y `pedido_items`—, así que conviene
hacerlas juntas en vez de entrar dos veces al motor de compra.

## Con quién estás trabajando

Un desarrollador solo, estudiante de informática, sin equipo, sin QA y sin presupuesto de
infraestructura. Todo el stack tiene que caber en planes gratuitos. Dos consecuencias que
afectan cada decisión:

- **No hay nadie más que revise tu trabajo.** Las pruebas y los controles de seguridad son
  el único mecanismo de verificación que existe.
- **Preferí siempre la solución simple y probada** sobre la elegante. Menos dependencias,
  menos abstracciones, menos piezas móviles. Si dudás entre dos caminos, elegí el que
  tenga menos cosas que puedan romperse a las tres de la mañana sin nadie para arreglarlas.

## Reglas de trabajo

**Trabajá de a una fase.** No empieces la siguiente hasta que la actual cumpla su criterio
de aceptación — verificado corriendo la app en producción, no asumido por leer el código.

**Antes de empezar una fase**, decí en voz alta: qué archivos vas a tocar, qué decisiones
técnicas estás tomando y por qué, y qué riesgos de `SECURITY.md` aplican.

**Al terminar una fase**, entregá: el criterio de aceptación verificado con el paso a paso
de cómo lo comprobaste, los controles de seguridad marcados como cumplidos o pendientes
con motivo, un commit por tarea, y una lista corta de lo que quedó pendiente.

**Cada cambio se despliega a producción para validarlo.** Es una restricción de trabajo
del proyecto, no una preferencia.

**Si algo del plan te parece equivocado, decilo antes de implementarlo.** No lo ejecutes
en silencio ni lo cambies por tu cuenta.

**Si una tarea es ambigua, preguntá en vez de asumir.** Una suposición arrastrada tres
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
