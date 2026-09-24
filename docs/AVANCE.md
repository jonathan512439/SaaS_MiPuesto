# Registro de avance y auditorías — MiPuesto

Este archivo conserva el estado verificable del proyecto. Se actualiza al iniciar y al
cerrar cada fase. **Todo lo que está debajo de «Historial» es registro histórico y no se
edita**: es la evidencia de lo que se hizo y con qué se comprobó.

## Estado actual — 2026-09-11

**El proyecto empieza un ciclo nuevo.** El plan v2 (nueve fases) y el plan de crecimiento
(diez etapas) se cerraron y sus archivos se borraron. Lo vigente es `docs/plan/`.

### Lo hecho hasta hoy, en una pantalla

Cuatro fases desplegadas a producción entre el 10 y el 11 de septiembre de 2026.
**Todo está empujado a `main`; no hay trabajo sin commitear.**

| Fase | Qué dejó andando | Commit |
|---|---|---|
| 1 | La categoría tiene ícono, se puede ocultar y declara si vende cosas o tiempo. 152 íconos generados en 8 grupos | `6e96c15` |
| 2 | La categoría declara sus campos: cuatro tipos, hasta 10, hasta 6 en la tarjeta | `a7fe08f` |
| 3 | Los campos se cargan y se ven: tarjeta, ficha, mensaje de WhatsApp y buscador | `2141b1e` |
| 4 | Presentaciones con nombre y precio propio, con su selector en la ficha | `da07919` |

Estado de las comprobaciones al cerrar: **578 pruebas**, 10 tablas en el control
de aislamiento entre negocios, cuatro auditorías estructurales contra el proyecto
real (`test:fase1:linked`, `fase2`, `fase4`, más `test:rls:linked`), y las seis
guardias del build en verde.

### Una falla que ya cortó dos veces: los permisos por columna

`negocios` **no concede `select` sobre la tabla entera**: concede columna por
columna al rol `anon`, para que el catálogo público solo pueda leer lo que sale
publicado. Es la decisión correcta y tiene un filo afilado: **una columna nueva
no queda concedida sola**, y pedirla en la consulta pública no devuelve la fila
sin ella — hace fallar la consulta entera con «permission denied».

Pasó en la fase 7 con `patron_opacidad` y `subnombre`. Desde ese despliegue
**ningún catálogo público cargó**, y nada avisó: el compilador no ve permisos,
las pruebas corren sin base, y la página seguía devolviendo **200 con el cuerpo
vacío**, así que ni el código de estado lo delataba. Se descubrió mirando el
sitio, que es lo que se quiere evitar.

**Y volvió a pasar del lado de la escritura.** `authenticated` también tiene
permisos por columna, y ninguna de las columnas de las fases 7 y 8 estaba
concedida: el alta fallaba en el paso 1 sin decir por qué, y el subnombre y la
intensidad del fondo **nunca se llegaron a guardar** —el panel mostraba el
control, el dueño lo movía, y la escritura se rechazaba—.

La regla, entonces: **al agregar una columna a `negocios`, preguntarse quién la
lee y quién la escribe, y conceder**. No hay valor por omisión razonable; el
sistema no avisa.

Desde entonces hay dos guardas. `npm run test:permisos:linked` compara contra la
base qué columnas puede escribir el dueño y cuáles puede leer un visitante, con
una lista declarada en el propio script: agregar una columna obliga a decir de
quién es. Y `npm run test:publico:linked` corre **la consulta
de verdad** —la lee de `lib/catalogo/negocio-publico.ts`— con la clave anónima
contra el proyecto real. Si alguien suma una columna y se olvida del `grant`,
falla y dice cómo arreglarlo. **Conviene correrla después de cualquier migración
que toque `negocios`.**

### Lo que quedó pendiente, y hay que decidir al volver

**La calificación de Google (fase 7).** Diferido el 14 de septiembre de 2026
hasta tener capital: Google cobra en Bolivia con cuenta prepaga y pide 30 USD de
recarga inicial. **No bloquea nada.** El botón «Cómo llegar» ya funciona y lleva
al mapa, y las columnas `maps_*` con su restricción ya están en la base desde la
migración `20260930090000`; falta solo el número de estrellas. Retomarlo es
conectar el resolvedor, la tarea semanal de `pg_cron` y la estrella —sin tocar
el modelo de datos—. El paso a paso para la clave está en
[`GOOGLE-PLACES.md`](GOOGLE-PLACES.md).

**El modo oscuro del panel: descartado.** Decidido el 16 de septiembre de 2026.
No queda diferido —queda cerrado—: la fase 8.5, que pinta el panel con la paleta
del negocio en los acentos, cubre lo que se buscaba. Con una paleta oscura el
panel se verá oscuro en sus acentos y el fondo seguirá claro, que es la señal que
distingue de un vistazo el panel del catálogo.

**La reserva por presentación.** La fase 4 dejó las existencias por presentación
como información del panel: el carrito todavía reserva sobre el total del
producto, y el editor lo dice donde se cargan. Hacerlo de verdad toca **cinco
funciones de la base** —crear el pedido, confirmar, cancelar, expirar, y
`pedido_items`—, que es el motor de compra completo.

La fase 5, la agenda, toca **esas mismas cinco funciones**. Conviene hacer las
dos cosas juntas en vez de entrar dos veces al mismo código. Está anotado al
final de la fase 4 en `docs/plan/06-FASES.md`.

### Si esto se lee en una máquina recién formateada

`docs/REINSTALAR.md` tiene qué instalar, qué copiar antes de formatear, de dónde
sale cada valor de `.env.local` y cómo comprobar que todo quedó andando.

### Por qué cambió el plan

`Catalogos_Ejemplo/` dejó de ser 45 imágenes y pasó a ser **un frontend real y
funcional**: Next sobre Workers, con Tailwind, shadcn y Lucide. Al leerlo se
decidió adoptar ese diseño tal cual, adaptado al sistema.

Eso trajo dos cambios de fondo:

1. **Un solo diseño de catálogo.** Se retiran las cinco plantillas y las seis
   formas de tarjeta. Lo que varía entre rubros no es la estructura de la
   página: son las categorías, los campos y las acciones.
2. **La categoría declara sus campos.** Una ferretería necesita potencia y
   casquillo; una veterinaria, especie y etapa. El modelo actual de producto
   —nombre, precio, foto, categoría, cantidad— no alcanza para ninguno de los
   dos.

### El plan nuevo

Nueve fases, **40 días de trabajo efectivo**, para **seis rubros**:
restaurante, ferretería, ropa, distribuidora, repuestos y veterinaria. Está en
`docs/plan/06-FASES.md`.

| Fase | Nombre | Días | Estado |
|---|---|---|---|
| 1 | La categoría toma identidad | 3 | **CERRADA el 2026-09-10** |
| 2 | Los campos de la categoría | 4 | **CERRADA el 2026-09-10** |
| 3 | Los campos en el producto | 4 | **CERRADA el 2026-09-11** |
| 4 | Variantes | 3 | **Desplegada el 2026-09-11.** Falta la reserva por presentación |
| 5 | Agenda y citas | 6 | **CERRADA el 2026-09-13.** Recurso, pantalla de Agenda, confirmar/cancelar, carga a mano |
| 6 | El catálogo nuevo | 7 | No iniciada |
| 7 | Identidad y apariencia | 4 | No iniciada |
| 8 | Alta guiada y siembra | 5 | No iniciada |
| 9 | Refinamiento y salida | 4 | No iniciada |

### Lo que se retiró, y por qué queda escrito

La **Fase 1 del plan anterior** —eje de formas de tarjeta, cinco plantillas,
extracción de tarjetas, selector en el panel— se construyó y se desplegó entre
el 9 y el 10 de septiembre de 2026, y **este plan la retira**. La decisión la
tomó el dueño del proyecto con la información completa y con copia local.

Queda escrito acá para que dentro de seis meses nadie se pregunte por qué
desapareció código que estaba en producción y funcionando.

Lo que **sobrevive** de esa fase: los dos banners del catálogo (que este plan
amplía con título y botón), la corrección de `feria` y la consolidación de los
tres mapas de plantilla en uno.

### Lo que quedó cerrado del ciclo anterior y sigue en producción

Autenticación y perfil de negocio, catálogo con categorías y subcategorías, las tres
modalidades, carrito con reserva temporal y pedido por WhatsApp, panel de administración,
panel de plataforma con segundo factor, promociones con ventana horaria, horarios y
feriados, corte automático por vencimiento, papelera de productos, analítica por sesión
con límites por IP, etiquetas NFC y directorio por zona, carta del día y menú imprimible,
lectura de listas de precios con IA, importación desde Excel y CSV, botón de llamar, y el
vigilante de salud con aviso por ntfy.

Todo eso **no se rehace**. El plan nuevo construye encima.

### Fase 0 — CERRADA el 2026-09-09

**El respaldo corre y la restauración está probada.** El ensayo termina en verde y es
repetible con un botón.

En el camino aparecieron **nueve defectos**, todos en un respaldo que llevaba desde el
5 de septiembre en verde. Ninguno se veía desde afuera: los seis producen un archivo
con buen peso que sube sin quejarse.

| # | Defecto | Consecuencia si hubiera hecho falta restaurar |
|---|---|---|
| 1 | `pg_dump` se invocaba por nombre y el envoltorio de Debian elegía la versión 16 | No había respaldo, a secas |
| 2 | El volcado tomaba solo `public` | Imposible de restaurar: las políticas invocan funciones de `private` |
| 3 | Faltaban las extensiones y las cinco tareas programadas | Base con todos los datos que no hace nada sola |
| 4 | El volcado partido en esquema y datos rompía el orden de las claves foráneas | Carga fallida por un orden que nadie eligió |
| 5 | Las cuentas se respaldaban y **no se restauraban** | Siete claves foráneas contra `auth.users`: no restaura nada |
| 6 | No se respaldaba el historial de migraciones | La base restaurada no acepta la próxima migración |
| 7 | No se respaldaban los depósitos de Storage ni sus políticas | Ninguna imagen, y subidas sin comprobar de quién es la carpeta |
| 8 | **Los permisos se descartaban con `--no-privileges`** | La copia quedaba **más permisiva que el original** |
| 9 | Faltaban los 31 permisos **por columna** | El catálogo no se podía leer y el dueño podía escribir de más |

Lo construido para eso: el volcado en formato personalizado, los tres archivos de
preparación en `supabase/restauracion/`, el flujo `ensayo-restaurar.yml`, la guardia
`check-tareas-programadas.mjs` y los comandos `npm run ensayo:*`, que se niegan a
correr si apuntan al proyecto real.

**La base de ensayo quedó siendo una copia de producción con su historial de
migraciones**, o sea el lugar donde se prueban las migraciones de cada fase antes de
tocar los datos reales. Ese es el activo que deja la fase 0, además del respaldo.

### El criterio de aceptación de la fase 0, verificado

- [x] Existe un respaldo en R2 con la fecha de hoy, con sus ocho archivos.
- [x] El ensayo de restauración corre con un botón y termina en verde, en 17 pasos.
- [x] La copia restaurada **pasa el recorrido de aislamiento**: `npm run ensayo:rls`.
- [x] La copia **acepta la próxima migración**: `npm run ensayo:push` responde
      «Remote database is up to date», con las 47 reconocidas.
- [x] El aviso de caída llega al teléfono del dueño.

### Lo que sigue sin cumplirse

- **No hubo semana de piloto.** Sigue siendo el criterio de salida del proyecto entero.

## Cómo continuar este proyecto

### Qué leer, y en qué orden

1. `AGENTS.md` — reglas de trabajo del repositorio. Son obligatorias.
2. `SECURITY.md` — sobre todo la sección final, «Cosas que NO hay que hacer todavía».
3. `docs/plan/` — **el plan vigente**, en el orden de su `README.md`.
4. Este archivo, para saber qué quedó cerrado y con qué evidencia.

### Dónde está el trabajo

- Rama de trabajo: `main`. El despliegue sale solo al empujar (Cloudflare Workers Builds);
  no hay archivo de flujo en el repositorio.
- Producción: `https://mipuesto-dev.mipuesto-app.workers.dev`. **No hay dominio propio
  todavía**, y por eso no se imprime ningún QR: cambiarían todos.

### Comandos que se corren siempre antes de dar algo por terminado

```
npm run typecheck
npm run lint
npm test                 # incluye contraste y tokens de diseño
npm run build:vinext
npm run test:rls:linked  # al cierre de cada fase, sin excepción
```

### Trampas conocidas

- **`npm run supabase:push`** aplica migraciones a la base real. `supabase:seed:local` es
  lo único que lleva `--include-seed`, y solo apunta a la base local. Nunca correr el seed
  contra la enlazada: reescribiría los negocios reales.
- Antes de `npm run build:vinext`, cerrar cualquier `wrangler dev`: mantiene tomado
  `dist/client` y el build falla con `EBUSY`.
- Después de cualquier migración, regenerar tipos con `npm run types:db:linked` o
  TypeScript seguirá viendo el esquema viejo.
- El guardián `scripts/check-design-contrast.mjs` exige que cada plantilla y cada paleta
  estén en **cuatro** sitios: CSS del tema, `DEFINICIONES_*`, la constante y la restricción
  de la base. Falla el build si falta una.
- El control de tokens rechaza cualquier color, tamaño tipográfico o espaciado escrito a
  mano fuera de `app/globals.css`.
- Las herramientas automáticas de limpieza de CSS han destruido directivas `@reference`.
  Después de reorganizar hojas, verificar que las ocho la conserven.

### Lo que espera una acción del dueño

Ninguna de estas cosas se puede hacer desde el repositorio:

| | Dónde |
|---|---|
| ~~Configurar y correr el respaldo~~ | **Hecho el 2026-09-09** |
| ~~Hacer el ensayo de restauración~~ | **Hecho el 2026-09-09**, en verde y repetible |
| ~~Crear la base de ensayo en Supabase~~ | **Hecha el 2026-09-09** |
| ~~Suscribirse al tema de ntfy y probar el aviso~~ | **Hecho el 2026-09-09**: suena en el teléfono |
| ~~Cargar las variables `ENSAYO_*` en `.env.local`~~ | **Hecho el 2026-09-09** |
| Comprar y conectar el dominio | Bloquea correo propio, QR, NFC y el reporte por correo |
| La semana de piloto | Criterio de salida de la fase 9 |
| Darse de alta como administrador de plataforma | «Cómo darse de alta», más abajo |

---

## El panel, reorganizado — 2026-09-16

Diez despliegues entre el 15 y el 16 de septiembre de 2026, todos verificados en
producción contra `https://mipuesto-dev.mipuesto-app.workers.dev`. Cierra la
**reorganización de pantallas** de [`plan/04-PANEL.md`](plan/04-PANEL.md) §4, que
era entregable de la fase 8, más la ficha de producto y las tarjetas de pedido.

| Marca de despliegue | Qué dejó | Commit |
|---|---|---|
| `banner-destino-y-proporcion` | El banner elige a dónde lleva; los dos del cuerpo pasan a 2:1 y el panel dice la proporción | `a9f7076`, `6018b9b` |
| `panel-rutas-con-nombre` | «Configuración» → **Mi negocio**, «Diseño» → **Apariencia**; las direcciones en un solo módulo | `9fb2fbc` |
| `panel-herramientas-aparte` | **Herramientas**: importar, menú impreso, papelera y lectura con IA, cada una con su explicación | `85fc151` |
| `inicio-lo-que-falta` | **Inicio** dice qué le falta al catálogo para funcionar | `86eadeb` |
| `catalogo-y-productos-aparte` | **Mi catálogo** (categorías) y **Productos** (la lista), separadas | `4299404` |
| `pedidos-y-citas-juntos` | **Pedidos y citas** en una sola pantalla; la agenda aparece solo si el negocio la usa | `0473188` |
| `panel-con-relieve` | Los botones dejan de parecer rótulos: relieve, y se hunden al presionar | `dc25c35` |
| `ficha-de-producto-en-fila` | Miniatura, datos y mandos en tres columnas, también en el teléfono | `89dd27f` |
| `botones-uniformes-y-buscador` | Buscador para elegir el producto del descuento; tres aspectos de control en vez de ocho | `9b137bd` |
| `un-solo-juego-de-botones` | Cerradas las siete ventanas que quedaban con botón propio, con una prueba que lo cuida | `c82601c` |
| `tarjetas-de-pedido-como-agenda` | La tarjeta de pedido toma la forma de la de un turno | `5087369` |

**651 pruebas** y las seis guardias del build en verde al cerrar.

### Las direcciones del panel, en un solo lugar

Estaban escritas a mano en **veinticuatro sitios**, y la mayoría no eran enlaces
de una pantalla a otra: eran el `redirect` de «todavía no tenés negocio» que
repite cada página. Veinticuatro copias aguantan hasta el día que una pantalla
cambia de nombre, y ese día la que quedó sin actualizar manda al dueño a un 404
desde donde menos se lo espera: recién entrado, sin negocio, sin saber qué hizo
mal.

Ahora viven en `lib/panel/rutas.ts`, y `lib/panel/rutas.test.ts` comprueba tres
cosas: que no quede ninguna suelta, que toda ruta tenga pantalla, y que las cinco
direcciones viejas sigan redirigiendo.

### Tres aspectos de control, y no ocho

El panel tenía **ocho recetas distintas** para el mismo botón chico: fondo
hundido con letra de marca en una pantalla, superficie con borde de marca en
otra, superficie con letra neutra en una tercera. Ninguna nació de un descuido
—cada pantalla nueva necesitaba un botón, lo escribía ahí mismo y elegía los
colores a ojo—, pero quien las mira sí les busca sentido y no lo encuentra. Lo
reportó el dueño.

Quedan tres, definidos en `app/globals.css`: `--control-principal-*` (la acción
de la pantalla, la única pintada), `--control-segundo-*` (todo lo demás que se
toca) y `--control-peligro-*`. Las variantes `secundario` y `discreto` del botón
compartido dibujan lo mismo: convivían en la misma tarjeta haciendo creer que la
diferencia significaba algo.

**Limpiarlo una vez no alcanzaba**: la novena pantalla vuelve a empezar, que es
exactamente como se llegó a ocho. `components/ui/aspecto-de-los-controles.test.ts`
rechaza el control que se invente colores propios. Las 26 excepciones están
listadas **con su motivo escrito al lado**, y esa es la parte que importa: si el
motivo no se puede escribir, es que no había motivo.

### Un defecto que apareció al mostrarlo

La cuenta de productos que decide «tu catálogo ya está listo» **incluía los de la
papelera**. Un negocio que borró todos sus productos tiene el catálogo vacío para
quien lo abre, y el sistema le decía que estaba listo justo cuando había dejado
de estarlo. No se veía porque esa cuenta solo la usaba el alta, que se recorre
una vez y con productos recién cargados; se vio al ponerla en la pantalla de
inicio, que se mira todos los días.

### Lo que este tramo dejó pendiente

**El contenedor `.contenido` está copiado en diez hojas de estilo.** El ancho y
los márgenes de cada pantalla del panel, repetidos diez veces. Su lugar es el
layout, no cada página. La décima copia se agregó **a propósito** al crear
Herramientas: inventar una convención nueva a mitad de la reorganización habría
dejado el panel con dos, que es peor que tener una mala. Moverlo pide mirar las
diez pantallas, y eso lo tiene que ver el dueño.

**Dos decisiones que esperan uso real para confirmarse.** «Agotado» quedó dentro
del menú «Más» de la ficha de producto: es una acción de todos los días y ahora
cuesta un clic más: se movió porque siete botones a la vista hacían la tarjeta
más alta que el producto en un teléfono, y siete botones iguales tampoco dicen
cuál es el importante. Y Pedidos **no** tiene el bloque «Esperan tu decisión» que
sí tiene Agenda: la pantalla ya abre filtrada en «Pendiente», así que el bloque
sería el mismo listado dos veces.

---

# Historial

