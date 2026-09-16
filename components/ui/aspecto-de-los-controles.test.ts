import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/* El panel tiene tres aspectos de control, y no uno por pantalla.
 *
 * Llegó a tener ocho. No por descuido de nadie: cada pantalla nueva necesitaba
 * un botón chico, lo escribía ahí mismo, y elegía sus colores a ojo. Ocho veces
 * una decisión razonable dan un panel donde el mismo botón es de tres colores
 * según dónde estés, y quien lo mira busca qué significa la diferencia —porque
 * la gente asume que una diferencia significa algo— y no encuentra nada.
 *
 * Limpiarlo una vez no alcanza: la novena pantalla vuelve a empezar. Esta prueba
 * es la que hace que no vuelva.
 *
 * Lo que comprueba: que ningún control del panel se pinte el fondo o la letra
 * con algo que no salga de `--control-principal-*`, `--control-segundo-*` o
 * `--control-peligro-*`, salvo los que están listados abajo **con su motivo**.
 * La lista es la parte importante: obliga a escribir por qué este control es
 * distinto, y si el motivo no se puede escribir, es que no había motivo.
 */
const RAIZ = join(import.meta.dirname, "..", "..");

/* El catálogo público es otra superficie, con su propia paleta por negocio y sus
   propias reglas. No entra acá. */
const FUERA_DEL_PANEL = [
  "templates",
  "carrito",
  "catalogo-interactivo",
  "hoja-catalogo",
  "hoja-producto",
  "foto-producto",
  "selector-de-turno",
  "inicio",
  "muestra-plantillas",
];

const ASPECTOS = ["--control-principal", "--control-segundo", "--control-peligro"];

/* Cada excepción, con el motivo por el que es una y no un olvido. */
const PERMITIDOS: ReadonlyArray<{ selector: string; motivo: string }> = [
  /* Un enlace es un enlace. Pintarlo como botón haría que dos cosas que se
     comportan distinto —una navega, la otra actúa— se vieran iguales. */
  { selector: ".acciones a", motivo: "es un enlace, no un botón" },
  { selector: ".avisoSuscripcion a", motivo: "es un enlace, no un botón" },
  { selector: ".tituloSeccion a, .acciones a", motivo: "es un enlace, no un botón" },
  { selector: ".faltantes li a", motivo: "es un enlace, no un botón" },
  { selector: ".avisoFoto a", motivo: "es un enlace, no un botón" },
  { selector: ".tarjeta h2 a", motivo: "es un enlace, no un botón" },
  { selector: ".noEncontrada a", motivo: "es un enlace, no un botón" },
  { selector: ".volver a", motivo: "es un enlace, no un botón" },
  { selector: ".paginacion a, .vacio a", motivo: "es un enlace, no un botón" },
  { selector: ".quien a", motivo: "es un enlace, no un botón" },
  { selector: ".avisoAgenda a", motivo: "es un enlace, no un botón" },
  { selector: ".texto a, .vista a", motivo: "es un enlace, no un botón" },
  { selector: ".enlaces a", motivo: "es un enlace, no un botón" },

  /* Elegir una opción de un juego no es tocar un botón: lo que importa es cuál
     está elegida, y eso se dice con el color de marca. */
  { selector: ".dia, .diaActivo", motivo: "es un juego de opciones, y marca cuál está elegida" },
  { selector: ".paleta, .paletaElegida", motivo: "es un juego de opciones, y marca cuál está elegida" },
  {
    selector: ".opcion, .opcionElegida, .paleta, .paletaElegida",
    motivo: "es un juego de opciones, y marca cuál está elegida",
  },
  { selector: ".interruptor", motivo: "es un interruptor: importa encendido o apagado" },
  { selector: ".masOpciones[open] > summary", motivo: "es el estado abierto, no otro aspecto" },

  /* Las que cuestan dinero cada vez que se usan llevan el degradado de IA. Es la
     única señal que avisa antes de tocar, y por eso no se uniforma. */
  { selector: ".cargar", motivo: "es una herramienta con IA: el degradado avisa que gasta cuota" },
  { selector: ".abrirIa", motivo: "es una herramienta con IA: el degradado avisa que gasta cuota" },

  /* Sobre una fotografía, un control tiene que leerse contra cualquier imagen. */
  { selector: ".miniaturaProducto", motivo: "es el marco de una fotografía, no un botón" },
  { selector: ".foto button", motivo: "va encima de una fotografía y tiene que leerse sobre cualquiera" },

  /* Quitar un renglón de una lista: letra de peligro sobre la forma compartida. */
  { selector: ".intervalo button", motivo: "quita un renglón: lleva la letra de peligro" },

  /* Una fila de una lista no es un botón. Con relieve y superficie propia se
     leería como una tarjeta suelta en vez de como un renglón de un listado, que
     es lo que es: se toca entera y abre lo que tiene debajo. */
  { selector: ".filtro, .filtroActivo", motivo: "es una fila de una lista, no un botón" },

  /* Viven dentro de otra cosa —un campo, una hoja, un aviso— y ahí un botón con
     su propio relieve compite con lo que contiene. */
  { selector: ".alternarClave", motivo: "vive adentro del campo de clave" },
  { selector: ".cerrarHoja, .cerrarToast", motivo: "es la cruz de cerrar, va adentro de lo que cierra" },
];

function hojasDeEstilo(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return hojasDeEstilo(ruta);
    return nombre.endsWith(".module.css") ? [ruta] : [];
  });
}

describe("el aspecto de los controles del panel", () => {
  it("sale de los tres aspectos compartidos, o está en la lista con su motivo", () => {
    const permitidos = new Set(PERMITIDOS.map(({ selector }) => selector));
    const invasores: string[] = [];

    for (const carpeta of ["app", "components"]) {
      for (const hoja of hojasDeEstilo(join(RAIZ, carpeta))) {
        const ruta = relative(RAIZ, hoja).replace(/\\/g, "/");
        if (FUERA_DEL_PANEL.some((parte) => ruta.includes(parte))) continue;

        const contenido = readFileSync(hoja, "utf8");
        for (const regla of contenido.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
          const selector = regla[1].split("*/").at(-1)!.trim().replace(/\s+/g, " ");
          const cuerpo = regla[2];

          const seToca = cuerpo.includes("cursor: pointer") || /(button|summary|\ba\b)\s*(,|\{|$)/.test(selector);
          if (!seToca) continue;
          if (!/\n\s*(background|color):\s*[^;]+;/.test(cuerpo)) continue;

          const valores = [...cuerpo.matchAll(/\n\s*(?:background|color|border):\s*([^;]+);/g)]
            .map((d) => d[1])
            .join(" ");
          if (ASPECTOS.some((aspecto) => valores.includes(aspecto))) continue;
          if (valores.includes("transparent") && !/\n\s*color:/.test(cuerpo)) continue;
          if (permitidos.has(selector)) continue;

          invasores.push(`${ruta} → ${selector}`);
        }
      }
    }

    expect(
      invasores,
      "usá --control-principal-*, --control-segundo-* o --control-peligro-*; si de verdad tiene que ser distinto, agregalo a PERMITIDOS con su motivo",
    ).toEqual([]);
  });

  it("los tres aspectos están definidos", () => {
    const globales = readFileSync(join(RAIZ, "app", "globals.css"), "utf8");
    for (const aspecto of ASPECTOS) {
      for (const parte of ["fondo", "borde", "texto"]) {
        expect(globales, `falta ${aspecto}-${parte}`).toContain(`${aspecto}-${parte}:`);
      }
    }
  });
});
