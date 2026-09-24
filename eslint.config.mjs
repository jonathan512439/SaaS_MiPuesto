import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  /* Las imágenes para redes sociales se dibujan con `ImageResponse`, que solo
     entiende `<img>`: `next/image` ahí no existe. La regla de Next ya exceptúa
     estos archivos, pero reconoce la ruta con «/», así que en Windows —con «\»—
     no la exceptuaba y en Linux sí. Un comentario para desactivarla sobraba en
     uno y faltaba en el otro, y el lint de Cloudflare frenó la publicación por
     eso. Declarado acá vale igual en los dos. */
  {
    files: ["**/opengraph-image.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
  globalIgnores([
    ".next/**",
    ".vinext/**",
    ".wrangler/**",
    "dist/**",
    "out/**",
    "coverage/**",
    "next-env.d.ts",
    /* El frontend de referencia: tiene su propio proyecto, sus dependencias y su
       propio estilo. Está fuera de git y no se compila acá. Sin esto, `lint`
       recorre sus 5.000 archivos —incluido lo ya empaquetado— y reporta miles de
       problemas de un código que no es nuestro y que no vamos a corregir. */
    "Catalogos_Ejemplo/**",
  ]),
]);