Lo que sigue es el registro del ciclo anterior. Se conserva como evidencia y no se edita.

> Varias entradas citan archivos que ya no existen —`planning-mipuesto-v2.md`,
> `docs/PLAN-CRECIMIENTO.md` y los `docs/PLAN-DISENO-FASE*.md`—. Se borraron el
> 2026-09-09 al abrir el ciclo nuevo. Siguen en el historial de git; las citas se dejan
> tal cual porque reescribirlas falsearía el registro.

## Portada: la demostración se elige por rubro

La portada pedía elegir «estructura y color». Eso es vocabulario de producto: un
comerciante sabe a qué se dedica, no qué es una plantilla. Ahora la
demostración se elige por rubro —restaurante, ferretería, barbería, tienda de
barrio— y cada uno trae la plantilla y la paleta que le corresponden, con
productos y precios de su oficio. El color sigue suelto porque es lo único que
de verdad se elige por gusto; al cambiar de rubro vuelve al recomendado, para
que nadie termine viendo una combinación que no eligió.

Los datos viven en `lib/plantillas/demos-rubro.ts`.

**Los cuatro diseños siguen a la vista y se pueden cambiar en la propia
demostración.** Entrar por rubro corría el riesgo de esconder que hay de dónde
elegir: si el visitante no ve las opciones, no se entera de que las tiene. El
selector de diseño marca el recomendado para el rubro elegido y deja probar los
otros tres; la portada dice «4 diseños y 7 colores» en la franja de cifras, en
el encabezado de «Para quién es» y en el de la demostración.

**Solo el restaurante lleva fotografías**, porque son las tres únicas que
existen de verdad y no se van a inventar las demás. Tampoco hacen falta: los
otros rubros usan las plantillas donde la foto es lo de menos —lista de precios
y listado de servicios— y de paso muestran cómo se ve un catálogo el primer día,
antes de cargar imágenes. Un test verifica que toda ruta de foto exista en
`public/`: una imagen rota en la portada es un hueco en la única pantalla que
decide la venta.

**No hay demostración de boutique** aunque las tarjetas de «Para quién es» la
nombran, porque la plantilla Moderna es la que más depende de la foto y no hay
fotos de ropa. Queda pendiente para cuando existan.

## Etapa 9 — lectura de fotos con Gemini

Dos herramientas sobre la misma capacidad: un modelo que mira una imagen y
devuelve datos estructurados.

| Herramienta | Qué hace | Dónde vive |
|---|---|---|
| **Completar con una foto** | Llena nombre y descripción de un producto | Botón en el formulario del producto |
| **Cargar desde una foto** | Lee una lista de precios y arma un borrador de varios productos | `/dashboard/catalogo/desde-foto` |

**Ninguna de las dos guarda nada.** Devuelven una propuesta que el dueño revisa y
confirma. Un catálogo con precios inventados es peor que un catálogo vacío,
porque el dueño no se entera hasta que un cliente le reclama.

### Lo que se midió al integrarla

- **`gemini-2.5-flash` ya no está disponible para cuentas nuevas.** El modelo que
  parecía la opción estable y obvia respondió «no longer available to new users».
  Por eso el nombre del modelo vive en una constante: mudarse es una línea.
- **La variante «lite» tarda 2,5 segundos donde la grande tarda 22**, con la
  misma respuesta útil. Veintidós segundos mirando una pantalla que no dice nada
  es tiempo en que el comerciante abandona.
- **La primera llamada del día a veces se cuelga.** Medido: una foto agotó el
  tiempo límite y las dos siguientes tardaron 4 y 2,3 segundos. Por eso el
  reintento cubre también la espera, no solo el error.
- Una foto de producto cuesta ~1.350 tokens.
- **La herramienta de listas rechaza correctamente lo que no es una lista**:
  contra la foto de una hamburguesa devolvió `es_lista_de_precios: false` y cero
  productos. Esa es la garantía de «no inventa» funcionando.

### Cómo se controla el gasto

Es la primera función del sistema con **costo por uso**, así que:

- **Arranca apagada para todos.** La habilita la plataforma negocio por negocio,
  con el número de consumo delante y una confirmación que lo dice.
- **Tope de 200 fotos por negocio y por mes.** Contar y autorizar ocurren en la
  misma operación dentro de la base: comprobar el tope y después sumar deja una
  ventana por la que se cuelan dos peticiones a la vez.
- **Si la lectura falla, el crédito se devuelve.** Un cupo que se gasta en
  errores ajenos se siente como una estafa aunque sean centavos.
- El dueño ve su propio consumo. Un tope que se alcanza sin explicación es un
  error inexplicable.
- La clave va como secreto del Worker —`npm run cloudflare:secret:gemini`— y el
  guardián de secretos ahora la vigila igual que la de Supabase.
- **Sin clave configurada, las herramientas simplemente no aparecen** y el resto
  del sistema funciona igual.

### El aviso al dueño

Cuando la plataforma habilita la función, el panel del negocio muestra un cartel
durante **siete días** y después se apaga solo, sin columna de «visto» que
mantener: un cartel que hay que cerrar termina cerrado sin leerse.

**El correo de confirmación no está hecho, y no es un olvido.** El sistema no
tiene todavía un enviador de correo transaccional: lo único que envía correo es
el sistema de autenticación de Supabase, con sus propias plantillas. Un correo
propio necesita Resend con dominio verificado, que es la etapa 4.

### Las indicaciones

Viven en `lib/ia/ayuda.ts` y no escritas en el JSX: si la herramienta falla, casi
siempre es porque la foto no cumple alguna condición, y ese texto es lo único que
lo evita antes de gastar un crédito. El ejemplo usa los casos raros de verdad
—«2x15», dos tamaños en un renglón, un título de sección— porque son los que hacen
dudar al comerciante de si va a funcionar con su lista, que nunca es la lista
limpia del manual. Un test verifica que el ejemplo siga siendo coherente.

### Descripción y categorías desde la propia lista

La primera versión leía nombre y precio, y **tiraba los títulos de sección**. Era
un desperdicio: esa lista ya trae la estructura de categorías escrita por el
propio dueño, y después le pedíamos que la volviera a armar a mano.

Ahora «BEBIDAS» no se descarta: se convierte en la categoría de todo lo que viene
debajo hasta el título siguiente. En la pantalla de revisión los productos salen
agrupados como en la hoja, y **cada sección se decide una sola vez**: crearla,
mandarla a una categoría que ya existe, o dejar esos productos sin categoría. Si
el título coincide con una categoría existente se propone la existente, porque
crear una segunda «Bebidas» es el error más fácil de cometer ahí.

La descripción se extrae **solo si el renglón la trae** —«Silpancho — carne
apanada, arroz, papa y huevo»— y el campo aparece en la revisión solo cuando hay
algo que revisar: un campo vacío por producto alarga la pantalla sin agregar
nada. La instrucción prohíbe deducirla de lo que el modelo sepa del plato.

**El stock queda fuera a propósito.** Una lista de precios dice cuánto cuestan
las cosas, no cuántas hay. Si el modelo confundiera un código o un segundo precio
con una cantidad, el catálogo diría «quedan 3» con 300 en depósito y el negocio
**rechazaría clientes por una lectura mal hecha**. Un nombre mal leído se corrige
mirando; un stock mal leído se descubre perdiendo una venta.

### Medidor del consumo de la API

**Google no dice cuánto queda.** Se comprobó contra la API: la respuesta no trae
`x-ratelimit-remaining` ni ninguna cabecera de cuota, y no hay endpoint público
que lo informe. Así que se mide de este lado.

El número es exacto por un motivo concreto: **el Worker es el único que usa esa
clave**. Lo único que el medidor no ve son las pruebas hechas directamente en AI
Studio, que consumen la misma cuota del proyecto sin pasar por acá. Está dicho
en la pantalla para que nadie lo descubra después.

**Se guarda una fila por llamada, no un contador.** Los límites de Google son por
ventana —pedidos por minuto, pedidos por día, tokens por minuto— y un acumulado
no puede responder «cuántas van en el último minuto». Una fila con hora, sí.

**Las fallidas también se cuentan.** Google descuenta el pedido aunque la
respuesta no sirva, y un medidor que solo cuenta aciertos miente justo cuando más
importa: cerca del límite, cuando las cosas empiezan a fallar.

**El día de cuota se cuenta en hora del Pacífico**, que es donde Google reinicia
el contador diario, y se muestra aparte del día boliviano. Confundirlos hace
esperar la medianoche equivocada: son cuatro horas en las que el sistema sigue
rechazando aunque acá ya sea otro día. La pantalla dice cuánto falta para el
reinicio en palabras.

Los tres límites viven escritos a mano en `lib/ia/limites.ts`, porque Google no
los expone. **Poner cero en cualquiera significa «no sé cuánto es»** y el medidor
muestra el número medido sin barra: un límite inventado sería peor que ninguno,
porque se decide con él.

El registro se purga a los treinta días, en la misma tarea que ya limpia la
analítica vieja.

### Un límite del nivel gratuito, encontrado al probar

La generación de imágenes **no entra en el cupo gratuito**: al intentar fabricar
una lista de prueba, la respuesta fue «exceeded your current quota». La lectura
sigue funcionando sin problema. No afecta a estas herramientas —ninguna genera
imágenes— pero conviene saberlo antes de planear algo que las use.

### Lo que falta antes de anunciarla

El protocolo de validación del plan: **20 fotos de listas bolivianas reales**, con
cero productos inventados como umbral, y la prueba de cronometrar a un
comerciante tipeando contra revisar. Nada de eso se puede hacer sin las fotos.

## Control de almacenamiento en la plataforma

El techo del plan gratuito llega antes de lo que uno cree: mil megabytes se
reparten entre todos los clientes, y hasta ahora nadie se enteraba de que se
acercaba ni de quién lo estaba gastando.

**Se calcula al consultar; no hay contador guardado.** Un contador mantenido por
disparadores sobre `storage.objects` se desincroniza al primer borrado que no
pase por la aplicación —una limpieza a mano, una restauración, un fallo a mitad
de camino— y un número de ocupación equivocado es peor que no tener número,
porque se decide con él. Sumar unos miles de filas cuesta milisegundos.

El efecto práctico es el que se pidió: **cada foto que se sube o se borra ya
cambia el número de la próxima vez que se abre la pantalla**, sin que nadie tenga
que acordarse de actualizar nada, y sin poder quedar desfasado.

### Los dos techos, medidos aparte

Archivos (1 GB) y base de datos (500 MB) se llenan por caminos distintos: las
fotografías van a los baldes, y los productos, pedidos y analítica engordan la
base. Estar cómodo en uno no dice nada del otro. Al pasar al plan pago se
cambian dos constantes en `lib/plataforma/almacenamiento.ts` y nada más.

**El aviso salta a la mitad, no al 90 %:** mudarse de plan o limpiar lleva días,
y enterarse con el disco lleno es enterarse tarde.

Además del reparto por negocio, la pantalla estima **cuántos negocios más
entran** con la ocupación promedio actual, que es la pregunta que se hace al
vender, y avisa de los **archivos huérfanos**: los que quedaron en una carpeta
sin negocio dueño, sobras de una baja o de un borrado a medias.

### Cómo se puede verificar

El cálculo vive en `private.calcular_uso_almacenamiento()` y tiene dos puertas:
`public.uso_almacenamiento()`, que exige ser administrador de la plataforma y es
la que usa el panel, y `public.uso_almacenamiento_servicio()`, solo para la clave
privilegiada. La segunda existe porque un número que gobierna la decisión de
pagar un plan merece poder comprobarse desde afuera sin entrar al panel.

Medición del 2026-09-06: 22 archivos, 2,25 MB en baldes, 15,3 MB de base, cero
huérfanos.

## Etapa 8 cerrada — precios por horario

La función más riesgosa del plan, y por eso fue la última: toca
`private.calcular_precio_producto`, que está en la ruta del dinero. Lo que
devuelve es el precio que ve el comprador, el que se congela en el pedido y el
que se suma en el total reservado.

### Lo que la hace segura

**Las columnas son anulables y lo que ya existía no cambia.** Una promoción sin
horario ni días se comporta exactamente igual que antes de la migración. Hay un
test que lo fija.

**La hora es la de Bolivia, escrita explícita.** El servidor corre en UTC; sin la
conversión, una promoción de almuerzo de 12:00 a 14:00 se activaría a las 08:00
de la mañana. Bolivia no cambia de hora en todo el año, así que el desfase es
fijo y no hace falta una biblioteca de zonas.

**La madrugada pertenece al día anterior.** «Viernes de 22:00 a 02:00» es una
noche, no dos ventanas sueltas: a la 01:00 del sábado la promoción sigue siendo
la del viernes. Sin esta regla el happy hour se corta a las doce en punto y el
cliente que ya estaba sentado paga otro precio.

**Dos checks cierran la ambigüedad en la base:** una sola hora no define
ninguna ventana, y un inicio igual al fin sería cero o veinticuatro horas según
cómo se lea. Esa duda no se deja abierta en la ruta del dinero.

### El espejo, que es el riesgo real

`lib/precios.ts` y `private.calcular_precio_producto` calculan lo mismo por
separado: el primero pinta el precio en el catálogo, el segundo es el que se
cobra al reservar. **Si divergen, el comprador ve un precio y paga otro.** Las
dos implementaciones aplican las mismas tres reglas —ventana de horas con el fin
excluido, cruce de medianoche invirtiendo la condición, y día efectivo corrido
hacia atrás en la madrugada— y `0 = domingo` en ambos lados, igual que
`extract(dow)`.

Los días de la semana del formulario empiezan en domingo por lo mismo: si la
pantalla empezara en lunes, el día marcado y el guardado serían distintos.

## Etapa 7 cerrada — etiquetas, directorio por zona y Google

Las tres piezas que faltaban comparten una idea: el catálogo existe para que
alguien llegue a él, y hasta acá la única puerta era que el dueño mandara el
enlace por WhatsApp.

### Etiquetas NFC y QR — `/t/CODIGO`

**El código es estable y reasignable.** La etiqueta pegada en una mesa sobrevive
al negocio que la usaba: si el local cambia de dueño se reapunta el código desde
el panel de plataforma y el plástico sigue sirviendo. Imprimir el slug obligaría
a tirar el lote entero.

**Nadie lee la tabla directamente.** `resolver_etiqueta()` es definer y devuelve
solo el slug: así no se puede enumerar el mapa completo, y de paso se anota el
último escaneo, que es lo que dice si un lote se está usando o quedó en un cajón.

Un código inexistente, uno sin negocio y uno de un negocio dado de baja **se ven
igual desde afuera**: quien escanea una etiqueta vieja no necesita saber cuál de
los tres casos le tocó.

El alfabeto de los códigos deja fuera vocales, O/0, I/1 y S/5: un código se dicta
por teléfono más veces de lo que uno cree. El slug `t` quedó reservado, porque
sin eso un negocio con ese nombre quedaría tapado por la ruta.

### Directorio por zona

Se extendió el directorio que ya existía en vez de escribir uno nuevo. Ciudad de
**lista cerrada** y zona en **texto libre**: al revés no funciona, porque un
directorio agrupa por ciudad y si cada dueño escribe «Sta Cruz», «santa cruz» o
«SCZ» no hay agrupación posible; el barrio, en cambio, no entra en ninguna lista
que podamos escribir.

El filtro viaja en la dirección —`/directorio?ciudad=cochabamba`— para que un
enlace a los negocios de una ciudad se pueda mandar por WhatsApp, que es como
circula todo acá. Se filtra en la consulta y no en el navegador porque la lista
está paginada, y filtrar después de paginar deja páginas medio vacías.

**Sigue sin promocionarse.** El plan dice construirlo ahora y promocionarlo con
unos treinta negocios en una ciudad: uno con diez se ve vacío y resta.

### Calificación en Google

Se guarda **el enlace que el dueño pega**, no un identificador de lugar, por el
mismo motivo que la ubicación: buscar el lugar por API cuesta y adivinarlo sale
mal. El enlace que el propio dueño abrió y verificó es el dato más confiable.

Se muestra **después del pedido y no antes**: pedir una calificación mientras
alguien decide qué comprar es interrumpirlo; pedirla cuando ya pidió es
preguntárselo a alguien contento que todavía tiene el teléfono en la mano. Va
discreto a propósito: es un favor que se pide, no una acción del pedido.

## Número de mesa en el pedido (etapa 7, parcial)

Un mozo que recibe «pedido #A3F2» sin mesa tiene que salir a preguntar quién
pidió qué, que es exactamente el trabajo que el catálogo vino a ahorrar. Es la
única parte de la etapa 7 que el dominio no bloquea.

**Se guarda texto y no un número.** En los locales reales las mesas se llaman
«A1», «Barra» o «Terraza»; forzar un entero obliga al dueño a inventar una
numeración que su personal no usa. Diez caracteres, comprobados en la base.

**Va detrás de un interruptor por negocio** —`negocios.pide_numero_mesa`— que
aparece pegado al rubro y solo para los rubros a los que les sirve. Pedirle la
mesa a quien compra ropa por WhatsApp es un campo más entre él y el pedido.

**La base comprueba que el negocio realmente pida mesa**, no el navegador: sin
eso, cualquiera podría mandar un texto arbitrario al pedido de un negocio que no
atiende mesas, y ese texto se muestra en el panel del dueño. `crear_pedido_reservado`
levanta `MESA_NO_PERMITIDA`.

La mesa aparece en la primera línea de la confirmación del panel y en el mensaje
de WhatsApp **antes del detalle**: quien lo lee necesita saber a dónde llevarlo
antes que qué lleva.

### Un agujero de la papelera, cerrado en el camino

`crear_pedido_reservado` comprobaba disponibilidad con `visible = true`, y un
producto mandado a la papelera **conserva `visible = true`**. Un comprador con la
página vieja abierta podía pedir algo ya borrado. La comprobación ahora exige
`eliminado_en is null`.

La función se reemplazó en vez de agregar una segunda versión: dos funciones con
el mismo nombre —una de seis parámetros y otra de siete con valor por defecto—
se vuelven ambiguas en cuanto alguien llama con seis.

## Rubro del negocio y paquete de restaurantes (etapa 8, parcial)

`tipo_negocio` dice **cómo vende** —lectura, acción, carrito—. El rubro dice
**qué vende**, y llega ahora porque llegaron sus dos primeras funciones. Hasta
este cambio había una incoherencia: la portada le pregunta al comerciante a qué
se dedica, y el producto nunca se lo preguntaba.

**Regla que no se rompe: el rubro oculta interfaz, nunca datos ni permisos.**
Cambiar de rubro apaga botones; no borra ni esconde nada de lo cargado, y no
toca ninguna política de acceso. **Vacío es un valor legítimo**: los negocios que
ya existían no eligieron rubro y ven el panel completo, que es exactamente lo que
tenían. Quitarles pantallas sería castigarlos por no contestar una pregunta que
nunca se les hizo.

El registro vive en `lib/negocios/rubros.ts` y un test verifica que coincida con
el `check` de la migración: si divergen, el panel ofrece un rubro que la base
rechaza al guardar, con un error que el dueño no puede entender ni evitar.

### Carta del día

**Se guarda una fecha, no un sí/no.** Un interruptor que hay que apagar a mano
queda encendido, y a los tres días la carta «de hoy» miente sobre lo que se está
sirviendo. Con la fecha, la carta se vacía sola a la medianoche sin que nadie
haga nada.

La medianoche es la boliviana. El servidor corre en UTC y Bolivia no cambia de
hora en todo el año, así que el desfase es fijo y se escribe explícito: sin él,
entre las 20:00 y la medianoche el sistema ya estaría en el día siguiente y la
carta se vaciaría en plena cena.

En el catálogo aparece como una categoría **«Hoy» delante de todo**, y los
productos marcados **salen de su categoría**: una carta del día que repite lo que
ya está más abajo alarga el catálogo en vez de acortarlo. Se resolvió como una
categoría sintética en `construirCatalogoPublico`, así que **las cuatro
plantillas la muestran sin un solo cambio**.

