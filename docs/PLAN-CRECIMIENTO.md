# Plan de crecimiento — de MVP a sistema sostenible

Este documento se lee **antes de empezar cada etapa** y se actualiza al cerrarla.
No es una lista de deseos: cada función que entró pasó el filtro de la sección 2,
y las que no entraron están abajo con el motivo.

Escrito el 2026-09-04, sobre el estado posterior a la Fase 11.

---

## 1. Qué problema resuelve este plan

El producto funciona para 3 o 5 clientes. El objetivo es distinto: **100 clientes,
300 productos cada uno y 500 visitas diarias**, sin latencia, con margen y sin
depender de que el autor esté despierto.

Tres huecos separan una cosa de la otra:

1. **El producto promete cosas que no hace.** Los términos dicen que un catálogo
   impago deja de publicarse; nada lo apaga. La privacidad dice que no se borra
   nada; no hay política de retención.
2. **No aguanta el tamaño objetivo.** El límite de productos es 200, la
   paginación ocurre en el navegador y las imágenes se sirven cuatro veces más
   grandes de lo que se muestran.
3. **No se puede operar.** Sin panel de administración, sin respaldos, sin
   monitoreo y con altas manuales desde la máquina del autor.

---

## 2. El filtro — qué entra y qué no

Cinco preguntas, en orden. Si una falla, la función espera.

| # | Pregunta | Por qué manda |
|---|---|---|
| 1 | ¿Suma costo recurrente? | Con capital cero, cada costo fijo adelanta el día en que se paga sin cobrar |
| 2 | ¿Toca esquema o permisos? | Migración versionada más prueba de RLS: triplica el costo |
| 3 | ¿El costo crece con los clientes o es fijo? | Lo que escala por cliente se vuelve insostenible en el 50 |
| 4 | ¿Ayuda a llegar a 4 clientes, o solo mejora a los actuales? | 4 clientes es el punto de equilibrio |
| 5 | ¿Puede romperse sin que nadie se entere? | Todo lo que toca precios o pedidos paga peaje de pruebas |

**Regla que vale más que las cinco:** si se puede hacer a mano hasta el cliente
20, se hace a mano. Los referidos, el sello de verificado, la cobranza y el alta
de clientes son procesos manuales a propósito, no funciones pendientes.

---

## 3. Los números que gobiernan las decisiones

Medidos en producción el 2026-09-04, no estimados.

### Pesos reales

| | Peso |
|---|---|
| Producto servido hoy (800 px) | 75.343 bytes |
| El mismo al tamaño que se muestra (300 px) | 17.338 bytes |
| Portada, sin transformar | 236.242 bytes |
| HTML del catálogo | 50.357 bytes |
| **Primera visita hoy** | **~1,34 MB** |
| **Primera visita optimizada** | **~470 KB** |

### Costos, a Bs 12,30 por dólar

| | Hasta el cliente 6 | Desde el 7 |
|---|---|---|
| Supabase | $0 | $25 |
| Cloudflare Workers | $0 | $0 |
| Resend | $0 | $0 |
| R2 (respaldos) | $0 | $0 |
| Dominio | ~$1 | ~$1 |
| **Total mensual** | **~Bs 12** | **~Bs 320** |

**El plan gratis muere cerca del cliente 7**, por almacenamiento, no por tráfico.

### Margen

| Clientes | Ingreso | Infra | Infra sobre ingreso |
|---|---|---|---|
| 4 | Bs 320 | Bs 320 | **100 % — punto de equilibrio** |
| 10 | Bs 800 | Bs 320 | 40 % |
| 100 | Bs 8.000 | Bs 225 | 2,8 % |

La zona incómoda es del cliente 7 al 20. No se arregla con arquitectura; se
atraviesa.

**El costo real a 100 clientes no es la infraestructura: son 100 conversaciones
de cobranza al mes.** Por eso el cobro anual vale más que cualquier optimización.

---

## 4. Decisiones tomadas

### Infraestructura

