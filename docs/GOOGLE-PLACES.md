# Cómo conseguir y cargar `GOOGLE_PLACES_API_KEY`

Para qué sirve: resolver la ficha de Google de cada negocio (`place_id`) y traer
su **calificación** y su **cantidad de opiniones**, que el catálogo muestra al
lado del botón «Cómo llegar».

**El botón ya funciona sin esta clave.** Hoy enlaza al mapa y no muestra número.
La clave solo agrega la estrella. Si nunca la configurás, no se rompe nada: no
aparece el número y listo.

> **Una sola clave para toda la plataforma, nunca una por negocio.** Los dueños
> no tienen que abrir cuentas de Google ni pagar nada. Y varias claves para
> esquivar los límites va contra los términos de Google.

---

## Antes de empezar

- Hace falta una **tarjeta de crédito o débito**. Google la pide para habilitar
  la facturación aunque el uso quede dentro del tramo sin costo.
- Vas a necesitar unos 15 minutos.
- Tené a mano dónde vas a pegar la clave (ver el paso 9). **Google la muestra
  entera una sola vez**; después solo se ve el principio.

---

## Paso 1 · Entrar a Google Cloud

1. Abrí **<https://console.cloud.google.com>**.
2. Iniciá sesión con tu cuenta de Google.
3. Si es la primera vez, aceptá los términos.

## Paso 2 · Crear el proyecto

1. Arriba a la izquierda, tocá el **selector de proyecto** (dice «Seleccionar
   proyecto» o el nombre de uno).
2. **Proyecto nuevo**.
3. Nombre: `MiPuesto`. Dejá la organización como venga.
4. **Crear**, y esperá a que termine.
5. Volvé al selector y **elegí `MiPuesto`**. Confirmá que arriba diga ese nombre
   antes de seguir: todo lo que viene se aplica al proyecto que esté elegido.

## Paso 3 · Habilitar la facturación

1. Menú ☰ → **Facturación**.
2. **Vincular una cuenta de facturación** → **Crear cuenta de facturación**.
3. País: **Bolivia**. Cargá tus datos y la tarjeta.
4. Volvé a **Facturación** y verificá que `MiPuesto` quede vinculado.

Sin esto, la API responde con error de facturación y el botón nunca muestra el
número.

## Paso 4 · Encender la API

1. Menú ☰ → **API y servicios** → **Biblioteca**.
2. Buscá **`Places API (New)`** — la nueva, no la que dice solo «Places API»
   (esa es la versión antigua).
3. Entrá y tocá **Habilitar**.

## Paso 5 · Crear la clave

1. **API y servicios** → **Credenciales**.
2. **Crear credenciales** → **Clave de API**.
3. Aparece la clave en un cuadro. **No la cierres todavía.**
4. Copiala y guardala un momento en un lugar seguro — un gestor de contraseñas,
   no un chat ni un archivo del proyecto.

## Paso 6 · Restringir la clave (no te saltees este paso)

En el mismo cuadro tocá **Editar clave de API**, o entrá desde Credenciales.

**Restricciones de API** — esto es lo importante:

1. Elegí **Restringir clave**.
2. En la lista, marcá **solo `Places API (New)`**.
3. **Guardar**.

Así, si la clave se filtrara, no sirve para ningún otro servicio de Google.

**Restricciones de aplicación:** dejalas en **Ninguna**.

Suena mal y conviene entender por qué. Las llamadas salen del **servidor**
(el Worker de Cloudflare), no del navegador de nadie. Restringir por sitio web
(«HTTP referrer») no aplica, y restringir por IP tampoco sirve: Cloudflare sale
por un rango de direcciones que cambia. Lo que protege la clave acá es otra
cosa: **nunca viaja al navegador** —la guarda `check-client-secrets` lo impide—,
está limitada a una sola API, y tiene tope de consumo (paso 7).

## Paso 7 · Ponerle techo al gasto

Dos redes, y conviene poner las dos.

**Tope de consultas:**