### Menú imprimible

Ruta pública `/<slug>/imprimir`, los mismos datos con hoja de estilos propia.
Sin fotografías ni colores de marca —la tinta de color cuesta y un menú se lee
por el precio—, con guía de puntos entre el nombre y la cifra, y reglas de
impresión para que una categoría no se parta entre dos hojas. Lleva la fecha del
día a propósito: una lista de precios sin fecha sigue circulando meses después
de que los precios cambiaron. No se indexa: es la misma información que el
catálogo y competiría contra la propia página del negocio.

El enlace aparece en el panel solo para los rubros a los que les sirve. La ruta,
en cambio, funciona para cualquiera: **el rubro oculta interfaz, no datos.**

### Lo que falta de la etapa 8

**Precios por horario.** Va sola y va última: toca `calcular_precio_producto`,
que está en la ruta del dinero, y exige zona horaria, cruce de medianoche y
pruebas propias.

## Papelera de productos

Borrar un producto ya no es definitivo. Antes borraba la fila y, antes todavía,
sus fotografías del almacenamiento: un toque equivocado no tenía vuelta.

**Por qué no se resuelve con el respaldo.** Sacar una fila de un volcado
comprimido es cirugía a mano sobre la base viva, con la clave de servicio, hecha
por el autor. Eso no es una función, es un favor que no escala y que obliga a
repetir la operación más peligrosa del sistema cada vez que alguien lo pide.
Ofrecerlo por escrito sería prometer un plazo de respuesta que no se puede
cumplir.

**Treinta días, no noventa.** Un arrepentimiento ocurre en horas o en días; a los
tres meses nadie recuerda qué borró, y cada producto retenido son sus fotografías
ocupando espacio. Los noventa siguen siendo el plazo de guarda de un negocio dado
de baja, que responde a otra cosa: que dejó de pagar.

**Las fotografías se conservan mientras el producto esté en la papelera** y se
borran junto con él. Recuperar un producto sin sus imágenes no es recuperarlo.

### Cómo está hecho

- Columna `eliminado_en` en `productos`, con índice **parcial**: la papelera es la
  excepción y no debe hacer trabajar a cada consulta del catálogo.
- **El filtro vive en la política de RLS**, no solo en las consultas: si mañana
  alguien escribe una pantalla pública y se olvida del `is null`, un producto
  borrado no reaparece igual.
- Las consultas del dueño sí llevan el filtro explícito, una por una: panel,
  promociones, precios en lote, duplicar, imágenes y el límite de productos. Un
  producto en la papelera **no cuenta contra el límite del plan**.
- El código del producto sigue ocupado mientras esté en la papelera, a propósito:
  si se liberara, recuperarlo chocaría contra el que tomó su lugar. No molesta a
  nadie porque el código se genera solo y el dueño nunca lo escribe.

### La purga, y su límite conocido

`purgarPapeleraVencida` corre dentro de una petición del dueño —al borrar un
producto y al actuar sobre la papelera— y solo sobre su propio negocio, así que
el trabajo está acotado. No hay tarea programada porque `pg_cron` no puede tocar
el almacenamiento, y hacerlo desde fuera exigiría exponer la clave de servicio en
un flujo más.

**La consecuencia, escrita para que no sorprenda:** un dueño que no entra en dos
meses conserva su papelera hasta que vuelva. Lo prometido es «recuperable treinta
días», no «borrado el día treinta y uno». Si alguna vez hace falta la garantía
fuerte, el lugar natural es el flujo que traiga el espejo de fotografías, que ya
va a necesitar acceso al almacenamiento desde afuera.

Si el borrado de las fotografías falla, la purga deja las filas y reintenta a la
siguiente: un producto sin fotos es peor que un producto de más, porque el dueño
lo ve roto y no entiende por qué.

### Pendiente relacionado

**El espejo de fotografías a R2 se hará después del dominio y de las fases que
vienen con él** —decidido el 2026-09-05—. El detalle técnico y el motivo del
orden están en `docs/PLAN-CRECIMIENTO.md`, etapa 5.

## Estado de Fase 13 — Panel de plataforma

Etapa 6 del plan de crecimiento. `SECURITY.md` decía construirlo cuando
administrar a mano empezara a doler, y ya duele: dar de alta un cliente exigía
correr un script desde la máquina del vendedor con la clave privilegiada, y eso
no se hace desde un celular en el mercado, que es donde se cierra la venta.

### La decisión que ordena todo lo demás

**El panel no corre sobre la clave de servicio.** Meterla detrás de una pantalla
con botones la convierte en modo dios a un clic, y un fallo de autorización
expondría las bases de todos los clientes.

En su lugar:

- `plataforma_admins`, cerrada a `anon` y `authenticated`. **Arranca vacía**: el
  panel está inerte hasta que alguien se dé de alta a mano en la consola.
- `es_admin_plataforma()`, definer porque esa tabla está cerrada.
- Políticas de RLS **aditivas**: la existente sigue dejando que cada dueño vea lo
  suyo, y Postgres combina las permisivas con «o». Nadie pierde acceso.
- Las acciones que necesitan más permiso que leer van como funciones definer.
  Renovar y publicar no se hacen con escrituras directas porque el `grant update`
  de `authenticated` es por lista de columnas y deja fuera `activo`,
  `suspendido_en` y `suscripcion_vence_en`. **Esa omisión es la que impide que un
  dueño se renueve solo, y no se toca.**

### Lo que hace

- **Lista ordenada por urgencia**, no por fecha: quien está por perder sus datos
  va antes que quien vence dentro de un mes. Cinco estados, porque cada uno pide
  una acción distinta, y los días de guarda restantes del suspendido.
- **Renovar** suma al final del período pagado y deshace solo la suspensión por
  falta de pago: un catálogo bajado a mano sigue bajo.
- **Bajar y publicar** con confirmación enfocada en la salida segura.
- **Invitar** a un negocio nuevo por correo.
- **Bitácora** de toda acción, escrita únicamente por funciones: ninguna fila
  aparece sin pasar por un control de quién la escribe.

Sin permiso la página responde 404 en vez de 403: quien no administra la
plataforma no tiene por qué enterarse de que existe. Verificado en producción
que sin sesión `/plataforma` redirige al ingreso y la ruta de acciones responde
401.

### El único lugar con clave de servicio

Invitar crea un usuario en el sistema de autenticación y eso no se puede expresar
con RLS. La ruta usa la clave, pero **solo después de preguntarle a la base si
quien pide administra la plataforma**. Un fallo de autorización ahí no abre la
base: permite mandar una invitación de más.

### Corrección durante la fase

Se había agregado una política que dejaba a la plataforma leer todos los pedidos,
pensando en «ver si un negocio usa el sistema». La pantalla no la usaba y los
pedidos guardan nombre y teléfono de compradores, que son terceros que nunca
aceptaron nada con MiPuesto. Se quitó: un permiso que no se usa solo agrega
superficie.

### Segundo factor

**Hecho.** El panel exige `aal2`: con solo contraseña no se entra. Según
corresponda muestra la pantalla de inscripción —con QR y clave para cargar a
mano— o la del código de seis dígitos.

Todo ocurre en el navegador porque son llamadas al sistema de autenticación: la
clave del factor nunca toca el Worker. Los factores a medio inscribir se
descartan antes de crear otro, porque la clave de un intento anterior ya no se
puede volver a mostrar y si no se acumularían.

**Si se pierde la aplicación de autenticación no hay recuperación desde la
aplicación**, y es a propósito: Supabase no tiene códigos de respaldo. Se
recupera borrando el factor desde la consola de Supabase —Authentication →
Users→ el usuario → factores— y volviendo a inscribirlo. Quien administra la
plataforma tiene acceso a esa consola por definición.

### Lo que falta de la etapa 6

| | Estado |
|---|---|
| Notas por cliente | No hecho. Se hará si administrar de memoria empieza a fallar |
| Alta de administradores desde el panel | **No se hará**: darse el poder de administrar es un acto deliberado en la consola |

### Cómo darse de alta como administrador

Desde el editor SQL de la consola de Supabase, una sola vez:

```sql
insert into public.plataforma_admins (user_id, nota)
select id, 'dueño de MiPuesto' from auth.users where email = 'tu@correo.com';
```

No hay forma de hacerlo desde la aplicación, y es a propósito.

## Estado de Fase 12 — Corte por vencimiento y horarios

Primera etapa del `docs/PLAN-CRECIMIENTO.md`. Nace de un hallazgo incómodo: el
producto prometía por escrito dos cosas que no hacía.

- Los términos decían que un catálogo impago deja de publicarse. Nada lo
  apagaba: `evaluarSuscripcion` solo pintaba un aviso en el panel.
- La privacidad decía que no se borra nada, sin política de retención detrás.

### Corrección al análisis de apertura

Se afirmó que la columna `activo` significaba dos cosas —«pausado por el dueño»
y «suspendido por falta de pago»— y **era falso**. El `grant update` de
`authenticated` es por lista de columnas y no incluye `activo`: el dueño nunca
pudo pausar su catálogo, y esa función no existe.

### Bloque 12.1 — Corte automático (cerrado 2026-09-05)

- Migración `20260905090000_fase12_corte_por_vencimiento.sql`: columna
  `suspendido_en` y función `suspender_suscripciones_vencidas()`, agendada con
  `pg_cron` a las 09:00 UTC —05:00 en Bolivia—, para que nadie quede fuera de
  línea en medio de una venta.
- **Un solo interruptor.** Se descartó agregar una segunda condición de
  visibilidad: `activo` ya gobierna siete políticas de RLS y seis consultas, y
  olvidar una sola dejaría publicado a quien no pagó. `suspendido_en` guarda el
  motivo, no la visibilidad.
- Con el motivo guardado, `suscripcion:renovar` deshace **solo** lo que hizo el
  corte y nunca republica un catálogo bajado a mano por otro asunto.
- La columna queda protegida por omisión: `anon` no la ve y `authenticated` no
  la puede escribir, igual que `suscripcion_vence_en`.
- El panel deja de anunciar el corte antes de que ocurra. El trabajo corre una
  vez al día, así que hay horas entre el vencimiento y el corte; el texto ahora
  sale del estado real y no de la fecha.

**Verificación de ida y vuelta**, sobre `barberia-central` y no sobre el piloto:

| Prueba | Resultado |
|---|---|
| Vencimiento forzado y corte | `activo = false` con motivo |
| Catálogo público | HTTP 404 |
| Segunda corrida de la función | 0 — repetirla no cambia nada |
| Renovación | republicado, HTTP 200 |
| Bajado a mano y luego renovado | sigue bajo, con aviso explícito |

Los cuatro negocios quedaron con sus fechas originales.

### Bloque 12.2 — Textos legales (cerrado 2026-09-05)

- Términos: el catálogo baja al día siguiente del vencimiento y hay **noventa
  días** de guarda, con aviso previo por WhatsApp.
- Privacidad: los mismos noventa días, más el plazo propio y más corto de los
  datos de quien compra —seis meses desde un pedido cerrado—.
- **El borrado a los 90 días no se automatizó a propósito:** los términos
  prometen aviso previo y el aviso por correo llega en la etapa 4. Automatizar
  un borrado irreversible sin el aviso que lo precede repetiría el error que
  esta fase vino a corregir. Mientras tanto `npm run suscripcion:ver` muestra la
  guarda restante.

### Bloque 12.3 — `supabase:push:dev` (cerrado 2026-09-05)

Llevaba `--include-seed` y habría reejecutado `seed.sql` sobre los negocios
reales. Se dividió en `supabase:push` (enlazada, sin seed) y
`supabase:seed:local` (solo local). Se corrigieron las tres referencias en la
documentación.

### Bloque 12.4 — Fechas especiales y feriados (cerrado 2026-09-05)

- El horario solo sabía de días de la semana. Ahora acepta **excepciones por
  fecha**, que mandan sobre el día que les toque y tapan incluso el «siempre
  abierto», que es justo el caso que el dueño quería poder decir sin desarmar su
  configuración.
- El motor de evaluación pasó de una semana abstracta a una **ventana de fechas
  reales**. El modelo anterior no tenía dónde poner una fecha, y la ventana
  resuelve además el intervalo que cruza la medianoche: un sábado marcado como
  cerrado ya no corta un turno que empezó el viernes a las diez de la noche.
  Hay una prueba dedicada a eso.
- Cambio de redacción: cuando la próxima apertura es el día siguiente se dice
  «mañana» en vez de nombrar el día. La prueba que fijaba el texto viejo se
  actualizó a propósito, no se rompió.
- Sin migración: `horario` ya era `jsonb`. Máximo veinte fechas por negocio, y
  las que ya pasaron se limpian solas al guardar.
- Verificado en producción sobre el piloto: con un feriado cargado, el catálogo
  mostró «Cerrado hoy · Prueba de feriado» y los pedidos quedaron pausados. La
  excepción de prueba se retiró después.

### Bloque 12.5 — Paginación en la consulta (cerrado 2026-09-05)

Etapa 2 del plan de crecimiento.

- El servidor mandaba el catálogo entero y el navegador mostraba doce. Ahora la
  categoría, la búsqueda y la página viajan en la dirección y Postgres devuelve
  solo el tramo que se muestra.
- Migración `20260905140000_fase12_busqueda_en_consulta.sql`: columna generada
  `texto_busqueda` con el nombre y la descripción en minúscula y sin acentos, más
  un índice de trigramas. Se usa `translate` y no la extensión `unaccent` porque
  `unaccent` no es inmutable y por lo tanto no sirve en una columna generada, que
  es lo que permite indexar.
- Las páginas pasan a ser enlaces: se pueden compartir, abrir en otra pestaña y
  quedan en el historial. Una página que ya no existe corrige la dirección en vez
  de mostrarse vacía. PostgREST responde ese caso con `PGRST103`, así que el
  código lo trata como dirección vieja y no como fallo del catálogo.
- **El pedido pasa a guardarse en la sesión.** Con la paginación en el servidor
  dejó de ser una comodidad: cambiar de página o buscar es navegar. Guarda además
  una copia de cada producto agregado, porque la página que se está viendo ya no
  lo contiene necesariamente. El precio que se cobra lo sigue calculando
  `crear_pedido_reservado` en la base, así que esa copia es solo para mostrar.
- Se eliminó `paginarCatalogo`, que quedó sin uso. Dejarlo significaba mantener
  dos paginaciones que podían divergir.
- `LIMITE_PRODUCTOS` sube a 300 recién después de lo anterior: subirlo antes
  habría empeorado el catálogo en vez de mejorarlo.

**Medición en producción**, sobre el catálogo del piloto:

| Vista | Peso |
|---|---|
| Catálogo completo | 53.738 bytes |
| Con una búsqueda que devuelve un producto | 39.110 bytes |
| Búsqueda sin resultados | 36.324 bytes |

El peso ahora sigue al resultado y no al tamaño del catálogo, que es lo que
permite los 300 productos.

Comprobado además: mayúsculas y acentos indistintos en los dos sentidos
(`camara`, `CAMARA` y `eléctrica` encuentran el mismo producto), los comodines
de `ilike` recortados antes de la consulta, una categoría inventada cae en
«todo», y la página 99 redirige con 307.

### Bloque 12.6 — Duplicar y ajustar precios (cerrado 2026-09-05)

- **Duplicar producto.** Media carga de catálogo son variantes del mismo
  artículo. La copia nace oculta, porque es un borrador hasta que alguien la
  edite. Las fotos se copian de verdad en el almacenamiento: borrar el original
  borra sus archivos, y una copia que apuntara a las mismas rutas se quedaría sin
  imágenes sin motivo aparente.
- **Ajuste de precios en lote**, sobre todo el catálogo o sobre una categoría.
  Se recorre fila por fila y no con una sola sentencia porque el disparador
  `productos_registrar_cambio_precio` es por fila: así cada producto conserva su
  precio anterior y el ajuste es reversible uno por uno. Ningún precio puede
  quedar en cero.

### Corrección: la apariencia elegida no se publicaba

Encontrado mientras se preparaba la etapa 2, y anterior a ella. La resolución de
plantilla y paleta del catálogo público estaba escrita a mano y se había quedado
en tres plantillas y cuatro paletas. **Un negocio que elegía Feria recibía
Clásica, y uno que elegía Altiplano, Jazmín o Grafito recibía Mercado**, sin que
nada avisara: el panel mostraba la vista previa correcta y el catálogo servía
otra cosa.

Ahora se resuelve con los validadores, que salen del mismo registro que el resto
del sistema, y hay una prueba que recorre las 28 combinaciones.

### Deuda menor detectada y no tocada

`components/catalogo/gestor-catalogo.tsx` usa la clase `listaCategorias`, que no
existe en su hoja de estilos. Es anterior a esta fase y no afecta el
comportamiento; se deja anotado en vez de cambiar la maquetación al cierre de una
etapa grande.

### Bloque 12.7 — Correcciones tras la revisión del dueño (2026-09-05)

Cuatro problemas reportados al probar el producto, y uno encontrado al
investigarlos.

**La caché del negocio no se podía invalidar.** El catálogo guardaba los datos
del negocio con `unstable_cache` y una etiqueta que las rutas del panel
invalidaban al guardar. Esa invalidación nunca funcionó: **cada isolate del
Worker tiene su propia copia en memoria**, así que borrarla en el que atendió el
guardado no toca la del que sirve el catálogo. Lo único que llegaba a ocurrir era
la expiración por tiempo, cinco minutos después.

Medido: con la paleta ya cambiada en la base, producción siguió sirviendo la
anterior y recién cambió sola un minuto más tarde. Para el dueño eso es cambiar
su plantilla, abrir su catálogo y no ver nada distinto.

Se quitó la caché. **No costó tiempo**: los productos ahora se piden en paralelo
con las categorías en vez de esperarlas, y el TTFB quedó en 0,36–0,68 s contra
los 0,49–0,57 s que daba con caché. Un cambio de paleta se ve en segundos.

**El panel mezclaba dos listas.** Categorías y productos compartían pantalla y
ambos listaban todo. Ahora buscar, filtrar y crear viven en una barra arriba de
todo —lo que se usa a diario— y las categorías bajan a un panel plegado. El
buscador mira nombre, descripción y código, sin tildes ni mayúsculas, y hay
filtros de estado: todos, publicados, ocultos.

**Duplicar no se entendía.** La copia caía al final de la lista, oculta y en otra
página: el dueño duplicaba y no encontraba nada. Ahora duplicar **abre la copia
para editar en el acto**, y el filtro «Ocultos» permite encontrarlas después.

**El nombre del producto era un destino táctil invisible.** Era un enlace sin
color ni subrayado; en el celular no hay hover, así que parecía un segundo botón
sin rótulo. Ahora se ve como enlace en las cuatro plantillas.

**El logotipo del negocio sube un escalón** en las cuatro plantillas. La mínima
nunca tuvo regla propia para el suyo y se dibujaba sin recorte ni borde.

No era un problema: la ficha de Pepsi mostraba «cuatro fotos de otros productos»
porque el producto tiene cuatro fotografías propias cargadas. La consulta filtra
por negocio y por código, y las rutas de esas imágenes están en la carpeta del
propio producto.

### Bloque 12.8 — La tarjeta y la ficha del producto (2026-09-05)

Segunda vuelta de revisión del dueño, sobre el mismo tema: cómo se entra a la
información de un producto.

**El nombre dejó de ser enlace.** Se probó primero hacerlo visible —color y
subrayado— y no alcanzó: seguía siendo un destino táctil de más entre la foto y
el precio, compitiendo con el botón de pedir en el único lugar donde la tarjeta
ya tenía una acción clara.

**La ficha suelta se mudó al panel.** Quien reparte un producto por WhatsApp es
el dueño, no el cliente que está mirando, así que cada producto del panel ganó
«Copiar enlace» y la tarjeta pública quedó con una sola acción.

