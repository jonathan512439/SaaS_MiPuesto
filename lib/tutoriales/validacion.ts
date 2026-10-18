/* Lo que entra a un tutorial: sus datos, sus archivos y la cabecera del MP4.
 *
 * Corre en los dos lados. El navegador avisa antes de subir 30 MB para nada;
 * el servidor vuelve a comprobar todo, porque una ruta se puede llamar sin la
 * pantalla. Y la base pone los topes de verdad
 * (`20261109090000_los_tutoriales.sql`).
 */

export type TipoArchivo = "video" | "portada";

/* El video para la web va en 720×1280: unos 15 MB por dos minutos. El tope
   deja margen y queda lejos de los 100 MB que Cloudflare acepta por envío. */
export const ARCHIVOS = {
  video: { tipo: "video/mp4", extension: "mp4", tope: 60 * 1024 * 1024, texto: "60 MB" },
  portada: { tipo: "image/jpeg", extension: "jpg", tope: 600 * 1024, texto: "600 KB" },
} as const;

export const esTipoArchivo = (valor: unknown): valor is TipoArchivo =>
  valor === "video" || valor === "portada";

export type DatosTutorial = { numero: number; titulo: string; descripcion: string };

export function leerDatosTutorial(
  entrada: Record<string, unknown>,
): { correcto: true; datos: DatosTutorial } | { correcto: false; error: string } {
  const numero = Number(entrada.numero);
  if (!Number.isInteger(numero) || numero < 1 || numero > 99) {
    return { correcto: false, error: "El número va del 1 al 99." };
  }
  const titulo = typeof entrada.titulo === "string" ? entrada.titulo.replace(/\s+/g, " ").trim() : "";
  if (titulo.length < 3 || titulo.length > 80) {
    return { correcto: false, error: "El título va de 3 a 80 letras." };
  }
  const descripcion = typeof entrada.descripcion === "string" ? entrada.descripcion.trim() : "";
  if (descripcion.length > 280) {
    return { correcto: false, error: "La descripción va hasta 280 letras." };
  }
  return { correcto: true, datos: { numero, titulo, descripcion } };
}

/* `NN-<32 hex>.ext`: la forma que exige la base. El trozo al azar hace que
   reemplazar un archivo sea siempre uno nuevo. */
export function nombreNuevo(numero: number, tipo: TipoArchivo) {
  const azar = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${String(numero).padStart(2, "0")}-${azar}.${ARCHIVOS[tipo].extension}`;
}

/* Los primeros bytes dicen qué es el archivo, diga lo que diga su nombre. */
export function esFormatoCorrecto(tipo: TipoArchivo, bytes: Uint8Array) {
  if (tipo === "portada") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return bytes.length >= 8 && String.fromCharCode(...bytes.subarray(4, 8)) === "ftyp";
}

export const BYTES_CABECERA_MP4 = 2 * 1024 * 1024;

/* La duración, leída de la cabecera del MP4 (`moov` → `mvhd`), y de paso si el
 * video está preparado para la web.
 *
 * Un MP4 guarda su índice (`moov`) al principio o al final. Al final, el
 * reproductor tiene que bajar el video entero antes de mostrar el primer
 * cuadro. Al principio —«inicio rápido», `-movflags +faststart`— empieza a
 * reproducir enseguida. Por eso, si aparece el contenido (`mdat`) antes que el
 * índice, el video se rechaza con instrucciones para exportarlo bien.
 */
export function leerCabeceraMp4(
  bytes: Uint8Array,
): { duracion: number } | { error: "sin-inicio-rapido" | "no-es-mp4" | "incompleto" } {
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tipoEn = (posicion: number) => String.fromCharCode(...bytes.subarray(posicion + 4, posicion + 8));
  const largoEn = (posicion: number, fin: number) => {
    const largo = vista.getUint32(posicion);
    if (largo === 1) {
      if (posicion + 16 > bytes.length) return -1;
      return Number(vista.getBigUint64(posicion + 8));
    }
    return largo === 0 ? fin - posicion : largo;
  };

  let posicion = 0;
  let primera = true;
  while (posicion + 8 <= bytes.length) {
    const tipo = tipoEn(posicion);
    const largo = largoEn(posicion, Number.MAX_SAFE_INTEGER);
    if (primera && tipo !== "ftyp") return { error: "no-es-mp4" };
    primera = false;
    if (largo < 0) return { error: "incompleto" };
    if (largo < 8) return { error: "no-es-mp4" };
    if (tipo === "mdat") return { error: "sin-inicio-rapido" };
    if (tipo === "moov") {
      const fin = Math.min(posicion + largo, bytes.length);
      let hijo = posicion + 8;
      while (hijo + 8 <= fin) {
        const largoHijo = largoEn(hijo, fin);
        if (largoHijo < 8) return { error: "no-es-mp4" };
        if (tipoEn(hijo) === "mvhd") {
          const version = bytes[hijo + 8];
          const base = hijo + 12 + (version === 1 ? 16 : 8);
          if (base + (version === 1 ? 12 : 8) > bytes.length) return { error: "incompleto" };
          const escala = vista.getUint32(base);
          const unidades = version === 1 ? Number(vista.getBigUint64(base + 4)) : vista.getUint32(base + 4);
          if (!escala) return { error: "no-es-mp4" };
          return { duracion: Math.max(1, Math.round(unidades / escala)) };
        }
        hijo += largoHijo;
      }
      return { error: "incompleto" };
    }
    posicion += largo;
  }
  return { error: primera ? "no-es-mp4" : "incompleto" };
}

export const MENSAJES_MP4 = {
  "sin-inicio-rapido":
    "Este MP4 no está preparado para la web: el celular tendría que bajarlo entero antes de verlo. Expórtalo con «inicio rápido» (faststart).",
  "no-es-mp4": "El archivo no es un video MP4.",
  incompleto: "No se pudo leer la duración del video. Revisa que sea un MP4 completo.",
} as const;

export function formatearDuracion(segundos: number) {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}
