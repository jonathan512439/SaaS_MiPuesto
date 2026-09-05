# Registro de avance y auditorías — MiPuesto

Este archivo conserva el estado verificable del proyecto. Se actualiza al iniciar y cerrar cada fase.

## Estado actual

- Fases completadas: **Fase 0 — Setup e infraestructura**, **Fase 1 — Sistema de diseño**, **Fase 2 — Autenticación y perfil de negocio**, **Fase 3 — Sistema de plantillas**, **Fase 4 — Catálogo**, **Fase 5 — Las tres modalidades de tienda**, **Fase 6 — Carrito, reserva temporal y pedido por WhatsApp**, **Fase 7 — Panel de administración completo** y **Fase 8 — Funciones de plataforma**.
- Fase en curso: **Fase 9 — Testing y cierre operativo, sin dominio por ahora**.
- Inicio de Fase 2: 2026-09-01.
- Cierre de Fase 2: 2026-09-02.
- Cierre de Fase 3: 2026-09-02.
- Cierre de Fase 4: 2026-09-02.
- Inicio de Fase 4: 2026-09-02.
- Inicio de Fase 5: 2026-09-02.
- Cierre de Fase 5: 2026-09-02.
- Inicio de Fase 6: 2026-09-02.
- Cierre de Fase 6: 2026-09-03.
- Inicio de Fase 7: 2026-09-03.
- Cierre de Fase 7: 2026-09-03.
- Inicio de Fase 8: 2026-09-03.
- Cierre de Fase 8: 2026-09-03.
- Inicio de Fase 9: 2026-09-03.
- Inicio de Fase 10: 2026-09-04.
- Cierre del bloque 10.1 (sistema de diseño vivo): 2026-09-04.
- Estado: **Fase 9 abierta con dominio aplazado; Fase 10 en curso sobre `fase-10-acabado-producto`**.
- Próxima puerta de salida: un negocio piloto debe operar una semana completa sin intervenir manualmente la base de datos; el dominio se validará después como tarea separada.

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
