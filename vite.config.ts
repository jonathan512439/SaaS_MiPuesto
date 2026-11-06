import { defineConfig, type Plugin } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { cdnAdapter } from "@vinext/cloudflare/cache/cdn-adapter";

/* pdf.js corre solo en el navegador (`lib/ia/pdf-grande.ts`, con `import()`), pero
   el `import()` de un componente de cliente también se empaqueta para el servidor,
   y sumaba casi 2 MB a un Worker con tope de 3 MB comprimidos en el plan gratuito.
   En el servidor ese módulo queda vacío: nunca se llama ahí. */
function sinPdfEnElServidor(): Plugin {
  const vacio = "\0pdf-grande-vacio";
  return {
    name: "mipuesto:sin-pdf-en-el-servidor",
    enforce: "pre",
    applyToEnvironment: (entorno) => entorno.name !== "client",
    resolveId: (id) => (id.endsWith("/lib/ia/pdf-grande") ? vacio : null),
    load: (id) => (id === vacio ? "export {};" : null),
  };
}

export default defineConfig({
  plugins: [
    sinPdfEnElServidor(),
    vinext({
      cache: { cdn: cdnAdapter() },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