**La foto abre la ficha completa.** Fotografía grande y sin recortar, nombre,
precio, descripción entera, existencias y la acción de pedir. Se abre siempre,
tenga una foto o cuatro: un producto con una sola imagen también necesita dónde
mostrar su descripción. Flechas, teclado y miniaturas aparecen solo con más de
una.

La acción dentro de la ficha es la misma que usan las tarjetas, así que en un
catálogo de solo lectura no dibuja nada por su cuenta y la ficha queda como
vitrina. No hizo falta programar esa excepción.

El rótulo sobre la foto —«Ver» o «Ver · 4 fotos»— dice qué hace al tocarla. Sin
él sería otra vez un destino táctil invisible, que es exactamente lo que fallaba
con el nombre.

**La cabecera de la moderna se compactó** sin achicar el logotipo, que acababa de
agrandarse a pedido.

**Guardián nuevo contra el error de fondo.** El fallo que dejó a Feria y a tres
paletas sin publicar fue una comparación escrita a mano, `plantilla_id ===
"moderna"`, que se quedó en la lista vieja mientras el registro crecía. El
guardián ya cuidaba los cuatro sitios donde se declara una plantilla, pero no que
alguien la reconociera por su cuenta en otro archivo. Ahora recorre `app`, `lib`
y `components` y rechaza cualquier comparación directa contra un identificador de
plantilla o paleta fuera del registro y su validador. Verificado al revés: al
reponer la comparación vieja, el control falla y nombra el archivo.

### Nota de entorno

El disco `C:` de la máquina de desarrollo se llenó por completo durante esta
sesión y el build empezó a fallar con `ENOSPC`. Limpiar la caché de npm no
liberó espacio. Se trabajó apuntando caché y temporales a `D:`:

```
npm_config_cache=D:\tmp-mipuesto\npm-cache
TEMP=D:\tmp-mipuesto\tmp
```

No es un problema del proyecto, pero conviene saberlo antes de perder media hora
diagnosticando un build que falla sin motivo aparente.

### Cierre medido de la etapa 2 (2026-09-05)

El criterio era «un negocio sembrado con 300 productos responde en el mismo
tiempo que uno con 12». Estaba dado por construcción y sin medir; se midió.

Se sembraron 299 productos marcados con código `CARGA-` en `sabor-camba` —el
negocio de ejemplo, nunca el piloto— y se borraron exactamente esos después.

| | 1 producto | 300 productos |
|---|---|---|
| Peso | 33.349 b | 41.679 b |
| TTFB | 0,36–1,04 s | **0,35–0,39 s** |
| Página 20 de 25 | — | 41.327 b · 0,38 s |
| Búsqueda | — | 33.711 b · 0,44 s |

**Criterio cumplido**: el peso sigue al resultado y no al tamaño del catálogo.

Se verificó además contra los datos reales que **duplicar copia todo**: la copia
que hizo el dueño conserva nombre, precio, categoría y **la fotografía**, y queda
oculta a propósito. Lo que faltaba no era contenido sino saber dónde había caído,
que es lo que se corrigió abriendo la copia para editar en el acto.

Queda anotado como decisión y no como deuda que la lista del panel siga paginando
en el navegador: son 156 KB con 300 productos, medidos, a cambio de filtrar sin
esperar sobre todo el catálogo.

### Bloque 12.9 — Etapa 3: peso y uso diario (cerrado 2026-09-05)

**La portada del negocio se servía cruda.** 106.572 bytes medidos, y es la
primera imagen que pide el navegador. Las fotos de producto sí pasaban por el
transformador; las del negocio no, porque su constructor de direcciones devolvía
la ruta del archivo tal cual.

Al arreglarlo apareció algo que no se ve venir: **el transformador de Supabase
devuelve JPEG**, así que reducir un WebP puede engordarlo. La misma portada:

| | Peso |
|---|---|
| Cruda (WebP) | 106.572 b |
| 1200 px, calidad 78 | **142.543 b** — peor que no hacer nada |
| 800 px, calidad 70 | **71.752 b** |
| 800 px, calidad 60 | 61.261 b |

Se tomó 800 px —lo que declaran las plantillas en `sizes`— con calidad 70. Una
prueba impide que alguien vuelva a subir el ancho sin medir. El logotipo bajó a
192 px, que con densidad triple cubre de sobra los 56 px en que se dibuja.

**El master guardado bajó de 1600 a 1200 px.** El tamaño más grande que pide la
aplicación es la galería de la ficha, que es 1200: guardar más era pagar disco
por píxeles que no se sirven nunca.

**Purga de analítica a los 90 días** con `pg_cron`, a las 08:30 UTC —media hora
antes del corte por vencimiento, para que dos trabajos pesados no se estorben—.
Es el mismo plazo que promete la privacidad, así que no hay dos relojes que
explicar. Sin esto, a 500 visitas diarias son 550.000 filas al año de datos que
nadie mira: el panel resume los últimos siete días.

**Agotado en un toque.** Con control de existencias, marcar agotado deja el
stock en cero; reponer sigue por el formulario, porque cuántas unidades llegaron
no se puede adivinar.

**Manifiesto por negocio.** Guardar el catálogo en el inicio del teléfono deja la
tienda del comerciante, con su nombre y su logotipo, y no el directorio de
MiPuesto. No lleva el color de la paleta elegida a propósito: esos colores viven
en el CSS y copiarlos sería una segunda fuente de verdad, que es el error que
dejó a Feria sin publicar.

De paso se corrigió el manifiesto del sitio, que apuntaba a `/icon.svg` desde que
el ícono pasó a PNG: **instalar MiPuesto quedaba sin imagen**.

**El resumen pasó a ser un reporte.** Cada métrica se compara con la ventana
anterior del mismo largo y el color dice el sentido antes de leer. Cuando la
semana previa fue cero no se inventa un porcentaje: pasar de cero a uno es un
estreno, no una tendencia. Suma los pedidos de la semana con su total —aclarando
que es lo reservado y no necesariamente lo cobrado— y el orden de los productos
que más se agregan.

### Cierre medido de la etapa 3

Criterio: primera visita por debajo de 500 KB. Medido en producción, transferencia
real comprimida:

| | Bytes |
|---|---|
| HTML (brotli) | 10.216 |
| JavaScript (brotli) | 208.540 |
| CSS (brotli) | 13.257 |
| Tipografía Inter | 48.432 |
| Portada | 71.752 |
| **Subtotal** | **352.197** |
| 2 fotos de producto visibles (384 px) | ~62.000 |
| **Primera vista** | **~414 KB** |

**Criterio cumplido.** Las fotos siguientes cargan al desplazarse y son
contenido, no sobrecarga.

El JavaScript —208 KB comprimidos— es el piso estructural de React más el
runtime del framework, y no se ataca por ahora: recortarlo exige cambiar de
arquitectura, no de código.

### Bloque 12.10 — Etapa 5: respaldos y vigilancia (2026-09-05)

**Vigilancia de las tareas programadas.** Tres trabajos sostienen la operación
sin que nadie los mire. Si uno deja de correr no pasa nada visible —el catálogo
sigue en pie— y por eso es peligroso: un corte que no corre publica gratis a
quien no pagó, y nadie se entera hasta revisar a mano.

`public.estado_tareas()` informa cuándo corrió bien cada una por última vez y si
se pasó de su plazo. **Distingue «nunca corrió» de «dejó de correr»**: la primera
versión marcaba atrasada la purga recién creada, que simplemente todavía no
llegaba a su hora. Una alarma que suena el día uno por algo que está bien se
aprende a ignorar, y entonces no sirve el día que suene de verdad.

Al aplicarla apareció otro detalle: revocar de `public` deja fuera también a
`service_role`, que es justamente quien tiene que leerla. Se concedió solo a ese
rol.

- **`/api/salud`** responde 200 o 503 para que cualquier vigilante externo sirva
  sin abrir cuenta en ningún servicio. Responde en grueso a propósito: es
  público, así que no dice qué tarea falló ni desde cuándo.
- **`npm run salud`** da el detalle, con la clave privilegiada.

**Respaldo diario de la base a R2**, en `.github/workflows/respaldo.yml`. Corre a
las 07:00 UTC, antes de la purga y del corte, para que refleje el estado previo a
cualquier borrado automático. Separa esquema y datos, y comprueba que los
archivos pesen algo antes de subirlos: un volcado de cero bytes sube igual y da
una falsa sensación de respaldo.

Usa `pg_dump` directo y no `supabase db dump`, que exige Docker.

### Lo que la etapa 5 dejó sin cerrar, y por qué

| | Estado |
|---|---|
| Respaldo de la base | Escrito y listo; **falta que el dueño cargue tres secretos** |
| Ensayo de restauración | **Pendiente**: exige un proyecto Supabase aparte |
| Respaldo de fotografías | **No hecho**. La base es lo irreemplazable; las fotos se le pueden pedir al dueño, con molestia pero sin pérdida definitiva |
| Vigilante externo que avise | **Pendiente**: `/api/salud` está listo, falta algo que lo consulte |
| Alertas de errores en vivo | **No hecho**. Cloudflare ya guarda los registros; falta quien avise |

Los cinco puntos están detallados en `docs/RESPALDOS.md`, con los pasos exactos
de consola que solo puede hacer el dueño.

### Auditoría de cierre

- TypeScript, ESLint, 213 pruebas, tokens, contraste y build de vinext:
  aprobados.
- RLS remoto: 9 tablas con RLS, 8 con políticas, 4 políticas de almacenamiento y
  aislamiento multiinquilino correcto.

### Lo que sigue

Etapa 3 del plan: imágenes de 400 y 1200 px generadas en el navegador, sin
guardar el original de 1600, y purga de analítica a 90 días. Con eso la primera
visita debería bajar de 500 KB.

## Estado de Fase 9

- Inicio: 2026-09-03.
- Estado: **en implementación**.
- Plan técnico y de validación: `docs/PLAN-DISENO-FASE9.md`.
- Alcance actual: keepalive externo, retención de datos personales, auditoría final, despliegue y preparación del piloto de siete días.
- Fuera de alcance temporal: conexión de `mipuesto.com` y validación de su SSL; la URL `workers.dev` continúa siendo el entorno del piloto.

## Estado de Fase 10 — Acabado de producto

Fase posterior al planning original. Nace de una revisión crítica de la interfaz cuyo hallazgo central fue que el sistema de diseño existía pero no se usaba: `Toast`, `EstadoVacio`, `Esqueleto`, `IndicadorEstado` y `HojaModal` solo aparecían en `/estilos`, mientras las pantallas reales resolvían lo mismo con diálogos nativos del navegador y estado local duplicado.

### Decisiones de producto tomadas al abrir la fase

- Se mantiene la venta personal y sin pasarela (confirma el ADR-006). La base y la landing quedan preparadas para sumar autoservicio más adelante, pero no se construye ahora.
- El precio es un plan mensual único de **Bs 80** (decidido el 2026-09-04). La interfaz solo necesita distinguir **vigente / por vencer / vencido**; no habrá columna de plan ni medidores de uso por nivel.
- Las tres plantillas no se rediseñan estructuralmente. Se corrige que la vista previa no coincida con lo publicado y se les da tipografía propia.
- Hay **primer mes gratis**; el panel muestra los días restantes y la landing lo anuncia junto al precio.
- El cobro se resuelve por WhatsApp: la pantalla de cuenta muestra el vencimiento y un enlace para escribir. No se construye subida de comprobantes.
- Los límites vigentes (40 categorías, 4 fotos por producto) son del producto y no del plan: con un solo nivel no hay nada que diferenciar.

### Bloque 10.1 — Sistema de diseño vivo (cerrado 2026-09-04)

- Cola de avisos como reducer puro en `components/ui/cola-avisos.ts`, con seis pruebas propias. Un solo intervalo compartido avanza toda la cola, de modo que pausar es cambiar una condición y no cancelar temporizadores por aviso.
- `ProveedorAvisos` monta la pila en el layout del panel, no en el raíz: el catálogo público no carga ese JavaScript. Las regiones vivas están en el contenedor y los avisos se renderizan con `anunciar={false}`, porque un `role="status"` insertado junto con su texto no se anuncia de forma fiable.
- `ProveedorConfirmacion` expone `await confirmar({...})`. El foco arranca en la salida segura y no en la acción destructiva.
- Los siete `window.confirm` y los dos `window.prompt` desaparecen del proyecto. El renombrado de categorías y subcategorías pasa a una hoja con un campo real.
- Nueve pares de estado de mensaje y sus regiones vivas se retiran de seis pantallas. Los errores de credenciales se conservan junto al formulario a propósito: un aviso que se desvanece es peor ahí. El carrito público y el QR también los conservan, porque no tienen proveedor montado.
- El progreso de subida de fotos se queda inline en vez de convertirse en avisos: son varios archivos seguidos.
- `loading.tsx` en el segmento del panel y relleno para los seis `dynamic()` de plantillas, incluido el catálogo público.
- `IndicadorEstado` declaraba `disponible, reservado, vendido, oculto`; la base define `disponible, reservado, vendido, agotado` y `oculto` pertenece al otro eje, la columna `visible`. Se corrigió la taxonomía y el gestor de catálogo dejó de usar sus tres etiquetas propias.
- Recorte de texto redundante en el panel: los encabezados repetían en rótulo, título y párrafo lo que la navegación ya indicaba. Se eliminó el recuadro «Qué se configura ahora», que reproducía las etiquetas del formulario contiguo, y las tres ayudas del resumen, que reformulaban el nombre de su métrica. Sobrevive solo lo que la pantalla no muestra.
- Saldo neto: 302 líneas eliminadas frente a 122 agregadas en la migración, más 216 líneas de CSS sin dueño.

### Bloque 10.2a — Navegación real de las plantillas (cerrado 2026-09-04)

- El catálogo público apagaba la barra de categorías de la plantilla elegida y la sustituía por un desplegable genérico. El motivo original era válido: la barra de la plantilla usaba anclas `#categoria-id`, que no funcionan con el catálogo filtrado y paginado. El efecto, en cambio, era que lo publicado no se parecía a la vista previa que el dueño usó para elegir.
- Se reemplazan `ocultarNavegacionCategorias` y `navegacionCatalogo` por una sola propiedad `navegacion`, que lleva la lista completa de categorías, la activa, el total de productos y el manejador. Cada plantilla dibuja su propia barra con su estructura y sus clases, conectada a ese estado común.
- La lista de categorías viaja aparte de `datos` porque las plantillas reciben el catálogo ya paginado: usar esa copia dejaría la barra mostrando solo la categoría filtrada.
- Sin la propiedad, la plantilla está en modo demostración y su barra es inerte. No se deshabilita, para que la vista previa no se vea gris.
- El control de tokens rechazó un `0.8125rem` escrito a mano en las tres hojas; se corrigió a `var(--text-xs)`.

### Bloque 10.2b — Tipografía y marca (cerrado 2026-09-04)

- El panel corría con `system-ui` y las plantillas con familias del sistema operativo: Georgia y Arial en la clásica, **Arial en la moderna y Trebuchet MS en la mínima** (invertido respecto de lo que se creía al abrir la fase). Eran defaults, no decisiones.
- El producto pasa a **Inter**. No imita al logotipo: se mantiene neutra a su lado, como pide `DESIGN.md` §4, y aporta altura de x alta para pantallas de gama media a plena luz.
- Cada plantilla recibe la familia de su rubro y la carga en su propio *chunk*: **Fraunces** para la carta editorial, **Archivo** para el escaparate y **Karla** para el directorio de servicios.
- Peso latino medido sobre el artefacto compilado, no estimado: Inter 47 KB, Fraunces 35 KB, Archivo 34 KB, Karla 31 KB, con todos los pesos incluidos. Un catálogo público descarga Inter más una plantilla.
- Las fuentes se sirven desde el propio dominio (`/_next/static/_vinext_fonts/`), así que la CSP `font-src 'self'` no se modificó y no hay peticiones a Google durante la navegación. Verificado en producción: el subconjunto latino de Inter responde HTTP 200 con `rel="preload"`.
- Los precios reciben cifras tabulares en las tres plantillas, el carrito y el acceso flotante, cumpliendo `DESIGN.md` §4, que lo pedía desde el inicio y no se había implementado.
- El logotipo entregado era un PNG de 1254 px, 747 KB y fondo blanco sólido, inservible sobre la barra teal. Se extrajo el canal alfa desde la luminancia y se recortaron por separado el símbolo (12 KB) y el logotipo completo (29 KB), ambos con transparencia. El original se eliminó del repositorio.
- La barra del panel deja de mostrar una «M» provisional y usa el símbolo real, llevado a blanco con un filtro para no duplicar el archivo. El icono de la aplicación pasa de un SVG dibujado a mano a la marca real sobre el teal de identidad.

### Bloque 10.2c — Pie del sitio (cerrado 2026-09-04)

- Pie único en el layout raíz, presente en portada, directorio, panel, error 404 y catálogos públicos. Lleva el crédito de desarrollo de JC-DEV con enlace a sus soluciones y contacto directo de WhatsApp.
- Usa los colores del producto y no la paleta que el dueño eligió para su catálogo, porque es cromo de MiPuesto y no de su tienda.
- Es el único `contentinfo` de la página: el pie que dibuja cada plantilla vive dentro de un `article` y no compite como punto de referencia.

### Pendiente inmediato de la fase

- Verificación manual con sesión real: no se pudo ejecutar desde el entorno de trabajo. Debe comprobarse el borrado de una categoría, el renombrado y la confirmación de una venta.
- Bloque 10.2 — tipografía: **bloqueado** a la espera del logotipo real. `DESIGN.md` §4 exige que la familia del producto conviva con la sans redondeada del logo, y el repositorio solo contiene el ícono geométrico de `app/icon.svg`, sin logotipo. Una vez recibido: sustituir `Georgia`, `Arial` y `Trebuchet MS` por familias alojadas con `next/font/local`, y dar a los precios un rol tipográfico propio con `tabular-nums`.
- **Bloque 10.3 — landing, páginas legales y estado de suscripción. Sin empezar, y es lo que decide si el producto se puede cobrar.** Todos sus datos de entrada ya están resueltos: precio Bs 80, primer mes gratis, cobro por WhatsApp al 59161832872 y logotipo en formato usable.
- Verificación visual de las tres plantillas con la tipografía nueva. El control automático valida contraste y tokens, pero no valida que un título con Fraunces siga entrando en su caja a 360 px.

### Bloque 10.3 — Superficie comercial (cerrado 2026-09-04)

- Portada real en `/`: promesa, tres pasos de puesta en marcha, precio con el primer mes gratis y seis preguntas. La demostración es viva y reutiliza las plantillas del panel, con un negocio de ejemplo distinto por estructura.
- `/terminos` y `/privacidad` con contenido real, enlazados desde el pie. Son requisito para cobrar recolectando nombre y teléfono de clientes finales.
- La columna `negocios.suscripcion_vence_en` guarda hasta cuándo está vigente cada negocio, con un mes gratis por defecto. `/dashboard/cuenta` muestra estado, fecha y renovación, y la franja de aviso vive en el layout para que el dueño se entere antes de que su catálogo se apague.
- **La columna queda protegida por omisión**, y la migración lo documenta porque es fácil romperlo sin notarlo: `anon` y `authenticated` tienen sus permisos por lista de columnas, así que la fecha es invisible en público y el dueño no puede renovarse solo. Verificado contra la base: cero privilegios de actualización para `authenticated` y cero para `anon`.
- Se agrega el token `--text-4xl`, que el panel no necesitaba y la portada sí.

### Operación de suscripciones (2026-09-04)

