# Actualizar dependencias sin sorpresas

MiPuesto corre sobre **vinext 1.0.0-beta.8** y **@vinext/cloudflare 1.0.0-beta.6**,
que ponen Next.js 16 sobre Cloudflare Workers. Son betas: una versión nueva puede
cambiar cómo se arma una página sin avisar. Ya pasó con `next/image`, que en vinext
convierte `width` y `height` en tamaños máximos en línea y rompió el banner en
producción.

Esta página dice cuándo y cómo se actualiza. Aplica a todas las dependencias,
pero sobre todo a las que sostienen el sistema: `vinext`, `@vinext/cloudflare`,
`next`, `react`, `react-dom`, `@supabase/*` y `wrangler`.

## Lo que ya está fijo

- Todas las versiones de `package.json` son exactas: sin `^` ni `~`.
- `.npmrc` tiene `save-exact=true`: `npm install paquete` escribe la versión exacta.
- `scripts/check-versiones-fijas.mjs` (dentro de `npm test`) falla si una versión
  usa un rango o si `package-lock.json` no pide lo mismo que `package.json`.
- Cloudflare instala desde el candado en cada publicación y corre
  `npm run verificar` antes del build: tipos, lint y todas las pruebas. Si algo
  falla, **no se publica** y producción sigue con la versión anterior.

## Cuándo se actualiza

Solo con un motivo, y el motivo se anota en el commit:

1. Un aviso de seguridad que nos afecta (`npm audit`, o el anuncio del proyecto).
2. Un error de la dependencia que nos está pegando.
3. Algo que necesitamos y la versión nueva trae.

«Salió una versión nueva» no es motivo. Una beta que funciona vale más que una
beta nueva que no probamos.

## Cómo se actualiza

1. **De a una por vez.** Las que viajan juntas, juntas: `vinext` con
   `@vinext/cloudflare`; `react` con `react-dom` y `react-server-dom-webpack`;
   `next` con `eslint-config-next`.
2. **Leer qué cambió** antes de instalar: las notas de la versión y, en vinext,
   todo lo que diga *breaking*.
3. Instalar la versión exacta:
   ```
   npm install vinext@X.Y.Z @vinext/cloudflare@X.Y.Z
   ```
4. Correr la verificación y el build:
   ```
   npm run build:vinext     # corre antes npm run verificar
   npx wrangler check startup
   ```
   El chequeo de arranque mide el CPU: si sube mucho, se anota.
5. **Revisar a mano** con `npm run start:vinext`, en un teléfono de 360 px o
   con el navegador en ese ancho:
   - la portada y el directorio;
   - el catálogo de un negocio con fotos, banner y logo —lo primero que rompe
     una beta de vinext son las imágenes—;
   - la página de un producto con tallas, y agregar al carrito;
   - el ingreso al panel, «Productos», «Mi catálogo» y «Apariencia».
6. Empujar a `main` y comprobar que la marca de `/api/salud` cambió.

## Si algo se rompe en producción

Volver a la versión anterior sin esperar un arreglo:

```
npx wrangler rollback
```

Después se revierte el commit de la actualización (`git revert`) para que la
próxima publicación no la vuelva a traer, y se anota en `docs/AVANCE.md` qué
falló y en qué versión.

## Una vez por mes

`npm audit`. Lo que marque como alto o crítico en una dependencia que llega al
Worker o al navegador se actualiza siguiendo esta página. Lo que solo afecta a
herramientas de desarrollo se anota y se decide.
