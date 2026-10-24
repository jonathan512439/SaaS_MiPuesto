# Pasar MiPuesto a mi-puesto.com

Guía para el dueño, paso a paso. El dominio se compró en Cloudflare el
2026-10-24. **Hazlo en este orden**: cada paso depende del anterior.

El código ya está listo: cuando la dirección del sitio pase a ser
`mi-puesto.com` (paso 4), todo lo que llegue por la dirección vieja
(`mipuesto-dev.mipuesto-app.workers.dev`) o por `www.mi-puesto.com` se manda
solo a `mi-puesto.com`, con la misma ruta. Los enlaces y QR que ya compartiste
siguen funcionando (`lib/dominio-canonico.ts`).

## 1. Conectar el dominio al sitio

1. Entra a **dash.cloudflare.com → Workers & Pages → mipuesto-dev**.
2. **Settings → Domains & Routes → + Add → Custom domain**.
3. Escribe `mi-puesto.com` y toca **Add domain**.
4. Repite con `www.mi-puesto.com`.
5. Espera a que los dos digan **Active** (unos minutos: Cloudflare crea el
   certificado).

**Comprobación:** abre `https://mi-puesto.com` en el celular. Tiene que abrir
la portada de MiPuesto.

## 2. Turnstile (sin esto, los pedidos fallan)

1. En el panel de Cloudflare, busca **Turnstile** en el menú de la izquierda.
2. Abre el widget de MiPuesto (la clave del sitio empieza con `0x4AAAAAAFB658`).
3. En **Hostnames**, agrega `mi-puesto.com` y `www.mi-puesto.com`. **No borres**
   los que ya están.
4. Guarda.

## 3. Supabase (sin esto, el ingreso y las invitaciones fallan)

1. Entra a **supabase.com → el proyecto de producción
   (`afhnxjdqaruwccgsdxzb`) → Authentication → URL Configuration**.
2. **Site URL:** `https://mi-puesto.com`
3. **Redirect URLs → Add URL:** `https://mi-puesto.com/**`
4. **Deja la dirección vieja en la lista** unas semanas: las invitaciones que ya
   enviaste apuntan a ella.
5. Guarda.

## 4. La dirección del sitio

Es la variable que enciende todo lo demás. Va en **dos** lugares, porque una se
usa al compilar y la otra al atender.

1. **Workers & Pages → mipuesto-dev → Settings → Variables and Secrets**:
   cambia `NEXT_PUBLIC_SITE_URL` a `https://mi-puesto.com`.
2. **Workers & Pages → mipuesto-dev → Settings → Build → Variables and
   secrets**: cambia también ahí `NEXT_PUBLIC_SITE_URL` a
   `https://mi-puesto.com`.
3. Sube el código para que se vuelva a compilar con la dirección nueva:

   ```
   git push origin main
   ```

4. Espera a que Workers Builds termine (unos minutos).

**Comprobaciones:**

- `https://mi-puesto.com/kantuta-moda` abre el catálogo.
- `https://www.mi-puesto.com` te lleva a `https://mi-puesto.com`.
- `https://mipuesto-dev.mipuesto-app.workers.dev/kantuta-moda` te lleva a
  `https://mi-puesto.com/kantuta-moda`.
- El código QR de un catálogo, en el panel, ya dice `mi-puesto.com`.

## 5. El vigilante (la alerta de sitio caído)

En la carpeta del proyecto, en la terminal:

```
npm run vigilancia:configurar -- --sitio "https://mi-puesto.com"
npm run vigilancia:configurar -- --catalogo "https://mi-puesto.com/kantuta-moda"
npm run vigilancia:configurar -- --ver
```

El último solo muestra cómo quedó: las dos direcciones tienen que decir
`mi-puesto.com`.

## 6. GitHub (el vigilante diario)

1. En GitHub, abre el repositorio → **Settings → Secrets and variables →
   Actions → pestaña Variables**.
2. **New repository variable:** nombre `SITIO_URL`, valor
   `https://mi-puesto.com`.

## 7. Comprobar que todo quedó bien

```
npm run test:rls:linked
```

Y avísale a Claude: revisa el sitio entero desde afuera —portada, catálogos,
ingreso, redirecciones y Turnstile— antes de que imprimas QR o grabes etiquetas
NFC.

## 8. Alertas de facturación (con Workers Paid ya pagado)

1. **Manage Account → Billing → Billable Usage → Budget alerts**:
   - una alerta de **$10** (te avisa si el uso extra del mes pasa de $10);
   - otra de **$25**, por si algo se dispara.
2. **Notifications → Add**: activa el **resumen semanal de uso de Workers**.

Las alertas llegan por correo con un día de retraso: el uso se procesa una vez
al día. **No frenan el sitio**; solo avisan.

## Lo que no hay que activar

Para no pagar de más: el dominio queda en el plan **Free** (no subirlo a Pro),
y no se activan Argo, Load Balancing, Cloudflare Images, Stream, Logpush ni
Advanced Certificate Manager. Tampoco **Bot Fight Mode**: puede bloquear la
vista previa de los enlaces en WhatsApp y a los buscadores.

**Opcional y gratis:** **Email Routing**, para tener un correo
`hola@mi-puesto.com` que llegue a tu Gmail.