- `npm run suscripcion:ver` y `npm run suscripcion:renovar -- <slug> [meses]`, siguiendo el patrón de `auth:invitar`: la clave privilegiada se pide a la sesión local del CLI y nunca llega a producción.
- Renovar suma los meses al final del período pagado si sigue vigente, y cuenta desde hoy si ya venció. Renovar tarde no regala días y renovar temprano no los quita. Reactiva el catálogo si estaba fuera de línea.
- **No se construyó panel de super-administración**, porque `SECURITY.md` lo marca explícitamente como prematuro: «construilo cuando administrar a mano te empiece a doler». Con cuatro negocios no duele; el script quita el dolor sin sumar una pantalla privilegiada que proteger.
- Riesgo detectado al aplicar la migración: el script documentado `supabase:push:dev` incluye `--include-seed`, de modo que habría reejecutado `seed.sql` sobre la base con el negocio piloto. Se usó `supabase db push --linked` sin el indicador. Resuelto el 2026-09-05: el script se dividió en `supabase:push` (enlazada, sin seed) y `supabase:seed:local` (solo local).

### Bloque 10.4 — Ficha de producto y búsqueda (cerrado 2026-09-04)

- Cada producto tiene dirección propia en `/[slug]/p/[codigo]`, formada con el código que ya existía y que la base garantiza único por negocio. Muestra todas las fotografías, la descripción completa, el precio con su promoción y la disponibilidad, con la paleta del dueño.
- Hasta aquí un catálogo solo tenía una dirección: no se podía mandar un producto concreto por WhatsApp, que es el canal por el que este producto vende.
- Los marcos de la galería reservan su proporción antes de que llegue la imagen, de modo que el texto no salta al terminar la descarga.
- El nombre del producto enlaza a su ficha desde las tres plantillas, salvo en modo demostración, donde el slug es ficticio.
- **Buscador en el catálogo público**, dentro de la barra de cada plantilla y no en un bloque genérico inyectado encima. Ignora tildes y mayúsculas, exige todas las palabras pero no su orden, mira también la descripción, se combina con el filtro de categoría y reinicia la página al escribir. Sin resultados, la pantalla lo dice y ofrece salida.

### Vistas previas para compartir: un fallo silencioso

- La imagen de Open Graph devolvía HTTP 200 con cero bytes exactamente en los productos que tienen fotografía, que son los que interesa compartir. Ningún control automático lo habría detectado, porque el código de estado era correcto.
- Causa: `lib/imagenes.ts` convierte toda foto subida a WebP y el generador de imágenes solo rasteriza PNG y JPEG.
- Guardar una segunda copia de cada foto habría duplicado el consumo del almacenamiento gratuito, declarado como límite real en el planning. En su lugar se pide a Supabase la conversión al vuelo, acotada a 800 px, que ocurre solo cuando alguien pega el enlace y no en cada visita.
- Se conserva la comprobación de tipo como red: si esa conversión dejara de estar disponible, la tarjeta se arma solo con texto en vez de devolver una respuesta vacía. La portada del negocio tenía el mismo problema y sigue el mismo camino.
- La fotografía se contiene y no se recorta: quien recibe el enlace tiene que ver el producto entero.

### Bloque 10.5 — Rendimiento del catálogo (cerrado 2026-09-04)

- El catálogo resolvía en dos fases: primero buscaba el negocio por su dirección y recién después consultaba categorías, productos y promociones en paralelo. Esa primera consulta estaba sola en el camino crítico y costaba un viaje completo por visita.
- Se cachea solo esa fase con `unstable_cache`. Lo que devuelve cambia cuando el dueño edita su perfil y no cuando alguien compra, de modo que **no hay riesgo de mostrar existencias viejas**: productos y promociones se siguen leyendo frescos y el refresco tras reservar sigue funcionando.
- Las cuatro rutas del panel que tocan esos datos invalidan la etiqueta al guardar con `expire: 0`, para que el dueño vea su cambio al instante y no una versión vieja mientras se refresca por detrás. Al renombrar se invalida también la dirección anterior.
- Medido en producción antes y después: el catálogo pasó de 0,63–1,73 s de TTFB a **0,49–0,57 s**, el mismo rango que una ruta estática. Confirma además que la caché persiste en el runtime de Workers, que era la incógnita.
- **Corrección al análisis de apertura:** el punto sobre imágenes sin `aspect-ratio` era un error. Las tres plantillas ya lo declaraban en tarjetas, portada y logotipo.

### Bloque 11.1 — Guardián de combinaciones (cerrado 2026-09-04)

- El control de contraste tenía las cuatro paletas escritas a mano; ahora las descubre en el CSS del tema.
- Compara además los cuatro sitios donde vive una paleta o una plantilla: el CSS, `DEFINICIONES_*`, la constante que alimenta al validador y la restricción de la base. Si alguno queda atrás, el dueño podría elegir algo que la base rechaza.
- Verificado a la inversa: agregando una paleta solo en el CSS, el control falla y la señala.

### Bloque 11.2 — El pedido en ventana propia (cerrado 2026-09-04)

- El carrito era una sección al final del catálogo y el botón flotante un salto de ancla. En el celular el cliente aterrizaba al pie y perdía el sitio donde estaba mirando.
- Pasa a una hoja modal que bloquea el desplazamiento del fondo, sube desde abajo en el celular y aparece centrada en pantallas grandes. No reutiliza la hoja del panel: aquella usa los colores del producto y esta respeta la paleta del dueño.
- El carrito pierde su marco y su cabecera propia, que dentro de la hoja dibujaban una caja dentro de otra y repetían el título.
- Dos archivos habían quedado fuera del cambio de tipografía y seguían con `Arial`: el carrito y el aviso de horario.

### Bloque 11.3 — Paletas y plantilla nuevas (cerrado 2026-09-04)

- Tres paletas más: **Altiplano** (violeta andino con carmín), **Jazmín** (ciruela con dorado) y **Grafito** (gris carbón con rojo). No se eligieron por gusto sino por hueco: artesanía y textiles, belleza y pastelería, y barberías o talleres eran rubros que las cuatro anteriores no vestían.
- Cuarta plantilla, **Feria**. Las tres anteriores presentan el producto; esta presenta el precio. Fila en vez de tarjeta, foto en miniatura y cifra grande en condensada (**Roboto Condensed**): donde una cuadrícula muestra cuatro productos por pantalla, la lista muestra siete.
- El registro pasa a **4 plantillas x 7 paletas = 28 combinaciones**, y el guardián del bloque 11.1 verificó las cuatro ubicaciones de cada una antes de cerrar.
- Las dos restricciones de la base se reemplazaron por migración versionada y se comprobaron contra la base real, no contra el archivo: `paleta_id` y `plantilla_id` devuelven las listas ampliadas. La migración se aplicó **antes** de fusionar, para que no existiera una versión donde el catálogo ofreciera un valor que la base rechaza.
- La prueba de combinaciones dejó de fijar un número y lo deriva de las listas. Un total escrito a mano obliga a corregir la prueba cada vez que se suma una paleta, y esa corrección mecánica es donde se esconde el olvido que la prueba debería atrapar.
- Se eliminó `selector-plantilla`, sin uso desde que `selector-apariencia` lo reemplazó y con su propia copia del registro de plantillas. Dejarlo significaba que Feria naciera con un cuarto sitio donde faltarle.

### Deuda conocida que la fase 10 no toca

Detectada en la revisión crítica de apertura y deliberadamente aplazada:

- El alta sigue siendo un muro de cuatro formularios en una sola pantalla, sin pasos ni progreso.
- El resumen semanal muestra tres contadores sin comparación con la semana anterior.
- Tailwind sigue instalado sin una sola utilidad ni un `@apply`: solo se usa el bloque `@theme` para declarar variables.
- Riesgos principales: endpoint de mantenimiento público sin autenticación, secretos duplicados o expuestos, tareas programadas silenciosamente fallidas y declarar aprobado un piloto que todavía no cumplió siete días.

## Estado de Fase 8

- Inicio: 2026-09-03.
- Cierre: 2026-09-03.
- Estado: **cerrada; implementación, auditorías automáticas, despliegue y validación manual cumplidos**.
- Plan visual y técnico: `docs/PLAN-DISENO-FASE8.md`.
- Alcance: estado de atención con próxima transición, QR local para compartir, Open Graph por negocio, directorio público paginado, analítica semanal privada, manifest PWA, 404 útil y cabeceras de seguridad.
- Riesgos principales: lectura pública de métricas, llenado abusivo de la base gratuita, directorio con datos no públicos, vista previa social sin imagen y diferencias entre Next.js y vinext al aplicar rutas o cabeceras.

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| Estado de atención | Cumplido en código y pruebas | Usa `America/La_Paz`, informa próxima apertura o cierre, contempla medianoche, oculta `sin_horario` y conserva `Siempre abierto`. |
| QR para compartir | Cumplido en código y build | Se genera y descarga en el navegador con la URL absoluta del negocio; no usa servicios externos y está separado del QR de cobro. |
| QR de pago después de reservar | Cumplido en producción | Después de crear el pedido aparece **Descargar QR de pago** cuando el negocio lo configuró. Conserva PNG, JPEG o WebP, usa un nombre reconocible y ofrece una instrucción alternativa si el navegador bloquea la descarga. |
| Directorio y 404 | Cumplido en smoke local | El directorio consulta columnas explícitas, muestra solo negocios activos y pagina de doce en doce. Un slug inexistente devolvió HTTP 404 y un enlace útil al directorio. |
| Open Graph y PWA | Cumplido en smoke local | Nombre y descripción son dinámicos; la ruta versionada de Open Graph respondió `image/png` con 34.851 bytes. El manifest respondió con `application/manifest+json`. |
| Analítica semanal | Cumplido en código y RLS | Se registran visitas, interacciones de producto y salidas a WhatsApp sin datos personales. `/dashboard` consulta únicamente el negocio autenticado y resume los últimos siete días. |
| Límite e inmutabilidad | Cumplido en base y auditoría remota | Una sesión no puede superar 60 eventos por negocio y hora ni duplicar una interacción. `anon` inserta pero nunca lee; administradores no actualizan ni borran eventos. |
| Cabeceras de seguridad | Cumplido en smoke local | Portada, directorio, manifest, catálogo y 404 entregan CSP, `nosniff` y política de referencia; también se añadió protección contra marcos y permisos innecesarios. |
| Calidad automática | Cumplido | Secretos, ESLint, TypeScript, contraste, tokens, 115 pruebas, ambos builds, lint SQL, RLS multinegocio, auditoría específica, dry-run y arranque Worker aprobaron. |
| Despliegue | Cumplido | El commit `da7b818` quedó publicado en la versión `8547dfdf-6501-4ad0-9902-eda8c8412d77`, que recibe el 100 % del tráfico. El catálogo respondió HTTP 200 con CSP; el bundle público contiene la descarga y el QR configurado respondió `image/webp` con CORS habilitado. |
| Revisión real | Cumplido manualmente | El usuario confirmó el 2026-09-03 que el directorio, horarios, QR, WhatsApp, analítica, 404, manifest y navegación adaptable funcionan correctamente. |

## Estado de Fase 7

- Inicio: 2026-09-03.
- Cierre: 2026-09-03.
- Estado: **cerrada; implementación, auditorías automáticas, despliegue y validación manual cumplidos**.
- Plan visual y técnico: `docs/PLAN-DISENO-FASE7.md`.
- Alcance: promociones por producto o categoría, cálculo centralizado, identidad visual y datos complementarios, QR de cobro y auditoría mínima de precios y activación.
- Riesgos principales: precios negativos o divergentes, promociones cruzadas entre negocios, manipulación del total, configuración ajena y archivos huérfanos en Storage.

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| Promociones | Cumplido en código y pruebas | Porcentaje o monto fijo para producto o categoría, inicio y vencimiento opcionales, pausa y reactivación. Entre varias ofertas se aplica la de menor precio; el resultado se limita a Bs 0. |
| Precio transaccional | Cumplido en base y auditoría remota | El catálogo, carrito y pedido usan el precio promocional. La auditoría creó de forma reversible un producto de Bs 95 y comprobó total e instantánea del artículo en Bs 75. |
| Identidad del negocio | Cumplido en código y pruebas | Logo, portada, QR de cobro y enlaces sociales se administran desde **Negocio** y aparecen en las tres plantillas. Las imágenes reutilizan la compresión y validación de productos. |
| Limpieza de Storage | Cumplido en código y auditoría remota | Cada reemplazo usa una ruta nueva, compensa fallos y borra el archivo anterior. El bucket `negocios` fue auditado con cero archivos sin referencia. |
| Auditoría y permisos | Cumplido en base y pruebas | El último cambio de precio conserva valor anterior, usuario y fecha. Un administrador puede editar solo la identidad de su negocio y no puede modificar `activo` ni `verificado`. |
| Aislamiento multi-tenant | Cumplido | Dos usuarios temporales comprobaron aislamiento de ocho tablas de negocio, promociones, auditoría, límites internos y ambos buckets de Storage. |
| Calidad automática | Cumplido | Secretos, ESLint, TypeScript, contraste, tokens, 108 pruebas, ambos builds, `npm audit`, lint SQL, estado de migraciones, dry-run, tipos y arranque de Worker aprobaron. |
| Despliegue | Cumplido | Workers Builds publicó el commit `caf1db3` como versión `c4983a23-2e6f-4786-bac1-247fa1b02bec` al 100 %. Inicio, catálogo y salud respondieron 200; panel sin sesión respondió 307 y las APIs nuevas respondieron 401. |
| Revisión visual e interacción real | Cumplido manualmente | El usuario confirmó el 2026-09-03 la expiración real, el pedido promocional, la identidad del negocio y el reemplazo de imágenes en el recorrido a 360 px y escritorio. |

Commits de Fase 7: `233a059`, `59d314b`, `7a25fb4`, `63e79c2`, `caf1db3` y `36c2509`.

## Estado de Fase 6

- Inicio: 2026-09-02.
- Cierre: 2026-09-03.
- Estado: **cerrada; implementación, auditorías automáticas, despliegue y validación manual cumplidos**.
- Plan visual: `docs/PLAN-DISENO-FASE6.md` y `docs/PLAN-DISENO-AJUSTES-FASE6.md`.
- Decisiones: reserva cuantitativa para admitir varias unidades y pedidos concurrentes; precios recalculados en una transacción; códigos estables de producto y pedido; expiración idempotente ejecutada directamente por Supabase Cron.
- Riesgos principales: manipulación del total, sobreventa concurrente, duplicación por reintentos, abuso por IP, pedidos fuera de horario y acceso de un administrador a pedidos ajenos.

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| Creación segura | Cumplido en código y pruebas | El Route Handler valida productos y cantidades, vuelve a leer modalidad y horario, y la función transaccional calcula precios desde la base. El total del navegador se ignora. |
| Stock y concurrencia | Cumplido en base y auditoría remota | Bloqueo ordenado de filas, disponibilidad cuantitativa, código estable por producto y liberación idempotente al cancelar o vencer. |
| Idempotencia y abuso | Cumplido en base y pruebas | Una clave por intento evita duplicados y el límite registra como máximo cinco creaciones por negocio e IP anonimizada cada quince minutos. |
| Vencimiento automático | Cumplido en base y auditoría remota | Supabase Cron ejecuta cada cinco minutos una función por lotes con `SKIP LOCKED`; repetirla no descuenta ni libera dos veces. |
| Estados y auditoría | Cumplido en código y pruebas | El administrador puede confirmar o cancelar solo pedidos propios; se conservan usuario, fecha, artículos, cantidades, precios y códigos. |
| Horario y duración | Cumplido en código y pruebas | El panel permite los tres modos, hasta tres intervalos por día y una duración entre 5 minutos y 24 horas; cliente y servidor comparten la validación. No requiere migración porque ambas columnas ya existían. |
| Catálogo escalable | Cumplido en código y pruebas | Selector de categoría, doce productos públicos por página, acceso fijo al resumen y diez productos por página en el panel. El carrito se conserva entre páginas. |
| Fotografías y disponibilidad | Cumplido en código y pruebas | Hasta cuatro fotografías pueden prepararse durante el alta; cada producto con control de stock informa las unidades disponibles reales. |
| Aislamiento RLS | Cumplido | Nueve tablas con RLS; ocho tablas de negocio con políticas y la tabla interna de límites sin acceso desde Data API. Auditoría con dos usuarios aprobada. |
| Calidad automática | Cumplido | ESLint, TypeScript, secretos, tokens, contraste, 95 pruebas, ambos builds, dry-run y arranque Worker, `npm audit`, lint SQL, reservas y RLS remoto aprobaron tras los ajustes. |
| Secreto de ejecución | Cumplido | El usuario ejecutó el helper el 2026-09-03 y Wrangler confirmó `SUPABASE_SERVICE_ROLE_KEY` como secreto cifrado del Worker, sin mostrarlo ni guardarlo en Git. Su nombre queda declarado como requisito de despliegue. |
| Despliegue | Cumplido | Workers Builds aprobó el commit `83e1c7c` y publicó la versión `f53aa2e2-90f7-4a16-bc25-d199a6238aa3`; el catálogo respondió HTTP 200 con navegación y stock, y la API de operación rechazó con HTTP 401 una solicitud sin sesión. |
| Revisión visual e interacción real | Cumplido manualmente | El usuario confirmó el 2026-09-03 que el recorrido completo es funcional y navegable, incluidos los ajustes finales del catálogo público. |

## Estado de Fase 5

- Inicio: 2026-09-02.
- Cierre: 2026-09-02.
- Estado: **cerrada; implementación, auditorías automáticas y validación manual cumplidas**.
- Plan visual: `docs/PLAN-DISENO-FASE5.md`.
- Decisión de alcance: el carrito local y el mensaje consolidado pertenecen a esta fase; la creación del pedido, recálculo de servidor y reserva de inventario permanecen en la Fase 6.
- Riesgos principales: horario inválido o evaluado en otra zona, enlaces de WhatsApp mal formados, acciones visibles en una modalidad incorrecta y lógica duplicada entre plantillas.

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| Catálogo para mostrar | Cumplido en código y pruebas | Conserva información, fotografías y precios sin presentar acciones de pedido. Una modalidad desconocida también cae en solo lectura de forma segura. |
| Acción individual | Cumplido en código y pruebas | Cada producto disponible genera un enlace `wa.me` con celular boliviano normalizado, negocio, producto y precio. Productos agotados, reservados o vendidos no conservan acciones activas. |
| Tienda con carrito | Cumplido en código y pruebas | Carrito en memoria con aumento, disminución, retiro, límite de 99 unidades, subtotal centralizado en `lib/precios.ts` y mensaje consolidado para WhatsApp. No crea pedidos ni reserva inventario antes de la Fase 6. |
| Horario | Cumplido en código y 13 pruebas dedicadas | Contrato `sin_horario`, `siempre_abierto` y `programado`; zona `America/La_Paz`, apertura inclusiva, cierre exclusivo, varios intervalos, cambio de día, cruce de medianoche, solapamientos y formato inválido. Mantiene compatibilidad con el seed anterior. |
| Aviso fuera de horario | Cumplido en código | Aviso textual persistente junto a las acciones; el catálogo permanece navegable. CTA individual y confirmación del carrito quedan deshabilitados. |
| Validación de modalidad al procesar pedidos | Preparada para Fase 6 | Todavía no existe un endpoint que cree pedidos: una solicitud forzada es rechazada con 404 y no modifica datos. El endpoint de Fase 6 deberá reutilizar la modalidad y reevaluar el horario en servidor antes de crear o reservar. |
| Aislamiento multi-tenant | Cumplido | Auditoría remota aprobada nuevamente: dos usuarios, siete tablas, catálogo, cuatro políticas de Storage y apariencia aislados. No hubo cambios de esquema. |
| Calidad automática | Cumplido | Secretos, ESLint, TypeScript, 78 pruebas, tokens, contraste, `npm audit`, build Next.js/vinext, dry-run de Worker, lint SQL y estado de migraciones aprobaron. |
| Revisión visual e interacción real | Cumplido manualmente | El usuario confirmó las tres modalidades, la navegación, el carrito, la restricción por horario y la apertura de WhatsApp el 2026-09-02. |

Commits de implementación: `c99332b`, `658142a`, `d289ee9`, `403852e` y `d8e25bf`.

## Estado de Fase 4