- **Se queda en Supabase + Cloudflare.** Un VPS ahorraría ~Bs 140 al mes a
  cambio de ser el DBA de guardia, y baja la disponibilidad de un servicio
  gestionado con réplica a una sola máquina. Se revisa si Supabase pasa de
  $150/mes, lo que ocurre alrededor de los 500 a 1.000 clientes.
- **R2 entra solo para respaldos.** Para imágenes no ahorraría nada —el tráfico
  proyectado es de 7 a 20 GB contra 250 GB incluidos— y obligaría a rehacer la
  autorización de subida, que hoy la resuelven las políticas de Storage atadas a
  la misma sesión que el resto de los datos.

### Imágenes

- Se generan **400 px y 1200 px en el navegador** al subir, reusando el canvas
  que ya existe en `lib/imagenes.ts`.
- **Se descarta el original de 1600 px.** Nadie amplía la foto de un producto en
  un catálogo; ese master cuesta un tercio del disco. Pasa de 250 KB a 165 KB por
  foto: ocupa menos que hoy y entrega cuatro veces más liviano.
- **La transformación de Supabase se conserva solo para la imagen de compartir**,
  que la necesita porque Satori no rasteriza WebP. Las llamadas caen ~99 %.

### Datos

- **Borrado escalonado a 90 días**, no 60: hay negocios de temporada, y borrar a
  los 60 ahorra centavos y cuesta un cliente que volvía.

| Día | Qué pasa |
|---|---|
| 0 | Catálogo fuera de línea. Panel accesible, datos intactos |
| 30 | Aviso de borrado próximo, con exportación en un clic |
| 83 | Aviso final |
| 90 | Borrado de base y almacenamiento |

- Los teléfonos de compradores van por **su propio reloj**, más corto e
  independiente del ciclo del negocio.

### Cobranza y avisos

- **Corte automático con `pg_cron`**, que ya está instalado y corriendo
  `mipuesto-expirar-reservas`. Sin red, sin secretos en tránsito.
- **Recordatorios por correo al operador**, no WhatsApp automático a los
  clientes: eso exige la API de Meta, con verificación, plantillas aprobadas y
  pago por conversación.
- **Resend con dominio propio.** Gmail corta cerca de 500 diarios y bloquea la
  cuenta 24 horas al pasarse — justo las invitaciones y recuperaciones de clave.

### Superadministrador

- Tabla `plataforma_admins` con **políticas RLS aditivas**.
  **No con la clave de servicio:** meterla detrás de una pantalla con botones la
  convierte en modo dios a un clic, y un fallo de autorización expondría las
  bases de todos los clientes.
- **Segundo factor obligatorio** solo para esa cuenta. `SECURITY.md` lo marca
  prematuro; se toma la excepción a propósito porque esa cuenta ya no protege un
  negocio sino cien.
- Toda acción a la bitácora.

### NFC y calificaciones

- **Enlace estable `/t/<codigo>`, nunca el slug.** Si el dueño cambia su
  dirección, un tag pegado a la mesa muere. El código se reasigna a otro cliente.
- **QR impreso en el mismo soporte:** no todos los teléfonos tienen NFC activo.
- **El código identifica la mesa**, así el pedido llega con la mesa escrita.
- Calificación de Google después de pedir, **una vez por dispositivo**, con
  `search.google.com/local/writereview?placeid=<ID>`.
- **Nunca filtrar por satisfacción.** El patrón «¿te gustó? sí → Google / no →
  formulario» viola las políticas de Google y penaliza la ficha del cliente.

### Marca en el catálogo del cliente

Decidido el 2026-09-05: **una marca por superficie**.

- En el catálogo de un negocio firma **solo MiPuesto**, discreta y al final,
  después del pedido: quien mira una vitrina puede querer la suya, y ese es el
  único mensaje que le sirve. Nada de MiPuesto puede competir con la venta del
  negocio que paga.
- El crédito a **JC-DEV** vive en las páginas propias —portada, términos,
  privacidad, directorio—, donde tiene a quién decírselo. Dos marcas en la
  vitrina de un cliente que paga son una de más.
