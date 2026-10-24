# Pendientes: respaldo de la base y correos de alta

Traspaso del 2026-10-24, para seguir en otra conversación. Dos tareas.

---

## 1. El respaldo diario y su ensayo de restauración

### Cómo está hoy

- **El respaldo no está copiando producción.** El secreto de GitHub
  `SUPABASE_DB_URL` quedó con la dirección de **ensayo**
  (`hwirzxnoyuuqgbwipiff`). El 2026-10-24 el flujo «Respaldo diario de la base»
  salió en verde, pero copiando ensayo. Producción
  (`afhnxjdqaruwccgsdxzb`) **no tiene un respaldo bueno** desde el 2026-10-18.
- **Desde `75c8335` el respaldo se niega** si `SUPABASE_DB_URL` no apunta a
  producción: ahora sale en rojo con «no apunta a producción», que es lo
  correcto mientras el secreto esté mal.
- **El ensayo de restauración** (`ensayo-restaurar.yml`, solo a mano) se niega
  porque los dos secretos apuntan al mismo proyecto. Desde `d78f562` dice a
  qué proyecto apunta cada uno.
- **Contraseñas:**
  - El 2026-10-24 el dueño restableció la contraseña de la base **de ensayo**
    creyendo que era la de producción. La de ensayo que había en `.env.local`
    dejó de servir.
  - **La de producción sigue siendo la vieja, y no está guardada.** Hay que
    restablecerla.
  - Ninguna de las dos afecta al sitio (entra con sus claves de API) ni a
    `supabase … --linked`.

### Qué usa cada secreto

| Secreto de GitHub | Proyecto | Lo usan |
|---|---|---|
| `SUPABASE_DB_URL` | **producción**, `postgres.afhnxjdqaruwccgsdxzb` | `respaldo.yml` (diario) y `revisar-archivos.yml` (lunes) |
| `ENSAYO_DB_URL` | **ensayo**, `postgres.hwirzxnoyuuqgbwipiff` | `ensayo-restaurar.yml` (a mano) |

Los dos con la cadena del **Session pooler** (puerto **5432**). La cadena
directa (`db.<ref>.supabase.co`) no sirve: los servidores de GitHub no llegan
por IPv6.

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` y la variable
`R2_BUCKET_RESPALDOS` están bien: no tocarlos.

### Pasos para dejarlo bien

1. **Producción:** en Supabase, en el proyecto `afhnxjdqaruwccgsdxzb`, ir a
   Project Settings → Database → Reset database password.
   - La contraseña nueva va **solo con letras y números**, de 20 caracteres o
     más, y hay que **guardarla**.
   - Copiar la cadena de Connect → **Session pooler**, con la contraseña puesta.
   - En `.env.local`, agregar `SUPABASE_DB_URL=` con esa cadena.
2. **Ensayo:** en el proyecto `hwirzxnoyuuqgbwipiff`, usar la contraseña que
   se le puso el 2026-10-24 o restablecerla de nuevo.
   - Copiar su cadena de Session pooler.
   - En `.env.local`, reemplazar la línea `ENSAYO_DB_URL=`.
3. **Probar en la máquina:** `npm run cadenas:probar`.
   - Las dos cadenas tienen que salir con ✓✓.
   - El comando revisa el proyecto, el puerto 5432 y que la contraseña entre,
     sin mostrarla.
   - No seguir hasta que estén las dos bien.
4. **Copiar a GitHub:** en Settings → Secrets and variables → Actions →
   **Repository secrets**, poner cada valor **tal cual** está en `.env.local`.
   - Ojo con no guardarlos en *Environments*, *Codespaces* ni *Dependabot*.
5. **Correr el respaldo:** Actions → «Respaldo diario de la base» → Run
   workflow. Tiene que salir en verde.
6. **Correr el ensayo:** Actions → «ensayo-restaurar» → Run workflow.
   - Tiene que mostrar `SUPABASE_DB_URL apunta a: afhnxjdqaruwccgsdxzb` y
     `ENSAYO_DB_URL apunta a: hwirzxnoyuuqgbwipiff`.
   - Tiene que terminar en verde.
   - Escribe sobre la base de ensayo, a propósito.
7. **Opcional, para que no se acumulen copias:** en Cloudflare, ir a R2 → el
   balde de respaldos → Settings → Object lifecycle rules.
   - Prefijo `20` (las carpetas de cada día; no toca `fotos/`).
   - Borrar a los **60 días**.

### Sobre el espacio

- Los respaldos van a **Cloudflare R2**, no a Supabase. No ocupan el espacio de
  los negocios ni el plan de Supabase.
- R2 es gratis hasta 10 GB.
- La base pesa pocos MB por día, y las fotos se suben una vez; después, solo
  las nuevas.

---

## 2. El correo de invitación y el de bienvenida

### Cómo funciona hoy

- Plataforma → Herramientas → «Invitar negocio» llama a
  `app/api/plataforma/invitaciones/route.ts`. También se puede con
  `npm run auth:invitar`, que corre `scripts/invitar-admin.mjs`.
- Los dos usan `auth.admin.inviteUserByEmail(correo, { redirectTo })`, con
  `redirectTo` = `<sitio>/actualizar-clave`. Desde el 2026-10-24 el sitio es
  `https://mi-puesto.com`.