- Inicio: 2026-09-02.
- Cierre: 2026-09-02.
- Estado: **cerrada; implementación, auditorías automáticas y validación manual en producción de desarrollo cumplidas**.
- Plan visual: `docs/PLAN-DISENO-FASE4.md`.
- Riesgos principales: aislamiento multi-tenant, tipo real y tamaño de imágenes, archivos huérfanos y referencias cruzadas entre negocios.
- Decisiones: sin dependencias nuevas; compresión con Canvas; subida validada por servidor; bucket público solo para lectura; escritura y borrado protegidos por RLS.

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| Categorías y subcategorías | Cumplido en código | Crear, cambiar el nombre y eliminar desde `/dashboard/catalogo`; se muestran cinco por página para evitar recorridos extensos y los productos se conservan al borrar su agrupación. |
| Productos y existencias | Cumplido en código | Alta, edición, borrado, precio en bolivianos, organización, `controla_stock`, cantidad y estado agotado validados también en servidor. |
| Visibilidad rápida | Cumplido en código y pruebas | El cambio se realiza desde la lista; la consulta pública exige `visible = true` aunque exista una sesión administrativa. |
| Fotografías | Cumplido en código y pruebas | Hasta cuatro; JPEG, PNG o WebP; máximo original de 5 MB; redimensionado a 1600 px, WebP en cliente, firma y límite de 2 MB comprobados en servidor. |
| Limpieza de Storage | Cumplido en código | Quitar una foto llama a Storage antes de actualizar el producto; borrar un producto elimina todas sus rutas antes de borrar la fila y conserva el producto si Storage falla. Pendiente comprobar el flujo completo con cuatro fotos desde el panel desplegado. |
| Catálogo público | Cumplido en código y desplegado | `/{slug}` usa cliente anónimo, negocio activo, productos visibles, plantilla y paleta guardadas; agrupa por categoría y subcategoría y reserva espacio cuando falta foto. `sabor-camba` respondió 200 en Cloudflare con producto y subcategoría seed. |
| Aislamiento multi-tenant | Cumplido | Auditoría remota con dos usuarios aprobó 7 tablas, jerarquía de catálogo, cuatro políticas de Storage y apariencia aislada. |
| Calidad automática | Cumplido | Secretos, ESLint, TypeScript, 52 pruebas, tokens, contraste, `npm audit`, build Next.js/vinext, dry-run, arranque Worker y lint SQL aprobados. |
| Revisión visual a 360 px y escritorio | Cumplido manualmente | El usuario confirmó que la cabecera, la gestión paginada, el alta de productos y el catálogo público son funcionales y navegables. |

- Despliegue automático de `fd82a73` comprobado el 2026-09-02: `/sabor-camba` y `/api/salud/supabase` respondieron HTTP 200; el catálogo contenía el producto y la subcategoría seed, y `/dashboard/catalogo` sin sesión respondió 307 hacia `/login?motivo=sesion`.
- Ajuste de usabilidad posterior: cabecera distribuida en dos filas en móvil, marca MiPuesto visible, navegación legible, cierre de sesión compacto, categorías paginadas de cinco en cinco y acciones con nombres descriptivos. Los accesos para crear productos ahora desplazan la vista al formulario y enfocan el primer campo.
- La fotografía de perfil o logo y la portada propias de cada negocio permanecen planificadas para la Fase 7, junto con la configuración ampliada de la tienda.

Commits de implementación: `a8dd48c`, `2694f5b`, `22f1752`, `c0cc6cc`, `aa85487`, `0e778de`, `69dc0de`, `27c5244`, `f10839e` y `323e811`.

## Estado de Fase 3

- Inicio: 2026-09-02.
- Cierre: 2026-09-02.
- Estado: **cerrada; implementación, auditorías automáticas y revisión manual cumplidas**.
- Plan visual: `docs/PLAN-DISENO-FASE3.md`.
- Alcance: tres sistemas visuales completos, cuatro paletas combinables, demostración extensa y apariencia persistida desde el panel.
- Puerta de salida: **aprobada**; las tres plantillas se diferencian en composición, tipografía, navegación, botones e interacción, y las cuatro paletas funcionan con cada una.

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| Plantilla clásica | Cumplido en código | Carta editorial con Georgia, encabezado centrado, navegación sobria, filas y acciones discretas. |
| Plantilla moderna | Cumplido en código | Vitrina de alto contraste con Arial, portada comercial, navegación horizontal, cuadrícula y acciones por producto. |
| Plantilla mínima | Cumplido en código | Directorio sereno con Trebuchet, horario y contacto prioritarios, navegación por secciones y recorrido vertical. |
| Cuatro paletas combinables | Cumplido en código | `mercado`, `tierra`, `oceano` y `noche` reasignan tokens semánticos sin cambiar componentes. Las 12 combinaciones son únicas y están cubiertas por prueba. |
| Contraste de paletas | Cumplido | `npm run test:contraste` valida texto, marca, acción, éxito y alerta, además de sus colores de contenido; todos superan 4,5:1. |
| Registro extensible y carga diferida | Cumplido | `lib/apariencia.ts` centraliza identificadores y metadatos; el panel carga dinámicamente solo la vista activa. |
| Datos por propiedades | Cumplido | Las tres variantes reciben exactamente los mismos productos y fotografías; los componentes de `components/templates/` no consultan la red ni la base. |
| Demostración completa | Cumplido en código | Cada variante incluye portada, categorías, fotografías, precios, acciones, horario, WhatsApp y cierre de pedido o consulta según su enfoque. |
| Selección persistida | Cumplido en código | `/dashboard/plantilla` combina estructura y paleta; `PATCH /api/negocios/plantilla` valida ambos identificadores y actualiza mediante la sesión autenticada. |
| Precios centralizados | Cumplido | `lib/precios.ts` concentra el formato en bolivianos y tiene cobertura unitaria. |
| HTML seguro | Cumplido | Todo texto se renderiza con React; no se usa HTML crudo. |
| Aislamiento multi-tenant | Cumplido | Dos usuarios temporales confirmaron que cada administrador puede cambiar su plantilla y paleta, pero no la apariencia de otro negocio. |
| Build | Cumplido | Next.js 16.3.4 y vinext compilaron; el control de secretos del bundle cliente aprobó. |
| Revisión visual a 360 px y escritorio | Cumplido manualmente | El administrador recorrió las 12 combinaciones y confirmó el funcionamiento y la persistencia el 2026-09-02. |

## Estado de Fase 2

- Modelo de alta: solo por invitación; no existe registro público en la aplicación.
- Plan visual: `docs/PLAN-DISENO-FASE2.md`.
- Políticas y pruebas RLS: `docs/RLS-POLITICAS.md`.

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| Sesión SSR y protección del panel | Cumplido en código | `proxy.ts` renueva cookies y usa `getClaims()`; `/dashboard/configuracion` exige sesión válida. |
| Login, recuperación y nueva contraseña | Cumplido manualmente | Las rutas reciben URL y clave Publishable mediante un proveedor de cliente renderizado en servidor. La versión 17 del Worker responde HTTP 200 en `/actualizar-clave`, renderiza la configuración pública y sus bundles no conservan referencias de entorno sin resolver. El 2026-09-02 se solicitó recuperación para los correos de prueba, se abrió el enlace nuevo, se definió contraseña de 10 o más caracteres y se inició sesión correctamente. |
| Alta solo por invitación | Cumplido | `npm run auth:invitar -- correo@negocio.com` usa la CLI autenticada; `Allow new users to sign up` fue desactivado manualmente. |
| Perfil básico y validación servidor | Cumplido | Endpoint protegido validado con sesión real: HTTP 201; no acepta `admin_user_id` del navegador. |
| Slug | Cumplido | Formato, longitud y lista reservada se validan en interfaz, servidor y base; disponibilidad en vivo devuelve solo un booleano. |
| Aislamiento multi-tenant | Cumplido | La auditoría de cierre `npm run test:rls:linked` aprobó con 2 usuarios temporales, 7 tablas y función de slug aislados. El control del seed ahora identifica sus tres IDs base, por lo que sigue siendo válido al crear negocios reales. |
| Confirmación de correo | Cumplido remoto | La configuración pública informa `mailer_autoconfirm: false`; falta verificar el enlace real luego de SMTP. |
| Contraseña y rate limits | Cumplido | Confirmado manualmente: contraseña mínima de 10 caracteres, confirmación de correo y límites de Auth activos. |
| SMTP | Cumplido temporalmente; validación de flujo en curso | Gmail `app.mipuesto@gmail.com` con contraseña de aplicación envió una invitación de prueba. El timeout inicial se debió a un dígito incorrecto en esa contraseña. Ninguna credencial llegó al repositorio; antes de producción se migrará a Resend Free con dominio propio. |
| Despliegue de Fase 2 | Cumplido | `main` fue publicado automáticamente por Cloudflare; `/login` respondió HTTP 200 en la versión del Worker creada el 2026-09-02. |
| Revisión visual a 360 px y escritorio | Cumplido manualmente | El administrador confirmó navegación funcional y sin problemas visuales en móvil y escritorio el 2026-09-02. |

## Estado de Fase 1

- Inicio: 2026-09-01
- Cierre: 2026-09-01
- Estado: **cerrada** después de repetir las auditorías técnicas, visuales, de seguridad y RLS sobre la rama sincronizada con `main`.
- Alcance: tokens visuales, componentes base y página interna `/estilos`.
- Puerta de salida: aprobada; todos los componentes y estados están visibles en `/estilos`, los controles de accesibilidad se cumplen y la interfaz fue validada en móvil y escritorio.
- Plan visual: `docs/PLAN-DISENO.md`.

### Auditoría de Fase 1

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| Plan visual revisado contra prohibiciones | Cumplido | `docs/PLAN-DISENO.md` documenta paleta, tipografía, escalas, layout y correcciones. |
| Tokens sin valores visuales aislados | Cumplido | Tailwind 4 usa `@theme` en `app/globals.css`; los módulos consumen las variables mediante `@reference` y `npm run test:tokens` impide valores aislados. |
| Contraste de color | Cumplido | `npm run test:contraste`: pares normales y de foco entre 5,37:1 y 14,53:1. |
| Estados comprensibles sin color | Cumplido | Disponible, reservado, vendido y oculto combinan símbolo, forma y texto. |
| Foco visible y movimiento reducido | Cumplido | Doble anillo de foco con contraste en fondos claros y oscuros; Chromium confirmó `prefers-reduced-motion` con animaciones y transiciones efectivamente reducidas. |
| Siete componentes y sus estados en `/estilos` | Cumplido | HTTP 200; contenido de botones, campos, estados, modal, avisos, vacío y carga presente. |
| Revisión visual a 360 px y escritorio | Cumplido | Chromium Headless real validó 360 × 8000 y 1440 × 7000 px sin desbordamiento horizontal; capturas inspeccionadas, controles etiquetados, navegación por foco y cierre del modal con `Escape` aprobados. |
| Auditoría RLS al final de la fase | Cumplido | 7/7 tablas con RLS y políticas; seed e índices verificados de nuevo. |
| Build y verificaciones | Cumplido | Secretos de cliente, ESLint, TypeScript, Vitest, tokens, contraste, `npm audit`, build Next.js/vinext, dry-run, arranque del Worker, lint SQL y RLS aprobados. |

Commits de implementación: `e08d2b9`, `eafd11d`, `0659be1`, `06605f1`, `b69c57b` y `bd62717`.

## Decisiones registradas

### ADR-001 — Desarrollo local reproducible

- Se fija Node.js 22.23.1, compatible con Next.js 16.
- Las dependencias directas quedan fijadas sin rangos y se versiona `package-lock.json`.
- Supabase CLI se instala como dependencia de desarrollo del proyecto.

### ADR-002 — Clave pública de Supabase

- Se prefiere `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, recomendación vigente de Supabase.
- Se acepta `NEXT_PUBLIC_SUPABASE_ANON_KEY` como compatibilidad temporal con el planning.
- La clave de rol de servicio nunca se expone con prefijo `NEXT_PUBLIC_`.

### ADR-003 — Cloudflare Pages y Next.js

- El planning indica Cloudflare Pages.
- La documentación vigente reserva Pages para exportaciones estáticas y dirige Next.js dinámico a Workers.
- MiPuesto requiere servidor para Auth, validación y recálculo de pedidos; no se fuerza una exportación estática.
- `vinext check` confirmó compatibilidad funcional: 2/2 imports, App Router, página, layout y Route Handler soportados; el único ajuste requerido era ESM.
- Se adopta vinext `1.0.0-beta.8` con Workers Cache, sin KV, Cloudflare Images ni funciones experimentales. Next.js estándar se conserva en paralelo mientras vinext permanezca beta.
- El Worker de desarrollo se llama `mipuesto-dev`, usa fecha de compatibilidad `2026-09-01`, `nodejs_compat` y observabilidad.
- Cloudflare usa una cuenta exclusiva de MiPuesto (`a558c055e89f45ad66d4de1ec1e31a2a`) y `wrangler.jsonc` fija su `account_id`; no se crearán D1 ni R2 porque esta fase usa Supabase Database y Storage.

### ADR-004 — Supabase remoto como entorno de desarrollo

- Docker se difiere porque la unidad C: tiene solo 2,9 GB libres.
- Se usará un proyecto remoto independiente llamado `mipuesto-dev`; nunca se reutilizará `yapabot-dev`.
- Región recomendada: São Paulo (`sa-east-1`), la opción disponible más cercana a Bolivia.
- El seed se permite solo en este proyecto de desarrollo. Producción no recibirá datos de prueba.
- Lint y la auditoría SQL remota se ejecutarán con `--linked` al final de cada fase.
- `supabase test db --linked` todavía requiere Docker para levantar el runner de pgTAP; mientras Docker siga diferido, `npm run test:rls:linked` valida las mismas invariantes directamente en la base remota y falla ante cualquier incumplimiento.

### ADR-005 — Sistema visual cerrado y protegido

- La paleta queda limitada a seis tokens semánticos y la tipografía usa la pila del sistema, sin descargas externas.
- Tailwind 4 define los tokens en `app/globals.css`; los módulos CSS los comparten mediante `@reference` para evitar duplicación y la inyección incorrecta de estilos globales.
- Los componentes base cubren sus estados interactivos y muestran foco de alto contraste en superficies claras y oscuras.
- `npm run test:tokens` y `npm run test:contraste` forman parte de la suite para impedir colores, tamaños, espaciados o combinaciones de contraste fuera del sistema.

### ADR-006 — Alta controlada de administradores

- MiPuesto vende suscripciones personalmente; por eso no se publicará un formulario de registro.
- Las cuentas se habilitan con `npm run auth:invitar -- correo@negocio.com`, que usa la sesión existente de Supabase CLI para obtener la clave administrativa solo durante el proceso local.
- El enlace de invitación lleva a `/actualizar-clave`; ahí el administrador define su contraseña y luego crea o edita un único negocio.
- La contraseña nunca pasa por código servidor propio durante el login o la recuperación; las operaciones de Auth se realizan con Supabase y la configuración del negocio se valida de nuevo en un Route Handler protegido.

### ADR-007 — Plantillas reutilizables antes del catálogo público

- Las variantes clásica, moderna y mínima reciben el mismo contrato de datos por propiedades y no realizan consultas propias.
- La vista de Fase 3 es privada y usa datos de demostración junto con el nombre, descripción y WhatsApp reales del negocio.
- Estructura y color se guardan por separado en `negocios.plantilla_id` y `negocios.paleta_id`; la base limita ambos conjuntos y RLS mantiene el aislamiento.
- Las cuatro paletas solo reasignan tokens semánticos y pueden combinarse con las tres plantillas sin duplicar la lógica del catálogo.
- El catálogo público por slug no se adelanta: se integrará con productos reales en la Fase 4.

## Auditoría de Fase 0

| Control | Estado | Evidencia o pendiente |
|---|---|---|
| `.env.local` ignorado desde el primer commit | Cumplido | `git check-ignore -v .env.local` apunta a `.gitignore`. |
| No hay claves en el historial Git | Cumplido | No se encontraron asignaciones con valor ni JWT en archivos o historial. |
| Clave privilegiada ausente del cliente | Cumplido | El control revisa código y bundles cliente de Next/vinext; se ejecuta en lint, prebuild y postbuild de Workers. |
| RLS habilitado en todas las tablas | Cumplido | Auditoría remota: 7/7 tablas con RLS y políticas; permisos sensibles y función administrativa verificados. |
| Seed con tres modalidades | Cumplido | Auditoría remota: 3 negocios y las 3 modalidades presentes. |
| Build y pruebas locales | Cumplido | Next.js y vinext compilan; lint, TypeScript, Vitest, dry-run y chequeo de arranque pasaron el 2026-09-01. |
| Deploy de prueba | Cumplido | Workers Builds publicó automáticamente la versión `9a3b3322-d6cc-4c79-8b87-d9a963f22e65` con 100 % del tráfico; `https://mipuesto-dev.mipuesto-app.workers.dev` y el endpoint de salud respondieron HTTP 200. |
| Proyecto Supabase remoto independiente | Cumplido | `mipuesto-dev` (`afhnxjdqaruwccgsdxzb`) enlazado en `sa-east-1`; `yapabot-dev` permanece fuera de alcance. |
| Conexión de la aplicación | Cumplido | `.env.local` configurado; `/api/salud/supabase` respondió HTTP 200 con estado `ok`. |
| Asesores de Supabase | Cumplido con limitación | Sin errores. La única advertencia de seguridad restante es la protección de contraseñas filtradas, disponible desde el plan Pro. |

## Pendientes manuales previstos

- Docker queda opcional y diferido hasta disponer de más espacio en C:.
- Con autorización explícita, eliminar el Worker homónimo de la cuenta Tienda Blanco; se conserva por ahora como respaldo y no bloquea el cierre de la fase.

## Registro de verificaciones

### Nota sobre el tramo del 5 al 17 de septiembre

Este tramo se escribió el **17 de septiembre de 2026, de una sola vez**,
reconstruyéndolo del repositorio. El registro se había quedado en el cierre de la
Fase 3 del plan anterior, con 389 commits sin anotar y siete fases del plan de
`docs/plan/06-FASES.md` sin cerrar acá.

Se anota como es y no se disimula: **lo que sigue no es el registro que se fue
tomando al cerrar cada fase**, sino lo que se puede comprobar hoy en el
repositorio y en producción. Lo que sí es verificable de cada entrada son los
commits que la sostienen, las guardias que corren en `npm test` y la marca de
despliegue que quedó en `/api/salud`.

Lo que **no** se puede reconstruir, y por eso no figura: qué se verificó a mano
en cada cierre y con qué resultado. Esa evidencia se perdió, y es exactamente el
motivo por el que este archivo existe.

### 2026-09-23

- **Fase 13, paso 4: el editor del panel.** El tipo arriba (Talla, Número de
  calzado, Tamaño, Otra opción), atajos que cargan la lista de una vez («S a XXL»,
  «Varón 38 a 45», con o sin medios números), orden automático de tallas y
  números, existencias obligatorias por presentación si el producto las
  controla, «A la vista» para ocultar sin borrar, lo apartado de cada una, y una
  presentación con pedidos pendientes no se puede quitar (se dice por qué).
  Al sacar todas, pide las existencias del producto. El formulario del producto
  deja de pedir existencias cuando van por presentación, la validación del
  servidor ya no se las exige, y la lista dice «Existencias por presentación».
  El validador normaliza según el tipo y exige existencias por presentación
  (prueba vieja actualizada, con el motivo). La prueba de los atajos encontró
  que «Niños 20 a 34» con medios números daba 29, más que el tope: va sin
  medios. Textos nuevos en español neutro. Una prueba que recorre todas las
  hojas de estilo pasó a tener 20 s de margen: con la suite entera fallaba por
  tiempo.

