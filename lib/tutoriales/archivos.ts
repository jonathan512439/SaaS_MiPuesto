/* Los archivos de los tutoriales —el video y su portada— viven en R2, en el
 * balde `mipuesto-tutoriales`, y los entrega `/api/tutoriales/<nombre>`.
 *
 * Esta parte no sabe de Cloudflare: recibe el balde ya abierto
 * (`lib/tutoriales/balde.ts`), así se prueba con uno en memoria.
 *
 * El video se pide **por partes** (`Range`): el celular baja el comienzo, empieza
 * a reproducir y pide lo demás a medida que avanza, o salta adonde se adelantó.
 * Sin eso tendría que bajar el video entero antes de mostrar el primer cuadro,
 * con datos móviles que el dueño paga.
 */

/* Lo mínimo del balde de R2 que se usa. Es la forma de `R2Bucket` de Workers,
   recortada: el tipo completo vendría con una dependencia que no hace falta. */
export type RangoR2 = { offset: number; length?: number } | { suffix: number };

export interface ObjetoR2 {
  size: number;
  httpEtag: string;
  range?: RangoR2;
}

export interface ObjetoR2ConCuerpo extends ObjetoR2 {
  body: ReadableStream<Uint8Array>;
}

export interface BaldeTutoriales {
  head(clave: string): Promise<ObjetoR2 | null>;
  get(clave: string, opciones?: { range?: RangoR2 }): Promise<ObjetoR2ConCuerpo | null>;
  put(
    clave: string,
    valor: ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array,
    opciones?: { httpMetadata?: { contentType?: string } },
  ): Promise<ObjetoR2>;
  delete(claves: string | string[]): Promise<void>;
}

/* La misma forma que exige la base (`20261109090000_los_tutoriales.sql`): el
   número del video, un guion y 32 cifras al azar. Nada que se parezca a una
   ruta —ni barras ni puntos de más— llega hasta el balde. */
const NOMBRE_ARCHIVO = /^[0-9]{2}-[0-9a-f]{32}\.(mp4|jpg)$/;
const TIPOS = { mp4: "video/mp4", jpg: "image/jpeg" } as const;

/* Todo va dentro de una carpeta del balde, por si el balde llega a guardar
   otra cosa. */
export const claveEnBalde = (nombre: string) => `tutoriales/${nombre}`;

export function tipoDeArchivo(nombre: string): (typeof TIPOS)[keyof typeof TIPOS] | null {
  const coincidencia = NOMBRE_ARCHIVO.exec(nombre);
  return coincidencia ? TIPOS[coincidencia[1] as keyof typeof TIPOS] : null;
}

/* Guarda lo que llega en el balde sin juntarlo en memoria: se mira el comienzo
 * —¿es de verdad un MP4, un JPG?— y el resto pasa de largo hacia R2.
 *
 * `largoFijo` es el `FixedLengthStream` de Workers (`balde.ts`): R2 necesita
 * saber cuánto mide lo que recibe, y además corta si llega más o menos de lo
 * que se declaró. Así un `Content-Length` mentiroso no deja nada guardado. */
export async function guardarEnBalde(
  balde: BaldeTutoriales,
  nombre: string,
  cuerpo: ReadableStream<Uint8Array>,
  largo: number,
  esFormato: (comienzo: Uint8Array) => boolean,
  largoFijo: (largo: number) => TransformStream<Uint8Array, Uint8Array>,
): Promise<"guardado" | "formato"> {
  const tipo = tipoDeArchivo(nombre);
  if (!tipo) throw new Error("Nombre de archivo fuera de forma.");
  const lector = cuerpo.getReader();
  let comienzo = new Uint8Array(0);
  while (comienzo.length < 12) {
    const { done, value } = await lector.read();
    if (done) break;
    const junto = new Uint8Array(comienzo.length + value.length);
    junto.set(comienzo);
    junto.set(value, comienzo.length);
    comienzo = junto;
  }
  if (!esFormato(comienzo)) {
    await lector.cancel();
    return "formato";
  }
  const resto = new ReadableStream<Uint8Array>({
    start(controlador) {
      controlador.enqueue(comienzo);
    },
    async pull(controlador) {
      const { done, value } = await lector.read();
      if (done) controlador.close();
      else controlador.enqueue(value);
    },
    cancel(motivo) {
      return lector.cancel(motivo);
    },
  });
  await balde.put(claveEnBalde(nombre), resto.pipeThrough(largoFijo(largo)), {
    httpMetadata: { contentType: tipo },
  });
  return "guardado";
}