- **No hay un SMTP propio configurado.** En `supabase/config.toml`, la sección
  `[auth.email.smtp]` está comentada. Producción usa el correo incorporado de
  Supabase.
- **No hay plantilla propia de la invitación.** También está comentada
  (`[auth.email.template.invite]`), así que sale la de Supabase, en inglés.
- **No existe un correo de bienvenida:** no hay nada en el código que lo envíe.

### Lo más probable que esté fallando (verificar primero)

1. **El correo incorporado de Supabase solo entrega a los miembros del equipo
   del proyecto**, y con un tope de pocos correos por hora. Pensado para
   pruebas, no para clientes. A un correo de un cliente nuevo puede no llegar
   nunca.
   - Arreglo: configurar un **SMTP propio** en Supabase → Authentication →
     Emails → SMTP Settings.
   - Opciones con plan gratis: Resend, Brevo o Amazon SES. Con el dominio, el
     remitente puede ser `hola@mi-puesto.com` o `no-responder@mi-puesto.com`.
   - Hay que agregar en el DNS de Cloudflare los registros SPF y DKIM que pida
     el proveedor, para que no caiga en spam.
2. **La dirección de vuelta:** en Supabase → Authentication → URL
   Configuration tiene que estar `https://mi-puesto.com/**` en Redirect URLs, y
   el Site URL tiene que ser `https://mi-puesto.com`. El dueño dice que ya lo
   cambió; confirmarlo.
3. **La plantilla en español y con la marca:** Authentication → Emails →
   Templates → **Invite user**, con el texto en español (tú y vos, ver
   `docs/plan/08-VOCABULARIO.md`) y el botón a `{{ .ConfirmationURL }}`.
   - Conviene también pasar la plantilla a `supabase/templates/invite.html` y
     descomentar `[auth.email.template.invite]`, para que quede versionada.

### El correo de bienvenida (nuevo)

Decidir qué es:
- ¿el mismo correo de invitación, mejor escrito?, o
- ¿un segundo correo al terminar el alta (`alta_completada_en`), con su enlace,
  su QR, los videos de «Aprende» y el WhatsApp de ayuda?

Si es el segundo, se envía desde el servidor con el mismo SMTP —por la API del
proveedor—, una sola vez por negocio, con una columna que lo marque como
enviado.

### Cómo probar

- Invitar un correo **que no sea del equipo** de Supabase; por ejemplo, otro
  Gmail del dueño.
- Revisar que llegue, que no caiga en spam, que el enlace abra
  `mi-puesto.com/actualizar-clave` y que se pueda definir la contraseña y
  entrar.
- Avisos que ya había: `SECURITY.md`, sección «La invitación que daba
  vueltas».