- El enlace de la firma lleva `?desde=catalogo`, para poder distinguir en la
  analítica del borde cuánta gente llega por ahí. Sin marcarlo no hay forma de
  saber si la firma sirve de algo.

### Segmentación por rubro

`tipo_negocio` describe **cómo vende** (lectura, acción, carrito), no **qué
vende**. Se agrega un eje de rubro para que el panel de una barbería no ofrezca
«carta del día».

**Regla que no se rompe: el rubro oculta interfaz, nunca datos ni permisos.** Un
negocio que cambia de rubro no pierde nada de lo que cargó.

---

## 5. Decisiones pendientes que bloquean trabajo

| Decisión | Qué bloquea |
|---|---|
| **Lista cerrada de rubros** | La migración de la etapa 3½. Va en un `check`, igual que las paletas |
| **Cobro anual Bs 800** | Lo que muestra la pantalla de cuenta |
| **Cargo de instalación Bs 150–300** | Si la carga por foto se paga sola |
| **Botón «Llamar»** | `tel:` real, WhatsApp con otro nombre, o nada |
| **Dominio** | Correo propio, QR, NFC y reporte semanal: cuatro cosas de una compra |
| **Semana de piloto** | La puerta de salida definida en la Fase 9, nunca cumplida |

---

## 6. Etapas

Cada función viaja montada sobre infraestructura que ya se iba a tocar. Nada se
construye dos veces.

### Etapa 0–1 — El contrato y el mecanismo — **CERRADA el 2026-09-05**

Van en el mismo commit: el producto no puede seguir prometiendo lo que no hace.

- Reescribir `app/(legal)/terminos` y `app/(legal)/privacidad` con el corte real
  y la retención de 90 días.
- Migración: columna que separa **suspendido por falta de pago** de **pausado por
  el dueño**. Hoy `activo` significa las dos cosas y reactivar pisaría la pausa
  propia del dueño.
- Trabajo `pg_cron` diario que suspende los vencidos.
- Trabajo `pg_cron` diario que ejecuta el calendario de borrado.
- Estado explícito en el panel: «tu catálogo está fuera de línea por falta de
  pago», con el enlace para escribir.
- **Horarios especiales y feriados.** `horario` es jsonb: no necesita migración.
- ~~Renombrar o eliminar `supabase:push:dev`~~. Hecho: se dividió en
  `supabase:push` (enlazada, sin seed) y `supabase:seed:local` (solo local).

**Criterio de cierre:** un negocio con vencimiento en el pasado queda fuera de
línea sin intervención, su panel sigue accesible, y las páginas legales
describen exactamente eso. **Cumplido y verificado de ida y vuelta en
producción**; el detalle está en `docs/AVANCE.md`, sección «Estado de Fase 12».

Dos apuntes para quien retome:

- La columna que separa los dos motivos terminó siendo `suspendido_en`, y el
  interruptor sigue siendo `activo`. El porqué está escrito en la migración.
- El calendario de borrado quedó **sin automatizar a propósito**. Se automatiza
  en la etapa 4, junto con el aviso por correo que los términos prometen.

### Etapa 2 — Que aguante 300 productos — **CERRADA el 2026-09-05**

- **Paginación y filtrado en la consulta**, no en el navegador. Hoy el servidor
  manda el catálogo entero y el cliente muestra doce.
- Categorías por consulta liviana aparte.
- Subir `LIMITE_PRODUCTOS` a 300 **después** de lo anterior, nunca antes.
- **Duplicar producto**, obligando a cambiar el nombre antes de guardar.
- **Subida de precios en lote**, acotada a una categoría por vez, con
  confirmación que muestra antes y después. El disparador
  `productos_registrar_cambio_precio` ya guarda `precio_anterior` en la propia
  fila, así que el arrepentimiento es recuperable y la operación no infla
  ninguna tabla.

**Criterio de cierre:** un negocio sembrado con 300 productos responde en el
mismo tiempo que uno con 12. **Cumplido por construcción**: la consulta pide
siempre doce filas con `range`, así que el peso de la página sigue al resultado
y no al tamaño del catálogo. Medido en producción, el detalle está en
`docs/AVANCE.md`, bloque 12.5.

