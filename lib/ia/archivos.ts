/* Qué archivo se acepta para mandar a leer, y por qué.

   Vive separado de `servidor.ts` a propósito: aquel importa el cliente
   privilegiado de Supabase, que es `server-only` y no se puede cargar en una
   prueba. Esta es la parte que decide si se gasta o no una llamada, o sea la
   que más conviene poder probar. */

import { CARACTERES_MAXIMOS, PAGINAS_MAXIMAS } from "./pdf-texto";

/* Un megabyte y medio en base64 son algo más de un megabyte de imagen. El
   navegador ya comprime a unos 150 KB antes de mandarla, así que este tope solo
   se alcanza si alguien evita la pantalla y manda la foto a mano.

   El PDF va más alto porque no se puede comprimir antes de mandarlo: llega tal
   como el proveedor lo mandó. Cinco millones y medio de caracteres son unos
   cuatro megabytes de archivo, que para una lista de precios sobra; lo que
   frena de verdad a un PDF largo no es el peso sino los treinta segundos de
   espera, y para eso el mensaje ya dice que la suba por partes. */
const LARGO_MAXIMO_BASE64 = 1_500_000;
const LARGO_MAXIMO_BASE64_PDF = 5_500_000;

/* La foto de un producto solo puede ser una foto: un PDF ahí no significa nada.
   La lista, en cambio, es lo que el proveedor mandó, y eso casi siempre es un
   PDF. Por eso cada herramienta declara lo suyo en vez de compartir una lista
   común que terminaría siendo la unión de las dos. */
export const TIPOS_FOTO = ["image/webp", "image/jpeg", "image/png"] as const;
export const TIPOS_LISTA = [...TIPOS_FOTO, "application/pdf"] as const;

/* Con qué empieza cada formato una vez escrito en base64. Los primeros bytes de
   un archivo son fijos —`%PDF` en un PDF, `RIFF` en un WebP— y base64 los
   convierte siempre en el mismo prefijo, así que alcanza con mirar el texto sin
   decodificar nada.

   Sirve para una sola cosa, y vale la pena: si alguien elige un Word y el
   navegador lo anuncia como PDF, se corta acá en vez de gastar una de las
   llamadas del día para que Google conteste que no entiende el archivo. Esas
   llamadas son el recurso escaso. */
const PREFIJOS_BASE64: Record<string, string> = {
  "application/pdf": "JVBERi",
  "image/jpeg": "/9j/",
  "image/png": "iVBORw",
  "image/webp": "UklGR",
};

export type PeticionFoto = { base64: string; tipo: string };

/* El texto de un PDF grande, que el navegador ya sacó (`lib/ia/pdf-grande.ts`).
   Los topes se vuelven a mirar acá: cada tanda es una llamada al modelo, y el
   recorte del navegador no vale para quien evita la pantalla. */
export function leerPaginasDeLaPeticion(datos: unknown): { numero: number; texto: string }[] | null {
  if (typeof datos !== "object" || datos === null) return null;
  const { paginas } = datos as { paginas?: unknown };
  if (!Array.isArray(paginas) || paginas.length === 0 || paginas.length > PAGINAS_MAXIMAS) return null;

  const leidas: { numero: number; texto: string }[] = [];
  let caracteres = 0;
  for (const pagina of paginas) {
    const { numero, texto } = (pagina ?? {}) as { numero?: unknown; texto?: unknown };
    if (!Number.isInteger(numero) || (numero as number) < 1) return null;
    if (typeof texto !== "string" || texto.trim() === "") return null;
    caracteres += texto.length;
    if (caracteres > CARACTERES_MAXIMOS) return null;
    leidas.push({ numero: numero as number, texto });
  }
  return leidas;
}

export function leerArchivoDeLaPeticion(
  datos: unknown,
  tiposAceptados: readonly string[],
): PeticionFoto | null {
  if (typeof datos !== "object" || datos === null) return null;
  const { imagen, tipo } = datos as { imagen?: unknown; tipo?: unknown };
  if (typeof imagen !== "string" || typeof tipo !== "string") return null;
  if (!tiposAceptados.includes(tipo)) return null;

  const tope = tipo === "application/pdf" ? LARGO_MAXIMO_BASE64_PDF : LARGO_MAXIMO_BASE64;
  if (imagen.length === 0 || imagen.length > tope) return null;
  if (!imagen.startsWith(PREFIJOS_BASE64[tipo])) return null;

  return { base64: imagen, tipo };
}
