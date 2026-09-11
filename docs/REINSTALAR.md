# Reinstalar MiPuesto en una máquina nueva

Escrito el 2026-09-11, antes de formatear.

Esta guía tiene dos partes: **lo que hay que copiar antes de formatear** —porque
no está en ningún otro lado— y **cómo dejar todo funcionando después**.

---

# PARTE 1 · Antes de formatear

## 1.1 Lo único que no se puede recuperar

**`GEMINI_API_KEY`.** Google la muestra una sola vez, al crearla. Si se pierde,
hay que crear otra y reemplazarla en dos lugares (`.env.local` y el secreto del
Worker). No es el fin del mundo, pero es el único valor del proyecto que no se
puede volver a leer de ninguna parte.

Todo lo demás se puede recuperar entrando a la cuenta correspondiente.

## 1.2 Los tres archivos y carpetas a copiar

Copiá esto a un disco externo o a una carpeta que sobreviva al formateo:

| Qué | Dónde está | Por qué |
|---|---|---|
| **`.env.local`** | Raíz del proyecto | Todas las claves locales. Está fuera de git a propósito |
| **`Catalogos_Ejemplo/`** | Raíz del proyecto | El frontend de referencia. Fuera de git por su tamaño |
| **Respaldo de la base** | R2, bucket `mipuesto-respaldos` | Ya está en la nube. Verificá que el último sea de estos días |

> **No copies `node_modules/`.** Se reinstala con `npm install` y ocupa más que
> todo el resto junto. Lo mismo con `.next/`, `dist/` y `.wrangler/`.

De `Catalogos_Ejemplo/` alcanza con copiar todo **menos** dos carpetas, que
también se regeneran. Los números medidos hoy:

| | Tamaño | ¿Copiar? |
|---|---|---|
| `Catalogos_Ejemplo/` completo | 1,1 GB | |
| `site/node_modules/` | 586 MB | **No** |
| `site/pages-dist/` | 108 MB | **No** |
| **Lo que sí hay que copiar** | **~400 MB** | Sí |

En Git Bash, copiar solo lo necesario:

```bash
rsync -a --exclude 'site/node_modules' --exclude 'site/pages-dist' Catalogos_Ejemplo/ /d/respaldo/Catalogos_Ejemplo/
```

Si preferís el explorador de Windows: copiá `_analysis`, `docs`, `tools` y
`site`, y dentro de `site` borrá `node_modules` y `pages-dist` de la copia.

## 1.3 Comprobá que el respaldo de la base está al día

En GitHub, pestaña **Actions** → **Respaldo diario de la base** → que el último
esté en verde. Si hace días que no corre, disparalo a mano con **Run workflow**
antes de formatear.

El respaldo son 8 archivos en R2: volcado completo, esquema, datos, usuarios de
auth, identidades, historial de migraciones, Storage y permisos. El detalle está
en [`RESPALDOS.md`](RESPALDOS.md).

## 1.4 Anotá a qué cuentas entrar

No hace falta copiar contraseñas si usás un gestor, pero anotá **cuáles** son:

| Servicio | Para qué | Cuenta |
|---|---|---|
| GitHub | El repositorio y los workflows | `jonathan512439` |
| Supabase | Base de producción (`mipuesto-dev`) y la de ensayo | — |
| Cloudflare | Workers (el sitio) y R2 (los respaldos) | — |
| Google AI Studio | `GEMINI_API_KEY` | — |

---

# PARTE 2 · Después de formatear

## 2.1 Instalar las herramientas

Estas son las versiones con las que el proyecto está andando hoy. No hace falta
clavarlas, pero si algo se rompe, este es el punto de comparación.

| Herramienta | Versión | Cómo |
|---|---|---|
| **Node.js** | 22.23.1 | <https://nodejs.org> — la LTS 22.x |
| npm | 10.9.8 | Viene con Node |
| **Git** | 2.39.1 | <https://git-scm.com> — **instalá Git Bash**, que el proyecto usa |
| **GitHub CLI** | 2.92.0 | <https://cli.github.com> |
| Python | 3.13 | Opcional. Se usa para scripts sueltos de mantenimiento |
| VS Code | — | Con la extensión de Claude Code |

`supabase` (2.116.0) y `wrangler` (4.127.1) **no se instalan aparte**: vienen
como dependencias del proyecto y se corren con `npx`.

Docker **no hace falta**. El desarrollo usa el proyecto remoto `mipuesto-dev`, no
Supabase local. Está explicado en [`CONFIGURACION-MANUAL.md`](CONFIGURACION-MANUAL.md).

## 2.2 Traer el proyecto

```bash
git clone https://github.com/jonathan512439/SaaS_MiPuesto.git
cd SaaS_MiPuesto
npm install
```

Después, restaurá las dos cosas que no vienen de git:

1. Copiá tu `.env.local` a la raíz.
2. Copiá `Catalogos_Ejemplo/` a la raíz.

Si perdiste `.env.local`, la sección 2.6 dice de dónde sale cada valor.

## 2.3 Iniciar sesión en las herramientas

```bash
gh auth login
npx wrangler login
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
```

El `project-ref` es el código que aparece en la URL del panel de Supabase:
`https://supabase.com/dashboard/project/<ref>`.

## 2.4 Comprobar que todo anda

En este orden. Si uno falla, no sigas al siguiente.