- **Fase 13, paso 2: la talla se reserva, se cobra y se descuenta.** Migración
  `20261019090000`:
  - **Fuente única de existencias sostenida por la base**: `productos.con_presentaciones`
    (la calcula la base), un disparador que deja en nulo las existencias del
    producto que las lleva por presentación y le calcula el estado
    (`estado_por_presentaciones`), y una comprobación **diferida** al final de la
    transacción (existencias coherentes y números de calzado válidos). Da igual
    quién escriba: el formulario viejo, la API o el motor.
  - **El motor de compra**: `crear_pedido_reservado` exige la presentación
    (`PRESENTACION_REQUERIDA`), la valida (`PRESENTACION_NO_DISPONIBLE`), cobra
    su precio —la propia sin promoción, o la del producto con promoción, la misma
    regla que el catálogo— y reserva sobre ella; confirmar, cancelar y expirar
    pasan por una sola función, `liberar_reservas_del_pedido`. Bloqueo en orden
    fijo (productos y después presentaciones) contra interbloqueos. Sin tablas
    temporales: una por pedido escribe en el catálogo de Postgres.
  - **`guardar_presentaciones`** reemplaza al borrar-y-volver-a-crear del
    editor: conserva los identificadores, se niega a borrar una presentación con
    unidades apartadas, y guarda tipo y presentaciones en una transacción.
  - La ruta de pedidos acepta `varianteId`, traduce los errores nuevos y el
    mensaje de WhatsApp dice «Zapatilla Runner (N.º 40,5)»; el editor actual ya
    reenvía los identificadores; «Marcar agotado» explica que un producto con
    presentaciones se agota por presentación.
  - **Pruebas** (todas en la base de ensayo): `fase13-motor.sql` (reservar,
    confirmar, cancelar, expirar una sola vez, precios, agotados, fuente única,
    permisos, regresión del pedido sin presentación), probada rompiendo la regla
    de precio; `test-presentaciones-concurrencia.mjs`: 20 compradores por el último
    par → gana 1; 50 pedidos mezclados → nunca de más; 30 cruzados → cero
    interbloqueos; 5 expiraciones a la vez → una devolución. **Probada quitando
    los bloqueos con la ventana de carrera abierta (0,2 s):** la restricción de la
    tabla igual impide apartar de más, pero el comprador recibe un error técnico
    en vez de «no alcanza», y la prueba lo detecta. Con los bloqueos pasa.
    La prueba encontró dos errores propios antes de producción (`with ordinality`
    con lista de columnas, y la limpieza en dos pasos que la fuente única rechaza).
  - `test:rls:linked` en verde en producción.

- **Décimo defecto del respaldo, corregido.** La restauración no copiaba los
  permisos del **esquema** `private`: saltea las entradas SCHEMA del volcado y
  crea el esquema a mano, sin el `usage` que producción le da a `service_role`.
  Las tablas y funciones de adentro tenían sus permisos, pero no se podía entrar
  al esquema, y ahí viven el cálculo de precios y el motor de pedidos: **una
  restauración de producción habría dejado sin pedidos a todos los negocios.** Lo
  encontró la prueba de humo de la fase 13 en la base de ensayo («permission
  denied for schema private»). `generar-permisos.sql` ahora emite la revocación y
  los permisos del esquema a partir de lo que tiene producción (comprobado en
  solo lectura contra producción: emite `grant USAGE on schema private to
  service_role`). La base de ensayo recibió ese permiso y creó un pedido por la
  misma función que usa el catálogo.

- **Fase 13, paso 1: el modelo de la talla.** Migración `20261018090000`, toda
  aditiva (ningún pedido cambia de forma de funcionar):
  `productos.tipo_presentacion` (talla, numero, tamano, presentacion); el número
  de calzado normalizado por la base (`normalizar_numero_calzado`: `38.5`, `38½`
  y `38,5` son `38,5`; de 16 a 50) y la talla en mayúsculas (`normalizar_talla`),
  aplicados por disparador al guardar; el tope sube de 12 a 24; las
  presentaciones suman `cantidad_reservada` —que el dueño ya no puede escribir: el
  permiso pasó a ser por columna—, la pareja `(id, producto_id)` y una guardia
  que impide borrar una presentación con unidades apartadas; `pedido_items` suma
  la presentación (identificador, nombre y tipo copiados) con clave compuesta que
  exige que sea **de ese producto**, y la unicidad pasa a
  `(pedido_id, producto_codigo, variante_nombre)`: la M y la L son dos renglones.
  Pruebas: `supabase/tests/remote/fase13-presentaciones.sql` contra la **base de
  ensayo** (`npm run test:fase13:ensayo`), un único bloque que deshace todo lo que
  escribe; probada rompiéndola dos veces (un caso equivocado y la guardia de
  borrado desactivada). Los casos de normalización los lee también Vitest y los
  corre contra `lib/catalogo/variantes.ts`: las dos reglas no pueden separarse.
  La base de ensayo se puso al día (29 migraciones) y pasó el aislamiento.
  `test:rls:linked` en verde en producción.
  **Encontrado al diseñar el paso 2:** el editor de presentaciones borra todas y
  las vuelve a crear, así que sus identificadores cambian en cada guardado. Con
  reservas eso rompería pedidos pendientes, por eso el editor que conserva los
  identificadores sale junto con el motor de compra.

- **La lista de precios ubica cada sección en la categoría más parecida.**
  `/api/ia/lista` recibe las categorías del negocio como lista cerrada
  (`categoria_del_negocio`, con «(ninguna)»), en la misma consulta. La revisión
  propone para cada sección: la categoría que se llama igual, o la que la lectura
  sugirió para la mayoría de sus productos, o crear una (`lib/catalogo/
  destinos-de-lista.ts`, 8 pruebas, verificadas rompiendo el desempate). Los
  renglones sin título llegan agrupados bajo la categoría sugerida. Un aviso dice
  cuándo la propuesta es una sugerencia. Probado contra Gemini real: «BEBIDAS» →
  Refrescos, «ALMUERZOS» → Comidas, «DULCES» → Postres y tortas; sin títulos,
  cada producto a la suya y un martillo en «(ninguna)». La lectura de categorías
  del negocio quedó compartida en `lib/ia/servidor.ts`.
- **La tarjeta sin foto muestra el dibujo de su categoría** sobre el color del
  negocio, con la proporción de una foto, en vez del recuadro oscuro «Sin foto».
- Los textos nuevos van en español neutro; la revisión del resto queda para la
  depuración de la fase 9.

- **La lectura de fotos viene con el plan.** Migración `20261017090000`:
  `foto_ia_habilitada` pasa a ser «la plataforma no la apagó», con valor por
  omisión `true`, y los cuatro negocios en plan Catálogo —que pagaban diez
  lecturas al mes y no veían la herramienta— la reciben. Se retira el tope de
  diez negocios con IA: estaba calculado para 40 fotos diarias por negocio y los
  planes topan en 3 (Catálogo) y 15 (Activo), así que la cuota gratuita alcanza
  para unos 130 negocios en Catálogo o 26 en Activo. En su lugar, Plataforma
  muestra «Cuota comprometida por día» contra `CUOTA_REPARTIBLE_POR_DIA` (400) y
  avisa desde el 60 %. `admin_cambiar_foto_ia` ya no recibe cupo: apagar es para
  el abuso. Términos y privacidad corregidos («vienen incluidas en los dos
  planes»). Pruebas de reparto reescritas: al menos veinte negocios del plan más
  caro en la cuota gratuita, y ningún plan por encima del techo de 40 por día.
  `test:rls:linked` en verde.

- **«Salir» en Plataforma.** En el encabezado, del lado derecho, con borde para
  que se encuentre sobre el fondo; y al pie del segundo factor, «Salir y entrar
  con otra cuenta», para quien no tiene el teléfono a mano. Es el mismo
  `CerrarSesion` del panel, que ahora acepta la variante.

- **La foto de un producto elige la categoría entre las del negocio.**
  `/api/ia/producto` lee las categorías del negocio de la sesión (no las acepta
  del navegador) y se las pasa al modelo como lista cerrada: el esquema solo
  admite una de ellas o «(ninguna)». Antes proponía una o dos palabras sin
  conocer el catálogo y solo servían si coincidían letra por letra. Nunca crea
  una categoría y no pisa una ya elegida; el aviso dice dónde quedó o que
  ninguna corresponde. Probado contra Gemini real con las fotos de muestra:
  hamburguesa → «Hamburguesas», limonada → «Bebidas frías» (sin coincidir el
  nombre), papas fritas en una ferretería → «(ninguna)». Pruebas nuevas en
  `lib/ia/categoria-desde-foto.test.ts`, verificadas rompiendo la coincidencia.

- **La cámara en las dos herramientas de IA.** En «Nuevo producto» y en
  «Cargar desde una foto» hay un botón que abre la cámara de atrás
  (`capture="environment"`) junto al de elegir el archivo. Solo en pantallas
  táctiles: con mouse `capture` se ignora y serían dos botones para lo mismo.
  Los dos llevan el degradado de IA porque los dos gastan una lectura. Ninguna
  de las dos herramientas lee por lotes: una foto (o un PDF) por lectura.

- **El catálogo público en tablet y computadora.** Desde 64rem el catálogo va
  en una columna centrada (`--ancho-catalogo`, 72rem): la cabecera y la barra de
  búsqueda siguen de borde a borde con su contenido alineado a la columna, la
  portada entra en ella a 3:1 con sus esquinas (a lo ancho de un monitor medía
  ~580 px de alto), y las columnas de productos dejan de crecer con la pantalla
  (vitrina 5, cuadrícula 5, fila 3). Desde 48rem las categorías son pastillas
  con el nombre entero en vez de cuadraditos con «Perfum…». El teléfono no
  cambia, ni el que dibuja la portada (`data-marco="telefono"` lo deja afuera).
  **El banner estaba roto en producción**: `next/image` pasa por @unpic, que
  con `width`/`height` le escribía al elemento un tope de 800 × 200 y pedía la
  foto recortada a 4:1; ahora va con `fill` y la franja tiene su forma en el
  CSS. El logo de la cabecera lleva su medida en el CSS por la misma razón.
  La guardia de tokens acepta `max()`, `min()` y `clamp()` con la regla de
  `calc()` (probada con dos casos rotos a propósito).
- **Portada: las herramientas de IA en dos ejemplos** —la lista escrita que
  sale producto por producto, la foto que completa nombre y descripción— con
  las lecturas de cada plan leídas de `lib/planes.ts`; la pregunta frecuente
  equivalente se quitó. **El nombre MiPuesto no se esconde más** en teléfonos
  de 360 px: ahí «Ingresar» queda en su silueta.

- **Portada y directorio, rediseñados: la noche y el sol.** El sitio público
  tiene su propia paleta —fondo noche, acento sol y la cinta de aguayo como
  firma— con tokens `--color-sitio-*` y `--aguayo` y sus pares en la guardia de
  contraste; el teal de MiPuesto queda para el panel y la tarjeta de acrílico.
  Una cabecera común (`CabeceraSitio`) con **«Directorio · Buscá negocios»** en
  el menú principal, visible también en el teléfono. **Buscador vivo**: a partir
  de dos letras muestra negocios y productos con su foto
  (`/api/directorio/sugerencias`), con ejemplos que rotan en el campo; sin
  JavaScript busca igual con Enter. La portada cuenta con ejemplos en vez de
  párrafos: el pedido que llega junto al teléfono, la cinta de rubros que corre
  (quieta con movimiento reducido), los tres pasos dibujados —la lista a mano,
  el enlace, el chat del pedido— y el buscador del directorio para probarlo
  ahí. Precios sin cambios (100, 150, 250 y 100 por tarjeta). El directorio:
  lo más buscado en baldosas, ciudades como pestañas, filtros que se aplican
  solos, rubros con su dibujo y cada negocio como puesto (portada, logo encima,
  abierto o cerrado, productos que coinciden).
  De paso: el teléfono de la portada ponía seis tarjetas en 300 px porque la
  plantilla sigue al ancho de la ventana; ahora el marco lo avisa con
  `data-marco="telefono"`. Y `next.config` admite las fotos achicadas de
  Supabase (`/render/image/`), que en local rompían el directorio. Revisado en
  Chromium a 390 y 1366 px, con el buscador escribiendo de verdad.

- **Noventa sinónimos más** para lo que se busca en un catálogo boliviano
  (comida, ropa, tiendas, construcción, belleza, mascotas): 96 en total, y los
  que la plataforma edita no se pisan. Coinciden **por la raíz**, con una regla
  nueva para los dos plurales —«juguetes» y «juguete» dan «juguet», «flores» y
  «flor» dan «flor»— en una sola función de la base (`raiz_de_palabra`) que la
  búsqueda, los sinónimos y los rubros comparten.
- **La lista de búsquedas sin resultado se atiende**: se ven las 20 más
  repetidas con el total arriba, cada una se puede descartar, y se descarta
  sola al cargarle un sinónimo. El tope de 5000 frena solo las palabras nuevas;
  antes, al llegar, dejaban de contar también las que ya estaban.

- **Fase 12 desplegada: el directorio busca.** `/directorio` pasa a tener un
  buscador y filtros de ciudad, zona y rubro que solo ofrecen lo que tiene
  negocios, «Cerca de mí» (ubicación redondeada a ~1 km, pedida al tocar el
  botón y nunca guardada), y resultados con los productos que coinciden, que
  llevan directo a la página del producto. Sin resultados ofrece lo que sí hay
  en esa ciudad e invita a sumarse a MiPuesto. Páginas propias para Google:
  `/directorio/{ciudad}` y `/directorio/{ciudad}/{rubro}`, en el mapa del sitio
  solo si tienen negocios; y `robots.txt` que deja afuera el panel.
  Una sola función en la base, `buscar_en_directorio`, con la raíz de cada
  palabra, sinónimos curados y tolerancia a errores de tipeo. **Nunca devuelve
  coordenadas**: lo vigilan una guardia sobre todas sus versiones y la prueba
  de aislamiento contra la base real, con el peor caso armado a propósito.
  Plataforma suma la pestaña «Buscador»: lo que se buscó y no se encontró, y los
  sinónimos. Nueva tarea programada de purga, vigilada y recreable.

### 2026-09-22

- **Fase 11 desplegada: dónde está y qué vende.** Migración `20261013090000`:
  tabla `zonas` (de la plataforma), y en `negocios` la ubicación, la zona, el
  rubro público en dos capas y la decisión de aparecer en el buscador —nula
  hasta que el dueño responde—. **Las coordenadas nunca se conceden al
  público**: lo vigilan una guardia sobre las migraciones y
  `test:rls:multitenant` contra la base real, y las dos se probaron rompiéndolas
  (la segunda abriendo el permiso unos segundos en producción, sin coordenadas
  cargadas).
  El paso 2 del alta pasa a ser «Qué vendés y dónde», con el mismo bloque que
  «Mi negocio»: rubro público, hasta dos secundarios, la pregunta obligatoria y,
  si dice que sí, ciudad y pin en un mapa (Leaflet + OpenStreetMap, solo en esas
  dos pantallas). Plataforma suma la pestaña «Zonas». El directorio lista solo
  a quienes eligieron aparecer, así que **hoy está vacío** hasta que los
  negocios respondan.

- **Fase 10 desplegada: tres formas de tarjeta.** Cuadrícula, una por fila con
  miniatura, y lista de precios sin fotos; se eligen en Apariencia. Un solo
  componente con `data-forma`: la forma cambia el aspecto y nunca la acción.
  Columna `negocios.forma_tarjeta` (migración `20261012090000`). Prueba de
  dibujo 3 formas × 3 modalidades, con sus tres guardias probadas rompiéndolas.
  Pendiente del dueño: probarlo desde Apariencia y en el teléfono.
- **La tercera forma pasó de «lista de precios» a «vitrina»**, a pedido del
  dueño: la foto ocupa la tarjeta y el nombre, el precio y el botón van encima,
  sobre la cortina de la paleta. Migración `20261012120000`.
- **AGENTS.md**: las pruebas de dibujo dejan de estar prohibidas y la regla dice
  cuándo corresponden.
- **Plan de las fases 10 a 12** en `docs/plan/09-DIRECTORIO-Y-FORMAS.md`.

- **Precios nuevos**: plan Catálogo **Bs 100** (antes 80) y Catálogo Activo, con
  las herramientas de IA, **Bs 150** (antes 120). La carga del catálogo por
  nosotros sigue en Bs 250. «Cuenta» y la cabecera de «Plataforma» ahora usan
  el precio del plan de cada negocio: antes los dos multiplicaban por el precio
  de entrada.
- **Producto nuevo: tarjeta de acrílico** de 12,5 × 17,5 cm con diseño propio,
  QR y NFC que llevan al catálogo —y de ahí a calificar en Google Maps—. Bs 100
  por unidad, configuración incluida, sin el mes del catálogo
  (`TARJETA_ACRILICO` en `lib/planes.ts`; también en los términos).
- **Portada rehecha como embudo**: promesa y precio de entrada en la primera
  pantalla, la muestra en vivo, tres pasos, la tarjeta (con un QR real dibujado
  en el servidor, `lib/qr-svg.ts`), dos planes y los extras de una sola vez, y
  las preguntas. Salieron la franja de cifras, los rubros, la sección de IA, la
  tabla contra WhatsApp y el bloque del directorio: lo que decían pasó a las
  preguntas o a una línea.
- **El pago anual dejó de publicarse**: Bs 850 era un 11 % sobre 12 × 80 y
  pasaba a ser un 29 % sobre 12 × 100 sin que nadie lo decidiera. Queda en
  `PLAN_ANUAL` hasta que se fije el número nuevo.
- **Auditoría previa al MVP.** Hallazgos corregidos: `test:rls:linked` estaba
  rojo desde la fase 6 (exigía la columna `plantilla_id`, ya borrada) y tapaba
  seis comprobaciones; la ruta de citas del panel devolvía el texto crudo de
  Postgres; las citas públicas no tenían tope por IP (ahora 5 cada 15 minutos,
  migración `20261010090000`); y la caducidad de reservas corría cada 5 minutos
  de a 100 —ahora cada minuto de a 500, migración `20261011090000`—.

### 2026-09-19

- **La portada es el primer cartel del negocio, y el banner de arriba se fue.**
  Había tres franjas anchas seguidas —portada, banner de arriba, publicidad— y
  las dos primeras iban casi pegadas. Lo que se podía escribir sobre el banner
  (antetítulo, título, bajada, botón con destino) se escribe ahora **sobre la
  portada**, desde «Apariencia», con la misma vista previa. Columna nueva
  `portada_texto`; `banners` queda con un solo lugar, el de la mitad.
  Migración `20261009090000_fase9_el_texto_de_la_portada` aplicada en
  producción (ningún negocio tenía el banner de arriba cargado; el de la mitad
  pasó al primer lugar).
- **La cortina solo si hay texto.** El sombreado en degradé de la portada y del
  banner existe para que la letra se lea, y sin letra no se dibuja: una foto
  sin cartel se muestra entera. Los dos carteles son una sola pieza
  (`components/templates/texto-sobre-imagen.tsx`), con una sola cortina y una
  sola tipografía; antes eran dos, con opacidades distintas.
- **En las paletas oscuras la cortina es el fondo y la letra clara.** Tokens
  `--catalogo-cortina` y `--catalogo-sobre-cortina`; las cinco paletas oscuras
  los declaran, y el control de contraste comprueba el par en las dieciséis.
  Antes la cortina salía de la marca —naranja, dorado, coral— con letra oscura.
- **El botón del cartel puede bajar a «Mis productos»**, que era lo que hacía el
  botón fijo de la portada. Un destino dentro del catálogo se dibuja con su
  ancla sola, en la misma página; antes abría otra pestaña del mismo catálogo.
- **Las categorías se ordenan desde «Mi catálogo».** La ruta y la función ya lo
  sabían hacer; faltaban los dos botones. Un negocio creado desde plantilla
  mostraba «Postres» antes que el plato de la casa y no había forma de
  cambiarlo.
- **Los enlaces del alta a «cargar desde Excel» y «desde una foto» llevaban a un
  parámetro que nadie leía.** Ahora llevan a las rutas del panel, y la guardia
  de rutas rechaza cualquier `/dashboard/...` escrito a mano con `?` o `#`.
