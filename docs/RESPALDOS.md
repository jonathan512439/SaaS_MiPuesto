# Respaldos y restauración

Escrito el 2026-09-05, al cerrar la etapa 5 del plan de crecimiento.

## Qué se respalda y qué no

| | Estado |
|---|---|
| **Base de datos** — negocios, productos, pedidos, promociones, suscripciones | **Automático, diario** |
| **Fotografías** — logo, portada, QR y fotos de producto | **No respaldado todavía** |

La base es lo irreemplazable: si se pierde, se pierden los pedidos, los precios
y hasta cuándo pagó cada negocio. Las fotografías son recuperables pidiéndoselas
al dueño, con molestia pero sin pérdida definitiva. Por eso se automatizó
primero la base.

**El respaldo de fotografías queda pendiente y conviene no olvidarlo**: un dueño
que subió 300 fotos desde su celular hace seis meses probablemente ya no las
tenga. La opción más simple cuando se encare es sincronizar el depósito de
Supabase a R2 con un cliente compatible con S3, en el mismo flujo diario.

## Cómo funciona

`.github/workflows/respaldo.yml` corre todos los días a las **07:00 UTC** —03:00
en Bolivia—. Esa hora es a propósito: es **antes** de la purga de analítica
(08:30) y del corte por vencimiento (09:00), así que el respaldo del día refleja
el estado previo a cualquier borrado automático.

Usa `pg_dump` directo y no `supabase db dump`, que exige Docker. El cliente se
instala en la misma versión del servidor —Postgres 17— porque un `pg_dump` más
viejo se niega a volcar una base más nueva.

Antes de subir comprueba que los archivos pesen algo: un volcado de cero bytes
sube igual y da una falsa sensación de respaldo.

Genera cinco archivos y los sube a R2 bajo la fecha del día:

| Archivo | Qué trae |
|---|---|
| `respaldo-completo.dump` | **El que se restaura.** Formato personalizado, `public` y `private`, estructura y datos |
| `respaldo-esquema.sql.gz` | Solo la estructura, en texto. Para leer o comparar |
| `respaldo-datos.sql.gz` | Solo el contenido, en texto. Para rescatar una tabla suelta |
| `respaldo-auth-users.sql.gz` | Las cuentas de los dueños. **Obligatorio**, ver abajo |
| `respaldo-auth-identities.sql.gz` | Para poder iniciar sesión. Puede faltar |

### Por qué el que vale es el `.dump` y no los dos de texto

Los dos volcados de texto están partidos en estructura y datos, y **esa partición
rompe la garantía de orden de `pg_dump`**: en un volcado entero las claves
foráneas se agregan después de cargar los datos, y al partirlo quedan antes, así
que la carga puede fallar por un orden que nadie eligió.

El formato personalizado no tiene ese problema: `pg_restore` lee el índice del
archivo y decide el orden él. Por eso el ensayo usa ese y los otros dos quedan
para leer, comparar o rescatar una tabla puntual.

Se descubrió el 2026-09-09, preparando el ensayo. El respaldo de texto llevaba
días subiendo sin que nadie hubiera intentado usarlo.

### Por qué `private` va junto con `public`

**Corregido el 2026-09-09, al preparar el ensayo.** El volcado original tomaba
solo `public`, y eso lo hacía **imposible de restaurar**: en `private` viven
siete funciones que los disparadores y las políticas de `public` invocan
—cálculo de precios, auditoría de cambios de precio y de estado, validación de
promociones, comprobación de administrador de plataforma— más la tabla con los
ajustes del vigilante. Un volcado sin ellas pesa igual, sube igual y solo se
descubre inservible el día que hay que usarlo.

Ahora el flujo **verifica que `private` esté adentro** antes de subir, y falla si
no. Un respaldo que aparenta estar bien es peor que uno que falla ruidosamente.

### Las cuentas de los dueños no son un extra

**Corregido el 2026-09-09.** Acá decía que si el volcado de `auth` fallaba la
base seguía respaldada y solo había que reinvitar a los dueños. **Era falso**, y
lo demostró el ensayo con este error:

```
ERROR: insert or update on table "bitacora_plataforma"
       violates foreign key constraint "bitacora_plataforma_actor_fkey"
DETAIL: Key (actor)=(...) is not present in table "users".
```

