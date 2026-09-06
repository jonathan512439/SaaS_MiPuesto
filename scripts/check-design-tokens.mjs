import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const carpetas = ["app", "components"];
const errores = [];

function listarArchivos(ruta) {
  return readdirSync(ruta).flatMap((nombre) => {
    const completa = join(ruta, nombre);
    return statSync(completa).isDirectory() ? listarArchivos(completa) : [completa];
  });
}

function registrar(archivo, regla, coincidencia) {
  errores.push(`${relative(raiz, archivo)}: ${regla}: ${coincidencia.trim()}`);
}

for (const carpeta of carpetas) {
  for (const archivo of listarArchivos(join(raiz, carpeta))) {
    const extension = extname(archivo);
    const contenido = readFileSync(archivo, "utf8");
    const ruta = relative(raiz, archivo).replaceAll("\\", "/");

    const esFuenteDePaletas = ruta === "components/templates/tema-catalogo.module.css";
    const esImagenOpenGraph = ruta.endsWith("/opengraph-image.tsx");
    /* `global-error.tsx` solo se renderiza cuando falló el layout raíz, que es
       el que importa `globals.css`. Sin esa hoja no existen los tokens, así que
       una pantalla escrita con `var(--color-...)` saldría sin colores justo en
       el único momento en que se la ve. Es la única excepción, y es por eso. */
    const esUltimaRed = ruta === "app/global-error.tsx";

    if (extension === ".css" && ruta !== "app/globals.css" && !esFuenteDePaletas) {
      for (const coincidencia of contenido.matchAll(/#[0-9a-fA-F]{3,8}|\b(?:rgb|hsl|oklch|lab|lch)\(/g)) {
        registrar(archivo, "color fuera de los tokens", coincidencia[0]);
      }

      for (const coincidencia of contenido.matchAll(/font-size:\s*([^;]+);/g)) {
        if (!coincidencia[1].trim().startsWith("var(")) {
          registrar(archivo, "tamaño tipográfico fuera de los tokens", coincidencia[0]);
        }
      }

      const propiedadesEspaciado = /(?:^|\n)\s*(?:margin(?:-(?:block|inline|top|right|bottom|left))?|padding(?:-(?:block|inline|top|right|bottom|left))?|gap|row-gap|column-gap):\s*([^;]+);/g;

      for (const coincidencia of contenido.matchAll(propiedadesEspaciado)) {
        const valores = coincidencia[1].trim().split(/\s+/);
        const valido = valores.every(
          (valor) => valor === "0" || valor === "auto" || valor.startsWith("var(") || valor.startsWith("calc("),
        );

        if (!valido) registrar(archivo, "espaciado fuera de los tokens", coincidencia[0]);
      }
    }

    if ([".tsx", ".ts", ".jsx", ".js"].includes(extension)) {
      const documentaPaleta = ruta === "app/estilos/muestra-estilos.tsx";

      if (esUltimaRed) continue;

      if (!documentaPaleta) {
        for (const coincidencia of contenido.matchAll(/#[0-9a-fA-F]{3,8}/g)) {
          registrar(archivo, "color hexadecimal fuera de la fuente de verdad", coincidencia[0]);
        }
      }

      for (const coincidencia of contenido.matchAll(/\b(?:bg|text|border|outline|ring|fill|stroke|p[trblxy]?|m[trblxy]?|gap|space-[xy])-\[[^\]]+\]/g)) {
        registrar(archivo, "valor arbitrario de Tailwind", coincidencia[0]);
      }

      // ImageResponse/Satori solo acepta estilos visuales inline para renderizar el PNG.
      if (!esImagenOpenGraph && /style\s*=\s*\{\{/.test(contenido)) {
        registrar(archivo, "estilo visual inline", "style={{ ... }}");
      }
    }
  }
}

if (errores.length > 0) {
  throw new Error(`Control de tokens fallido:\n${errores.map((error) => `- ${error}`).join("\n")}`);
}

console.log("Control de tokens visuales: correcto.");