```bash
npm run typecheck        # TypeScript
npm run lint             # ESLint, con las guardias de secretos
npm test                 # 578 pruebas, contraste, tokens y tareas programadas
npm run test:rls:linked  # Aislamiento entre negocios, contra el proyecto real
npm run build:vinext     # El build de Cloudflare Workers
npm run salud            # Que producción responda
```

Si `npm test` pasa y `npm run salud` responde, la máquina está lista.

## 2.5 Comprobar que la base está donde la dejaste

```bash
npm run supabase:push:dry   # No debe querer aplicar ninguna migración
npm run test:fase1:linked   # Categorías con identidad
npm run test:fase2:linked   # Campos por categoría
npm run test:fase4:linked   # Presentaciones
```

`supabase:push:dry` diciendo «no hay migraciones para aplicar» es la señal de que
el código local y la base de producción están sincronizados.

## 2.6 De dónde sale cada valor de `.env.local`

Si lo perdiste, se rearma así. Copiá `.env.example` como `.env.local` y completá:

| Variable | De dónde |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → proyecto → Connect |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Connect. Es pública, va al navegador |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API Keys. Heredada, por compatibilidad |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API Keys. **Privilegiada: nunca al navegador** |
| `GEMINI_API_KEY` | Google AI Studio. **Si se perdió, creá una nueva** |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` en tu máquina |
| `ENSAYO_URL` | Supabase → **proyecto de ensayo** → Connect |
| `ENSAYO_PUBLISHABLE_KEY` | Idem, Connect |
| `ENSAYO_SERVICE_ROLE_KEY` | Idem, API Keys |
| `ENSAYO_DB_URL` | Ensayo → Settings → Database → Connection string, modo **session** |

Verificalo con `npm run ensayo:ver`, que dice el rol y el sistema de cada clave
**sin imprimirla**.

### La regla de `GEMINI_API_KEY`, que no cambia

Va solo en `.env.local` y como secreto del Worker. **Nunca** con prefijo
`NEXT_PUBLIC_`, **nunca** en código de cliente, **nunca** pegada en un chat. Lo
vigila `scripts/check-client-secrets.mjs`, que corre antes de cada build y de
cada lint.

Tener varias claves para esquivar los límites de uso va contra los términos de
Google. No se hace.

## 2.7 Lo que **no** hay que reconfigurar

Esto vive en la nube y sobrevive al formateo. No lo toques:

- **Los secretos del Worker** (5): `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_SITE_URL`.
- **Los secretos de GitHub Actions** (5): `SUPABASE_DB_URL`, `ENSAYO_DB_URL`,
  `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `SUPABASE_KEEPALIVE_SECRET`.
- **La variable** `R2_BUCKET_RESPALDOS` = `mipuesto-respaldos`.
- El despliegue automático de Cloudflare al empujar a `main`.
- Las 5 tareas de `pg_cron` en la base.

Se listan con `npx wrangler secret list --config dist/server/wrangler.json` y con
`gh secret list`. Los nombres se ven; los valores no, ni desde ahí ni desde el
panel.

---

# PARTE 3 · Retomar el trabajo

## 3.1 Qué leer, en orden

1. **[`../PROMPT-MAESTRO.md`](../PROMPT-MAESTRO.md)** — el contexto completo para
   arrancar una conversación nueva con Claude. Es el que hay que pegar o
   mencionar primero.
2. **[`AVANCE.md`](AVANCE.md)** — en qué está el proyecto, fase por fase.
3. **[`plan/`](plan/README.md)** — el plan vigente, en el orden de su `README.md`.
4. **[`../AGENTS.md`](../AGENTS.md)** — las reglas que no se rompen.

## 3.2 Dónde quedó el trabajo

Al 2026-09-11, con el plan de nueve fases:

| Fase | Estado |
|---|---|
| 1 · La categoría toma identidad | **Cerrada** |
| 2 · Los campos de la categoría | **Cerrada** |
| 3 · Los campos en el producto | **Cerrada** |
| 4 · Presentaciones | **Desplegada**, falta la reserva por presentación |
| 5 · Agenda y citas | Siguiente |
| 6 a 9 | No iniciadas |

**Lo primero que hay que decidir al volver:** la fase 5 toca el motor de reservas
—cinco funciones de la base— y la fase 4 dejó pendiente la reserva por
presentación, que toca las mismas cinco. Conviene hacer las dos juntas en vez de
entrar dos veces al mismo código. Está anotado en
[`plan/06-FASES.md`](plan/06-FASES.md), al final de la fase 4.

## 3.3 Cómo verificar que no se perdió nada

```bash
git log --oneline -12
```

Los últimos commits del trabajo documentado acá:

```
da07919  feat: las presentaciones de un producto (fase 4)
2141b1e  feat: los campos de la categoria se cargan y se ven (fase 3)
a7fe08f  feat: los campos de la categoria (fase 2)
6e96c15  feat: la categoria toma identidad (fase 1)
e20449b  docs: el plan nuevo, con el catalogo de Catalogos_Ejemplo como destino
```

Si `git log` muestra `da07919` o algo más nuevo, el trabajo está completo: **todo
lo hecho está empujado a `main`**, no hay nada sin commitear.

## 3.4 Si algo salió mal con la base

El ensayo de restauración es un botón y es repetible:

GitHub → Actions → **Ensayo de restauración** → Run workflow. Restaura el último
respaldo sobre el proyecto de ensayo y verifica que quede usable. Se niega a
correr si `ENSAYO_DB_URL` apunta a producción.

El procedimiento completo, incluidos los nueve defectos que se encontraron y
corrigieron, está en [`RESPALDOS.md`](RESPALDOS.md).