Siete claves foráneas de `public` apuntan a `auth.users`, y una es
`negocios.admin_user_id`, que es **`not null`**. `pg_restore` crea las
restricciones al final, y con la tabla de cuentas vacía fallan todas: no hay
restauración parcial, no hay restauración de ningún tipo.

Por eso `respaldo-auth-users.sql.gz` es **obligatorio** y el flujo falla si no lo
puede generar. Se carga **antes** del volcado, y ese orden no es preferencia.

`respaldo-auth-identities.sql.gz` sí es mejor esfuerzo: sin él la base restaura
entera y lo que falla es iniciar sesión, que se resuelve con un enlace de acceso.

Van en dos archivos y no en uno porque `identities` referencia a `users`, y un
volcado del esquema entero sale ordenado alfabéticamente — o sea, al revés del
orden que hace falta para cargarlo.

## Lo que hay que configurar una sola vez

Nada de esto se puede hacer desde el repositorio; son pasos en las consolas.

### 1. Crear el balde en Cloudflare R2

Un balde privado, por ejemplo `mipuesto-respaldos`. R2 no cobra por salida de
datos y el plan gratuito cubre 10 GB, muy por encima de lo que estos volcados
ocupan.

### 2. Cargar los secretos en GitHub

En **Settings → Secrets and variables → Actions**:

| Secreto | De dónde sale |
|---|---|
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → Connection string, **modo *session pooler*** |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens, con permiso de edición sobre R2 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Workers → Overview, a la derecha |
| `ENSAYO_DB_URL` | Lo mismo, pero del **segundo** proyecto. Solo lo usa el ensayo |

> **Session pooler y no *direct connection*.** La conexión directa de Supabase
> hoy es solo IPv6 y los servidores de GitHub Actions son IPv4: con la directa el
> respaldo falla con «network unreachable» y el error no dice por qué.

Y como **variable** (no secreto):

| Variable | Valor |
|---|---|
| `R2_BUCKET_RESPALDOS` | el nombre del balde, por ejemplo `mipuesto-respaldos` |

### 3. Correrlo a mano una vez

En **Actions → Respaldo diario de la base → Run workflow**. Si termina en verde,
la automatización quedó andando.

## El ensayo de restauración

**Un respaldo que nunca se restauró no es un respaldo.** Y uno cuyo ensayo es una
lista de pasos manuales se hace una vez y no se repite, que es casi lo mismo.

Por eso el ensayo **es un botón**: Actions → *Ensayo de restauración* → *Run
workflow*. Se le puede dar una fecha; vacío toma el respaldo de hoy.

### Qué hace, en orden

| Paso | Qué pasa si falla |
|---|---|
| 1. Comprueba que el destino **no es producción** | Se niega en diez segundos, sin tocar nada |
| 2. Baja `respaldo-completo.dump` de R2 | No hay respaldo de esa fecha, o falta permiso |
| 3. Instala el cliente de Postgres 17 | Falla ahí, no doce líneas después |
| 4. Aplica `00-vaciar.sql` | Deja la base vacía de lo nuestro: es lo que hace el ensayo repetible |
| 5. Aplica `01-preambulo.sql` (esquemas y extensiones) | — |
| 6. **Carga las cuentas** (`auth.users`) | Sin cuentas fallan las siete claves foráneas |
| 7. `pg_restore --exit-on-error` | **Acá se ve si el respaldo sirve** |
| 8. Aplica `02-postambulo.sql` (tareas programadas) | — |
| 9. Cuenta filas por tabla | Se lee en el registro |
| 10. **Comprueba que la base es usable** | Menos de 20 políticas RLS, o cero permisos de `anon`, y falla |

### Por qué vaciar es un paso aparte y no `--clean`

El primer intento usaba `pg_restore --clean --if-exists`. No sirve: el
`if exists` de `drop policy` protege contra que falte **la política**, no contra
que falte **la tabla**, así que sobre una base recién creada muere en la primera
sentencia con «relation public.vigilancia_salud does not exist». Lo que prometía
hacer el ensayo repetible lo hacía imposible la primera vez.

La salida evidente —`drop schema public cascade`— es peor y de una forma que no
se ve. Supabase configura **privilegios por defecto sobre el esquema** para que
las tablas nuevas queden alcanzables por `anon` y `authenticated`; esa
configuración vive atada al esquema, así que borrarlo la borra. Como el volcado
va con `--no-privileges`, la base restaurada quedaría con todas las tablas y sin
permisos, y la API devolvería «permission denied» a todo — que se confunde con
RLS funcionando bien. Por eso `00-vaciar.sql` **vacía los esquemas y los deja en
pie**, y saltea los objetos que pertenecen a una extensión.