1. **API y servicios** → **Places API (New)** → pestaña **Cuotas**.
2. Buscá el límite de solicitudes por día.
3. Editalo a un número bajo y cómodo: **1.000 por día** sobra. El sistema pide
   **una consulta por negocio por semana**, así que con mil negocios estarías
   usando unas 140 por día.

**Alerta de presupuesto:**

1. **Facturación** → **Presupuestos y alertas** → **Crear presupuesto**.
2. Monto: lo que estés dispuesto a gastar, por ejemplo **5 USD** al mes.
3. Activá los avisos por correo al 50 %, 90 % y 100 %.

> Google cambia sus precios y su tramo sin costo cada tanto. Antes de confiar en
> un número, mirá la página de precios de Places API el día que lo configures.

## Paso 8 · Cargar la clave en tu máquina

En el archivo **`.env.local`** de la raíz del proyecto, agregá una línea:

```
GOOGLE_PLACES_API_KEY=la-clave-que-copiaste
```

Tres reglas que no se negocian:

- **Nunca** con el prefijo `NEXT_PUBLIC_`. Ese prefijo la empaqueta dentro del
  JavaScript que baja el navegador: quedaría a la vista de cualquiera que abra
  el código fuente de tu catálogo.
- **Nunca** en un archivo que se suba al repositorio. `.env.local` está ignorado
  por git justamente para esto.
- **Nunca** pegada en un chat, un correo o un ticket.

## Paso 9 · Cargar la clave en producción

El Worker de Cloudflare no lee `.env.local`. La clave se carga aparte:

```bash
npm run build:vinext
npx wrangler secret put GOOGLE_PLACES_API_KEY --config dist/server/wrangler.json
```

Te va a pedir el valor: pegalo y dale enter. Se guarda cifrado; después el valor
no se puede volver a leer, ni desde la consola ni desde el panel de Cloudflare.

Para confirmar que quedó (muestra los nombres, no los valores):

```bash
npx wrangler secret list --config dist/server/wrangler.json
```

### ⚠️ `--keep-vars` es obligatorio

Cada vez que se despliegue a mano:

```bash
npx wrangler deploy --config dist/server/wrangler.json --keep-vars
```

**Sin `--keep-vars`, el despliegue borra todos los secretos del Worker** —los
seis, no solo este— y el sitio queda sin base de datos hasta que se vuelvan a
cargar uno por uno.

---

## Paso 10 · Avisame

Con la clave cargada en los dos lados, decímelo y conecto la parte que falta:

- `POST /api/negocios/maps/resolver`, que busca el negocio en Google y guarda su
  `place_id`.
- La tarea semanal de `pg_cron` que refresca la calificación, con su tope duro.
- La estrella al lado del botón «Cómo llegar».

El modelo de datos **ya está listo**: las columnas `maps_*` existen desde la
migración `20260930090000`, con una restricción que impide mostrar una
calificación de un negocio cuya ficha no se resolvió. No hay que tocar la base.

---

## Si algo sale mal

| Qué ves | Qué pasó |
|---|---|
| `REQUEST_DENIED` | La API no está habilitada, o la clave quedó restringida a otra API. Revisá los pasos 4 y 6 |
| `This API project is not authorized` | Estabas parado en otro proyecto al habilitar la API. Volvé al paso 2 |
| Error de facturación | Falta vincular la cuenta de facturación al proyecto (paso 3) |
| `OVER_QUERY_LIMIT` | Se tocó el techo del paso 7. Subilo, o revisá por qué se está consultando de más |
| El botón sigue sin número | Normal si la clave no está cargada en el Worker, o si ese negocio todavía no resolvió su ficha |

## Si la clave se filtra

1. **Credenciales** → la clave → **Eliminar**. Deja de servir al instante.
2. Creá una nueva siguiendo desde el paso 5.
3. Cargala en `.env.local` y en el Worker otra vez (pasos 8 y 9).

No hace falta tocar la base ni los catálogos: la clave no se guarda en ningún
lado más.