/* Un nombre nunca se reutiliza: reemplazar un video sube un archivo nuevo. Por
   eso cada archivo se puede guardar en caché para siempre. */
const CACHE_PARA_SIEMPRE = "public, max-age=31536000, immutable";

/* Lee un `Range` de una sola parte. Lo que no se entiende se ignora y se
   entrega el archivo entero, que es lo que pide la norma (RFC 9110, 14.2):
   un `Range` raro no es un error del cliente. Varias partes a la vez tampoco se
   atienden —ningún reproductor de video las pide— y se entrega entero. */
export function leerRango(cabecera: string | null): RangoR2 | null {
  const coincidencia = /^bytes=(\d*)-(\d*)$/.exec(cabecera?.trim() ?? "");
  if (!coincidencia) return null;
  const [, desde, hasta] = coincidencia;
  if (desde === "" && hasta === "") return null;
  if (desde === "") {
    const ultimos = Number(hasta);
    return ultimos > 0 ? { suffix: ultimos } : null;
  }
  const inicio = Number(desde);
  if (hasta === "") return { offset: inicio };
  const fin = Number(hasta);
  return fin >= inicio ? { offset: inicio, length: fin - inicio + 1 } : null;
}

/* Qué bytes van de verdad, ya recortados al tamaño del archivo. */
function bytesEntregados(rango: RangoR2, tamano: number) {
  if ("suffix" in rango) return { inicio: Math.max(0, tamano - rango.suffix), fin: tamano - 1 };
  const fin = rango.length === undefined ? tamano - 1 : Math.min(rango.offset + rango.length, tamano) - 1;
  return { inicio: rango.offset, fin };
}

function cabecerasBase(tipo: string, etiqueta: string) {
  return new Headers({
    "Content-Type": tipo,
    "Accept-Ranges": "bytes",
    "Cache-Control": CACHE_PARA_SIEMPRE,
    ETag: etiqueta,
    "X-Content-Type-Options": "nosniff",
  });
}

const noEncontrado = () =>
  new Response("No existe.", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function entregarArchivo(balde: BaldeTutoriales, nombre: string, solicitud: Request) {
  const tipo = tipoDeArchivo(nombre);
  if (!tipo) return noEncontrado();
  const clave = claveEnBalde(nombre);

  if (solicitud.method === "HEAD") {
    const objeto = await balde.head(clave);
    if (!objeto) return noEncontrado();
    const cabeceras = cabecerasBase(tipo, objeto.httpEtag);
    cabeceras.set("Content-Length", String(objeto.size));
    return new Response(null, { status: 200, headers: cabeceras });
  }

  const rango = leerRango(solicitud.headers.get("Range"));
  let objeto: ObjetoR2ConCuerpo | null;
  try {
    objeto = await balde.get(clave, rango ? { range: rango } : undefined);
  } catch {
    /* R2 rechaza un rango que empieza después del final. La respuesta correcta
       es 416 con el tamaño, para que el reproductor sepa cuánto hay. */
    const existe = rango ? await balde.head(clave) : null;
    if (!existe) throw new Error("No se pudo leer el archivo del tutorial.");
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${existe.size}`, "Cache-Control": "no-store" },
    });
  }
  if (!objeto) return noEncontrado();

  const cabeceras = cabecerasBase(tipo, objeto.httpEtag);
  /* Ya lo tiene: no se vuelve a mandar. */
  if (!rango && solicitud.headers.get("If-None-Match") === objeto.httpEtag) {
    await objeto.body.cancel();
    return new Response(null, { status: 304, headers: cabeceras });
  }
  if (!rango) {
    cabeceras.set("Content-Length", String(objeto.size));
    return new Response(objeto.body, { status: 200, headers: cabeceras });
  }

  const { inicio, fin } = bytesEntregados(objeto.range ?? rango, objeto.size);
  /* Una parte no se guarda en la caché compartida: la caché de Workers está
     encendida, guarda por dirección, y un trozo guardado bajo la dirección del
     video se le podría servir a quien pide el video entero. */
  cabeceras.set("Cache-Control", "no-store");
  cabeceras.set("Content-Range", `bytes ${inicio}-${fin}/${objeto.size}`);
  cabeceras.set("Content-Length", String(fin - inicio + 1));
  return new Response(objeto.body, { status: 206, headers: cabeceras });
}