Y por eso el paso 9 comprueba los permisos de `anon` además de las políticas: son
las dos cosas que se pueden perder sin que nada falle.

### Y por qué la restauración saltea las entradas de tipo SCHEMA

Mismo problema, un escalón más abajo. El volcado trae `create schema public`
—`pg_dump` lo incluye porque en Supabase ese esquema no está en su estado por
defecto— y sobre el proyecto de ensayo eso falla con «schema public already
exists».

Las dos salidas fáciles ya estaban descartadas: `--clean` rompe antes, en el
`drop policy`, y borrar el esquema se lleva los privilegios por defecto.

Entonces la restauración usa el mecanismo que el propio `pg_restore` tiene para
esto: `--list` saca el índice del volcado, se le quitan las entradas de tipo
`SCHEMA`, y `-L` restaura con el índice recortado. **Se edita el índice, no el
archivo**, y los dos esquemas los crea `01-preambulo.sql`, que es código
versionado y revisable en un commit.

### El seguro

El paso 1 compara el identificador del proyecto de `ENSAYO_DB_URL` contra el de
`SUPABASE_DB_URL`. Si coinciden —o si no puede leer alguno de los dos— **se
niega**. Negarse ante la duda es la postura correcta: el peor error posible de
este flujo es escribir sobre los datos reales.

Los comandos locales `npm run ensayo:*` llevan el mismo seguro, comprobado
rompiéndolo a propósito.

### Por qué hacen falta un preámbulo y un postámbulo

Son las dos cosas que el volcado **no puede traer**, y las dos se descubrieron el
2026-09-09 preparando este ensayo:

- **Las extensiones no están en `public` ni en `private`**, así que `pg_dump` no
  las emite. Sin `pg_trgm` el índice de búsqueda no se crea; sin `http` las
  funciones del vigilante no compilan.
- **Las cinco tareas programadas viven en el esquema `cron`**, que no se
  respalda: es de la extensión, no de la aplicación. Una base restaurada sin
  ellas queda con todos los datos y sin nada que corra sola —las reservas no
  expiran, los vencidos no se suspenden, el vigilante no vigila— y se ve bien
  hasta que alguien pregunta por qué una reserva de anteayer sigue tomada.

`scripts/check-tareas-programadas.mjs` verifica que la lista del postámbulo
coincida con las tareas que programan las migraciones y con las que vigila
`estado_tareas()`. Falla el build si se desincronizan. Ya hubo una vez un
vigilante que nadie vigilaba; esto es para que no vuelva a pasar en silencio.

### Después del flujo, la comparación

El conteo del paso 7 dice qué llegó. Para compararlo con la base real:

```bash
RESTAURADO_URL=https://<proyecto-de-ensayo>.supabase.co \
RESTAURADO_KEY=<clave de servicio de ese proyecto> \
npm run respaldo:verificar
```

Imprime tabla por tabla cuántas filas hay en cada lado. Se admite que el
restaurado tenga **menos** —el respaldo es de ayer y la base real siguió
recibiendo pedidos—; lo que no se admite es una tabla vacía cuando la real tiene
contenido, y eso el comando lo marca y termina con error.

Se da por bueno cuando, además:

- El paso 7 muestra políticas de RLS restauradas, no cero.
- `npm run ensayo:rls` pasa contra ese proyecto.

Anotá la fecha del último ensayo acá abajo. Un respaldo sin ensayo reciente es
una promesa, no una garantía.

| Fecha del ensayo | Resultado |
|---|---|
| — | pendiente |

## Qué hacer si hay que restaurar de verdad

1. **No borrar nada primero.** Renombrar o dejar la base dañada como está: puede
   contener datos posteriores al último respaldo que valga la pena rescatar.
2. Restaurar en un proyecto nuevo y verificar con la lista de arriba.
3. Recién entonces cambiar `NEXT_PUBLIC_SUPABASE_URL` y las claves en Cloudflare.
4. Avisar a los negocios afectados qué período se perdió. El respaldo es diario,
   así que la pérdida máxima es de un día.