Tres apuntes para quien retome:

- Buscar en la base obligó a una columna generada, `texto_busqueda`, porque
  `ilike` no resuelve acentos. No usar `unaccent`: no es inmutable y no sirve en
  una columna generada.
- El pedido ahora vive en `sessionStorage` con una copia de cada producto
  elegido. Sin eso, paginar en el servidor vaciaría el carrito.
- Falta la prueba con un negocio real de 300 productos. La consulta no puede
  crecer, pero la lista del panel sí: ahí la paginación sigue siendo del
  navegador.

### Etapa 3 — Peso y uso diario (5 días)

- **Imágenes 400 y 1200 px, sin master de 1600.**
- **Purga de analítica a 90 días** con `pg_cron`.
- **Agotado en un toque**, con deshacer, sin confundir `estado` con `visible`.
- **Reportes en el panel.** La pantalla es el 80 % del trabajo y no depende del
  dominio, así que va antes del envío. **Reemplaza al resumen actual**, no se
  suma: dos lugares con métricas distintas es peor que uno.
- **Guardar el negocio en el inicio del teléfono**: manifest por negocio. El
  aviso automático solo aparece en Android; en iPhone se explica el gesto.

**Criterio de cierre:** primera visita por debajo de 500 KB, medida en
producción.

### Etapa 3½ — Una sola migración de `negocios` (2½ días)

Tres columnas en una migración: tocar la base en vivo tres veces por tres
columnas es tres veces el riesgo.

- `rubro` — con la lista cerrada que falta decidir.
- `ubicacion` — habilita **Cómo llegar** y es el dato del que depende el
  directorio por zona.
- `google_place_id` — para la etapa 7.
- **Segmentación por rubro en el panel**, como filtro de presentación.

**Criterio de cierre:** la prueba de RLS pasa y un negocio que cambia de rubro
conserva todos sus datos.

### Etapa 4 — Dominio y correo (5 días)

- Compra y conexión del dominio.
- **Resend con dominio propio**, reemplazando el SMTP de Gmail.
- QR y NFC habilitados, que hasta acá no debían imprimirse.
- **Envío del reporte semanal** por correo.
- **Aviso de quiebre de stock**, solo para quien marcó `controla_stock`.

**Criterio de cierre:** una invitación y una recuperación de clave llegan a la
bandeja de entrada, no a spam.

### Etapa 5 — Que se pueda dormir tranquilo (2 días)

- Respaldo diario a R2 **con una restauración probada**. Un respaldo sin
  restaurar no es un respaldo.
- Monitoreo de errores y aviso de caída.

**Criterio de cierre:** una base restaurada desde el respaldo del día anterior
levanta y sirve un catálogo.

### Etapa 6 — Panel de superadministrador (5 días)

- Tabla `plataforma_admins` y políticas RLS aditivas.
- Segundo factor obligatorio.
- Listado de clientes con estado, días restantes, renovar, suspender, notas.
- Alta de clientes desde el panel: se termina `auth:invitar` desde la máquina
  del autor.
- Bitácora de toda acción.

**Criterio de cierre:** la prueba de RLS demuestra que un dueño no lee otros
negocios ni toca su propio vencimiento, y que un superadmin queda registrado.

### Etapa 7 — NFC, mesa y Google (5 días)

- Ruta `/t/<codigo>` con código estable y reasignable.
- **Número de mesa en el pedido.**
- Calificación de Google después de pedir.
- **Directorio por zona.** Se construye ahora y se promociona cuando haya ~30
  negocios en una ciudad: un directorio con 10 se ve vacío y resta.

### Etapa 8 — Paquete de restaurantes (4 días)

Todo gobernado por el rubro de la etapa 3½.

- **Carta del día.**
- **Precios por horario.** Es la función más riesgosa del plan: toca
  `calcular_precio_producto`, que está en la ruta del dinero. Exige zona horaria
  `America/La_Paz`, cruce de medianoche y pruebas propias. Va última por eso.
- **Menú imprimible**: los mismos datos con una hoja de estilos de impresión.