- **«Agendar» habla la paleta del negocio**: el selector de turno usaba los
  tokens del panel —cajas blancas con letra oscura dentro de un catálogo
  oscuro— y sus emojis pasaron a íconos. Y todo control de formulario dentro
  del tema toma el fondo de la paleta: `color-scheme: light` global dejaba
  `input`, `select` y `button` con fondo blanco del navegador y letra clara
  heredada en las paletas oscuras.
- **La pausa de reservas puede durar hasta treinta días**: la regla de la base
  cortaba en ocho horas cualquier cita, y una pausa es una cita sin producto.
  La ruta ahora dice qué regla la rechazó.
- **«Productos» y «Mi catálogo» se cayeron enteros** por un `const` que leía
  otro declarado más abajo. Ni TypeScript ni el lint lo ven; se sumó la primera
  prueba que **dibuja una pantalla del panel** con datos.

### 2026-09-18

- **Cada negocio tiene su plan**, y el plan es lo que el servidor aplica:
  `negocios.plan_id`, solo cambiable con `admin_cambiar_plan`; cupo mensual y
  diario por plan (`lib/planes.ts`); todas las pantallas dicen el cupo del plan
  y no el techo del sistema, con su guardia.
- **La guardia de permisos por columna ahora mira también las lecturas del
  panel**: `plan_id` se concedió para escribir por nadie y se olvidó la lectura,
  y «Productos» cayó con ella.
- Editar un producto permite agregar fotos; los ejemplos de campos hablan del
  rubro; la tarjeta entera lleva al producto; «no atiende» pasó a ser una pausa
  con vencimiento.

### 2026-09-17

- **Fase 9 empezada.** Subcategorías agrupadas en el catálogo, carga al
  desplazar, y la portada del negocio revisada.
- **La ficha del producto pasó a ser una página.** Tocar una tarjeta lleva a
  `/negocio/p/codigo` en vez de abrir una hoja encima del catálogo: la dirección
  se comparte, el botón «atrás» del teléfono vuelve, y el buscador la encuentra.
  La hoja se retiró. La página toma la forma de los catálogos de referencia:
  flecha sola, «Detalle del producto», título, descripción, precio, ficha técnica.
- **El pedido quedó con un solo dueño** (`lib/pedidos/use-pedido.ts`), usado por
  el catálogo y por la página del producto, con su guardia.
- **La marca se presenta al abrir MiPuesto y cualquier catálogo**: 1,8 s, una vez
  por sesión, sin bloquear y salteable al primer toque.
- **Dieciséis paletas.** Se rehicieron «Océano», «Carta» (antes Altiplano),
  «Carta de noche» (antes Pizarra), «Día y noche» (antes Noche) y «Sabor» (antes
  Abeja); se sumaron «Rosal», «Amapola», «Dorado», «Rubí» y «Cielo». Las
  dieciséis pasan contraste AA, y el control se extendió a la cabecera del
  catálogo —`sobre-navegador` sobre `navegador`—, que hasta ahora no miraba nadie.
- **Cuatro defectos reportados por el dueño y corregidos**, los cuatro del lado
  del cliente y ninguno visto por la suite:
  - el carrito no agregaba los productos que llegaban al desplazar, porque lo que
    se dibujaba y lo que se podía pedir eran dos listas distintas;
  - el segundo banner cambiaba de lugar al bajar, porque su posición se contaba
    desde el final de una lista que crecía;
  - los tres datos del pedido se apretaban en un renglón en el teléfono, porque
    la rejilla estaba escrita para dos campos exactos;
  - la animación de marca volvía al regresar de un producto, porque en la primera
    visita se anotaba la sesión pero no el documento.
- **Cada página del catálogo pasó a ser un tramo continuo de categorías**, para
  que lo que llega al desplazar se sume al final de lo que se está mirando y no
  más arriba.
- **Google Cloudflare**: se descubrió que el Worker corre con el límite de CPU
  del plan gratuito —10 ms— y que el promedio del sistema es 14,11 ms. Las
  páginas que se dibujan en el servidor fallan de forma intermitente. Queda
  pendiente el plan de 5 USD; está medido y documentado en la conversación.
- Migraciones aplicadas en producción: `20261005090000_fase9_cuatro_paletas_mas`
  y `20261005120000_fase9_rubi_y_cielo`.

### 2026-09-16

- **Fase 8.5 cerrada**: el panel toma el color del negocio en sus acentos. El
  control de contraste pasó a comprobar el panel con cada paleta, no solo con la
  de MiPuesto; dos paletas oscuras necesitaron un tono propio para el panel.
- El QR del catálogo lleva el isotipo de MiPuesto de marca de agua, con su
  prueba de contraste.
- La plataforma se dividió en pestañas; «Inicio» volvió a llamarse «Resumen» y
  muestra los topes y el uso de cada negocio.
- Las redes del negocio pasaron a botones con su dibujo.

### 2026-09-15

- **Fase 8 cerrada**: alta guiada y siembra. Exportación a Excel —con
  `xl/styles.xml`, sin el cual Excel «reparaba» el archivo y lo dejaba vacío—,
  cambio de rubro con su función en la base, y lectura con IA con los campos de
  categoría.
- El repaso de contraste del panel se adelantó desde la Fase 9, a pedido del
  dueño.

### 2026-09-14

- **Fases 6 y 7 cerradas.** El catálogo nuevo, con un solo diseño adaptado de
  `Catalogos_Ejemplo/`: se retiraron las cuatro plantillas y las tarjetas por
  rubro. Identidad y apariencia: hero, cabecera pintada, subnombre, patrón de
  fondo por rubro y botón de mapa.

### 2026-09-13

- **Fase 5 cerrada**: agenda y citas, con la garantía contra doble agendamiento
  en la base.

### 2026-09-11

- **Fase 4 cerrada**: las presentaciones de un producto.

### 2026-09-10

- **Fases 1, 2 y 3 del plan nuevo cerradas**: la categoría toma identidad, sus
  campos, y esos campos cargados y visibles en el producto.

### 2026-09-09

- Los dos banners del catálogo, cargables desde el panel.
- La tarjeta se separó de la plantilla, y la apariencia ganó ese eje. (Los dos
  ejes se retiraron después, en la Fase 6.)

### 2026-09-08

- Un vigilante externo que consulta `/api/salud` cada cinco minutos.
- Un solo encabezado y un solo bloque numerado para las once pantallas del panel.

### 2026-09-07

- Importar el Excel o el CSV que el negocio ya tiene, sin gastar cuota de IA.
- Medición completa del uso de IA y reparto de la cuota diaria entre diez
  negocios, con tope por negocio.
- Patrón de fondo por rubro, dibujando el oficio.

### 2026-09-05 y 2026-09-06

- Preparación del catálogo público y del panel sobre la base de las fases 0 a 3.

### 2026-09-04

- Fase 10 abierta sobre `fase-10-acabado-producto`, con los dos commits pendientes del árbol de trabajo incorporados primero: endurecimiento HTTPS y HSTS, y el alta de `CampoClave`.
- Auditoría del bloque 10.1: control de secretos de cliente, ESLint, TypeScript, Vitest, tokens y contraste aprobados. La suite pasó de 118 a 124 casos con las pruebas de la cola de avisos.
- `npm run build` y `npm run build:vinext` aprobados; el control posterior confirmó que el paquete de cliente no contiene la clave privilegiada.
- Despliegue verificado en `https://mipuesto-dev.mipuesto-app.workers.dev`: `/`, `/login` y `/api/salud/supabase` respondieron HTTP 200, y este último con `{"estado":"ok","servicio":"supabase"}`.
- Cabeceras comprobadas en producción: `strict-transport-security` con `max-age=31536000; includeSubDomains`, CSP activa sin `unsafe-eval` y `x-frame-options: DENY`.
- Verificación de contenido en producción limitada a rutas públicas; el 404 sirvió el texto recortado. El panel no pudo validarse por falta de sesión en el entorno de trabajo.

### 2026-09-03

- Se incorporó en **Negocio** la configuración de `Sin horario publicado`, `Siempre abierto` y `Horario programado`, con días cerrados, hasta tres intervalos por día y duración de reserva entre 5 minutos y 24 horas. Cliente y servidor comparten la validación.
- Se corrigió el recorrido de catálogos grandes: selector nativo para decenas de categorías, doce productos públicos por página, diez en el panel y acceso fijo **Ver pedido** cuando el carrito tiene artículos.
- El formulario de alta permite preparar hasta cuatro fotografías antes de crear el producto. La creación obtiene primero el identificador seguro y luego sube las imágenes; la gestión posterior sigue disponible para reintentos o cambios.
- Las tres plantillas muestran las unidades realmente disponibles solo en productos con control de existencias.
- No se creó una migración: `horario`, `reserva_minutos`, `logo_url`, `portada_url` y `qr_pago_url` ya existen en `negocios`. La identidad visual completa permanece en la Fase 7.
- Aprobaron secretos de cliente, ESLint, TypeScript, contraste, tokens y 93 pruebas; también los builds Next.js y vinext, `npm audit` sin vulnerabilidades, dry-run de Wrangler y arranque local con 69,5 ms de CPU activa.
- Las auditorías enlazadas aprobaron: 9 tablas con RLS, 8 tablas de negocio aisladas entre dos usuarios, 4 políticas de Storage, pruebas transaccionales de reservas/expiración y lint SQL sin errores. El primer intento de lint tomó una credencial de entorno obsoleta; al ignorarla usó correctamente la sesión enlazada y aprobó sin modificar secretos.
- El smoke test del Worker local devolvió HTTP 200 para `/tienda-kantuta`, mostró **Explorar por categoría** y rechazó con HTTP 401 el nuevo endpoint de operación sin sesión.
- Workers Builds completó correctamente el build `07428b6b-604b-49e1-8892-9cc9125242bd` del commit `83e1c7c` y publicó la versión `f53aa2e2-90f7-4a16-bc25-d199a6238aa3`. La verificación pública repitió HTTP 200, selector y stock; `/api/negocios/operacion` devolvió HTTP 401 sin sesión.
- Se refinó la jerarquía pública tras la revisión del usuario: la portada del negocio vuelve a ser el primer contenido, el selector de categoría se integra antes de los productos y **Ver pedido** usa la paleta en una acción flotante rectangular con cantidad legible.
- El aviso de cierre quedó reducido a una franja de una línea con el horario de hoy o la próxima atención. Las pruebas aumentaron a 95 y el smoke test verificó en HTML el orden tienda → aviso → categorías; Next.js, vinext y el dry-run de Wrangler aprobaron nuevamente.
- No había un navegador conectado para automatizar la inspección visual; queda pendiente el recorrido manual a 360 px y escritorio después del despliegue.

### 2026-09-02

- El administrador completó la revisión visual de las 12 combinaciones y confirmó que la apariencia funciona y persiste. **Fase 3 cerrada**.
- Se amplió la Fase 3 a tres sistemas visuales completos y cuatro paletas combinables, para un total de 12 apariencias sin duplicar datos ni lógica.
- La migración `20260902142736_agregar_paleta_catalogo.sql` agregó `paleta_id`, su restricción de valores y lectura pública; fue aplicada al proyecto remoto de desarrollo.
- El selector guarda plantilla y paleta conjuntamente, permite modificarlas después y muestra una sola demostración extensa cargada de forma diferida.
- `npm run test` aprobó 37 pruebas; tokens y las cuatro paletas aprobaron contraste AA. ESLint, TypeScript, build de Next.js y build de vinext también aprobaron.
- `npm run db:lint:linked` no reportó errores y `npm run test:rls:linked` volvió a aprobar con 7 tablas y 2 usuarios, incluyendo aislamiento de plantilla y paleta.
- No había un navegador conectado en la sesión para automatizar la inspección. Queda pendiente revisar las 12 combinaciones a 360 px y escritorio, guardar una, recargar y confirmar persistencia.
- Se construyeron tres plantillas estructuralmente distintas con un contrato de datos común y sin consultas internas.
- El panel incorporó navegación compartida y `/dashboard/plantilla` con comparación, selección local y guardado explícito.
- La API valida el valor recibido, deriva el administrador de `getClaims()` y actualiza únicamente mediante RLS.
- `npm run lint`, `npm run typecheck` y `npm run test` aprobaron; 25 pruebas cubren contraste, tokens, perfil, precios y variantes permitidas.
- `npm run build` y `npm run build:vinext` aprobaron e incluyeron el panel y la API de plantillas.
- El Worker local confirmó protección anónima: 307 hacia `/login?motivo=sesion` y 401 en el API.
- `npm run db:lint:linked` aprobó sin errores; `npm run test:rls:linked` aprobó con 7 tablas, 2 usuarios temporales y aislamiento de plantillas.
- Se corrigió el alcance visual para que las tres variantes incluyan las mismas fotografías de producto. Las imágenes demostrativas se generaron sin marcas ni texto y se optimizaron a WebP antes de incorporarlas.
- La plantilla clásica usa miniaturas laterales, la moderna imágenes dominantes y la mínima imágenes compactas; solo cambia la presentación, no el contenido.
- Queda pendiente la confirmación manual a 360 px y escritorio, además de guardar y recargar una selección.

### 2026-09-01

- Node.js `22.23.1`, npm `10.9.8` y Supabase CLI `2.116.0` detectados.
- Dependencias directas fijadas; `npm audit` informó 0 vulnerabilidades.
- ESLint y TypeScript se ajustaron a versiones compatibles con el toolchain de Next.js.
- `npm run lint`: aprobado.
- `npm run typecheck`: aprobado.
- `npm run test`: aprobado, todavía sin pruebas unitarias de lógica de negocio.
- `npm run build`: aprobado; `/` estática y `/api/salud/supabase` dinámica.
- `npx supabase start`: bloqueado porque Docker/Podman no está instalado.
- Verificación HTTP local: `/` respondió 200; salud de Supabase respondió 503 `sin_configurar`, como corresponde sin `.env.local`.
- Next.js 16 añadió a `AGENTS.md` su bloque administrado sin alterar las reglas originales; se conserva para usar documentación versionada.
- Commits: `21391e9` (base Next.js), `faeb0f7` (esquema y RLS), `cc2c558` (registro y pasos manuales).
- Se detectó `yapabot-dev` en la cuenta Supabase y se dejó explícitamente fuera del alcance.
- La migración se adaptó al cambio de Data API de 2026 con permisos explícitos para `anon`, `authenticated` y `service_role`.
- `mipuesto-dev` quedó enlazado y recibió las migraciones `20260901085203` y `20260901143000`, además del seed idempotente.
- `npm run db:lint:linked`: aprobado, sin errores de esquema.
- `npm run test:rls:linked`: aprobado; 7 tablas con RLS, 7 con políticas, 6 índices de FK agregados, 3 negocios y 3 modalidades.
- Los asesores dejaron de reportar claves foráneas sin índice y funciones `SECURITY DEFINER` expuestas.
- Tipos TypeScript generados desde el esquema remoto e integrados en los clientes de navegador y servidor.
- Validación posterior al enlace: secretos de cliente, ESLint, TypeScript, Vitest y build aprobados.
- Conexión real desde Next.js validada: `GET /api/salud/supabase` respondió HTTP 200 con `{"estado":"ok","servicio":"supabase"}`; la clave de servicio permanece vacía.
- Repositorio GitHub vinculado y ramas `main` y `fase-1-sistema-diseno` publicadas sin `.env.local` ni secretos.
- `vinext check`: el informe inicial fue 89 % por faltar ESM; después de `vinext init`, la comprobación final alcanzó 100 % (8 soportados, 0 parciales, 0 problemas).
- `npm run build:vinext`: aprobado; el control posterior confirmó que el bundle cliente no contiene la clave privilegiada.
- Worker local: `/` respondió HTTP 200 y `/api/salud/supabase` respondió HTTP 200 con estado `ok`.
- `wrangler deploy --dry-run`: aprobado; 928 KiB totales y 266,65 KiB comprimidos.
- `wrangler check startup`: aprobado; 74,2 ms de CPU activa en la medición local.
- Auditoría final repetida: lint, TypeScript, Vitest, build Next.js, build vinext, DB lint y RLS remoto aprobados.
- Primer despliegue real completado en `https://mipuesto-dev.tienda-blanco.workers.dev`; portada y salud de Supabase respondieron HTTP 200.
- Se cargaron en runtime únicamente `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; ninguna clave de servicio fue enviada a Cloudflare.
- El perfil Wrangler `mipuesto` se verificó contra la cuenta exclusiva `a558c055e89f45ad66d4de1ec1e31a2a` y el proyecto quedó fijado a esa cuenta mediante `account_id`.
- El dry-run y el chequeo de arranque volvieron a aprobarse con el artefacto fijado a la cuenta nueva; la medición local registró 81,5 ms de CPU activa.
- Despliegue independiente completado en `https://mipuesto-dev.mipuesto-app.workers.dev` (versión `6eec2426-2fe9-41a4-86a6-fa9b32c14cb8`); `/` y `/api/salud/supabase` respondieron HTTP 200.
- En la cuenta nueva se cargaron solamente `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. El Worker de Tienda Blanco no se modificó y queda como respaldo hasta autorizar su eliminación.
- El primer intento de Workers Builds detectó dos errores de configuración: el comando de deploy tenía un separador incorrecto y las variables públicas de Supabase no estaban disponibles durante el build. Ambos se corrigieron sin exponer claves en Git.
- Workers Builds publicó correctamente el commit `06c7627` mediante el build `2f82476f-5794-4a79-bd59-b22807cb40b4`; la versión `9a3b3322-d6cc-4c79-8b87-d9a963f22e65` recibió el 100 % del tráfico.
- La versión automática conserva únicamente los bindings `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, además de Assets; no contiene una clave de servicio.
- Verificación pública final: `/` respondió HTTP 200 y `/api/salud/supabase` respondió HTTP 200 con `{"estado":"ok","servicio":"supabase"}`.
- Auditoría de cierre: secretos de cliente, ESLint, TypeScript, Vitest, build de Next.js, build y dry-run de vinext, arranque del Worker, DB lint, RLS remoto y `npm audit` aprobados. La suite Vitest todavía no contiene casos de lógica de negocio, que se incorporarán en las fases correspondientes.
- Resultado RLS de cierre: 7/7 tablas con RLS, 7/7 con políticas, 6 índices de claves foráneas, 3 negocios seed y las 3 modalidades esperadas.
- **Fase 0 cerrada** el 2026-09-01. Docker continúa diferido y el Worker de Tienda Blanco queda fuera del alcance hasta recibir autorización explícita para eliminarlo.
- Fase 1 se rebasó sobre el cierre de Fase 0 mediante el merge `f70a421`; no quedaron conflictos pendientes ni cambios sin versionar.
- El sistema visual corrigió el foco para fondos claros y oscuros e incorporó auditorías automáticas de tokens y contraste.
- La compatibilidad de Tailwind 4 con módulos CSS se corrigió usando `@reference`; `/estilos` volvió a compilar y responder correctamente.
- Revisión visual automatizada aprobada en Chromium Headless a 360 px y 1440 px: sin desbordamiento horizontal, nueve secciones presentes, campos y botones con nombre accesible, foco visible, modal con foco inicial y cierre mediante `Escape`.
- Con movimiento reducido activo, Chromium reportó animaciones y transiciones de `0,00001 s`, sin movimiento perceptible.
- Auditoría técnica final de Fase 1: secretos de cliente, ESLint, TypeScript, Vitest, tokens, contraste, `npm audit`, build Next.js, build y dry-run vinext, arranque del Worker, lint SQL y RLS remoto aprobados.
- Resultado RLS repetido al cierre: 7/7 tablas con RLS, 7/7 con políticas, 6 índices de claves foráneas, 3 negocios seed y las 3 modalidades esperadas.
- **Fase 1 cerrada** el 2026-09-01; queda habilitado iniciar la Fase 2.
