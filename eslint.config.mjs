import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
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