### Etapa 9 — Carga desde foto de la lista de precios (4 días + validación)

Va al final por tres motivos: es la **única función con costo por uso**, la
**única con dependencia externa**, y su valor está en dar de alta rápido, cosa
que hasta el cliente 20 se hace a mano.

**Adelantarla solo si cargar el catálogo se vuelve el motivo por el que se pierde
una venta.**

- Modelo de visión por API, no OCR clásico: el OCR se rompe con manuscrito.
- **La clave de API se trata como `SUPABASE_SERVICE_ROLE_KEY`:** solo en el
  Worker, nunca en el cliente, detrás de sesión válida y con tope por negocio y
  por mes.
- **Devuelve un borrador que el dueño confirma. Nunca inserta directo.**

#### Qué soporta

| Funciona con | No funciona con |
|---|---|
| Listas impresas y cartas tipeadas | Fotos de estanterías o vitrinas |
| Manuscrito legible en una columna | Precios sueltos sin nombre |
| Nombre y precio en la misma línea | Categorías, descripciones, fotos |

#### Protocolo de validación — antes de habilitarla a nadie

**Corpus real:** mínimo 20 fotos de listas bolivianas de verdad — impresas,
manuscritas, cartas, arrugadas, con sombra, a contraluz. No fotos de prueba
limpias.

| Métrica | Umbral |
|---|---|
| **Productos inventados** | **Cero.** Uno solo es una falla, no una imprecisión |
| Precios incorrectos | Se miden uno por uno contra la foto |
| Campos corregidos por el dueño | El número honesto de calidad |

**La prueba que decide:** cronometrar a un comerciante real cargando 50 productos
tipeando, y después 50 por foto y revisión. **Si revisar no es claramente más
rápido que tipear, la función es decorado.** Se hace con un prototipo, antes de
construir la interfaz definitiva.

**Costo medido, no estimado:** se anota el gasto real de esas 20 fotos.
Referencia previa: ~$0,01–0,05 por foto, ~Bs 1,50–6 por catálogo de 300
productos. Menos del 4 % de un cargo de instalación de Bs 150–300.

---

## 7. Qué quedó fuera y por qué

| Idea | Motivo |
|---|---|
| **Video** | Servicio nuevo con costo recurrente. El navegador no recodifica video como redimensiona una foto, y un MP4 directo entrega lo peor al usuario en datos móviles. Se revisa a los 20 clientes, y entra por la portada, no por producto |
| **API de WhatsApp Business** | El flujo actual funciona porque el cliente abre su propio WhatsApp: cuesta cero. La API sirve para enviar por programa, y exige verificación, número dedicado, plantillas aprobadas y pago por conversación. Tiene sentido arriba de ~100 clientes |
| **Pasarela de pago** | Decisión de producto vigente (ADR-006) |
| **Precio grande y legible como función** | Ya existe: es la plantilla Feria. Agregarlo sería duplicar |
| **Referidos** | No falla el filtro: se aplica a mano con `suscripcion:renovar` |
| **Roles múltiples por negocio, 2FA general, pruebas end-to-end** | `SECURITY.md` los marca prematuros y sigue teniendo razón |

---

## 8. Resumen de ejecución

| Etapa | Días | Costo nuevo |
|---|---|---|
| 0–1 Contrato y mecanismo | 3 | 0 |
| 2 Aguantar 300 productos | 4½ | 0 |
| 3 Peso y uso diario | 5 | 0 |
| 3½ Migración de `negocios` | 2½ | 0 |
| 4 Dominio y correo | 5 | dominio |
| 5 Respaldos y monitoreo | 2 | 0 |
| 6 Superadministrador | 5 | 0 |
| 7 NFC, mesa y Google | 5 | tags |
| 8 Paquete de restaurantes | 4 | 0 |
| 9 Carga desde foto | 4 | por uso |
| **Total** | **~40 días** | **dominio + tags** |

**Bloqueante para arrancar:** las cuatro decisiones de la sección 5.
**Bloqueante para vender:** el dominio y la semana de piloto.
