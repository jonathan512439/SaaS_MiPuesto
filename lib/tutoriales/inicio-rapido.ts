/* Preparar para la web un MP4 que vino con el índice al final.
 *
 * Los editores de video —CapCut, Clipchamp, el de Windows— exportan con el
 * índice (`moov`) después del contenido (`mdat`). Así el celular tiene que
 * bajar el video entero antes de mostrar el primer cuadro, y la plataforma lo
 * rechazaba con «no está preparado para la web». Volver a exportar con
 * `-movflags +faststart` pedía instalar ffmpeg y saber usarlo; el dueño edita
 * el video, le pone su voz y lo quiere subir.
 *
 * Esto hace lo mismo que `faststart`, en el navegador y sin volver a comprimir:
 * pone el índice primero y corre los punteros que el índice guarda hacia el
 * contenido. Los cuadros y el sonido no se tocan, así que el video sale
 * idéntico.
 *
 * **Los punteros son lo delicado.** El índice dice dónde empieza cada trozo de
 * video y de sonido como una posición absoluta en el archivo (`stco`, o `co64`
 * en los grandes). Al mover el índice adelante, todo lo demás se corre, y
 * cada posición tiene que correrse igual o el video se ve roto. Se corrige
 * cada puntero según la caja en que cae, no con un desplazamiento fijo: así
 * sirve también con varias cajas de contenido o con cajas de relleno entre
 * medio.
 */

type Caja = { tipo: string; inicio: number; largo: number };

/* Las cajas que contienen otras en el camino hasta las tablas de punteros. */
const CONTENEDORES = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts"]);

function leerTipo(bytes: Uint8Array, posicion: number) {
  return String.fromCharCode(...bytes.subarray(posicion + 4, posicion + 8));
}

/* Las cajas de un nivel, entre `desde` y `hasta`. `null` si alguna no cierra:
   un archivo cortado no se reordena, se rechaza. */
function cajasEntre(bytes: Uint8Array, vista: DataView, desde: number, hasta: number): Caja[] | null {
  const cajas: Caja[] = [];
  let posicion = desde;
  while (posicion + 8 <= hasta) {
    let largo = vista.getUint32(posicion);
    if (largo === 1) {
      if (posicion + 16 > hasta) return null;
      largo = Number(vista.getBigUint64(posicion + 8));
    } else if (largo === 0) {
      largo = hasta - posicion;
    }
    if (largo < 8 || posicion + largo > hasta) return null;
    cajas.push({ tipo: leerTipo(bytes, posicion), inicio: posicion, largo });
    posicion += largo;
  }
  return posicion === hasta ? cajas : null;
}

/* Todas las tablas de punteros adentro del índice, a cualquier profundidad. */
function tablasDePunteros(bytes: Uint8Array, vista: DataView, caja: Caja): Caja[] | null {
  const cabecera = vista.getUint32(caja.inicio) === 1 ? 16 : 8;
  const hijos = cajasEntre(bytes, vista, caja.inicio + cabecera, caja.inicio + caja.largo);
  if (!hijos) return null;
  const tablas: Caja[] = [];
  for (const hijo of hijos) {
    if (hijo.tipo === "stco" || hijo.tipo === "co64") tablas.push(hijo);
    else if (CONTENEDORES.has(hijo.tipo)) {
      const adentro = tablasDePunteros(bytes, vista, hijo);
      if (!adentro) return null;
      tablas.push(...adentro);
    }
  }
  return tablas;
}

export type ResultadoInicioRapido =
  | { estado: "ya-estaba"; bytes: Uint8Array }
  | { estado: "preparado"; bytes: Uint8Array }
  | { estado: "no-se-pudo" };

export function prepararInicioRapido(original: Uint8Array): ResultadoInicioRapido {
  const vista = new DataView(original.buffer, original.byteOffset, original.byteLength);
  const cajas = cajasEntre(original, vista, 0, original.byteLength);
  if (!cajas || cajas[0]?.tipo !== "ftyp") return { estado: "no-se-pudo" };

  const indice = cajas.find(({ tipo }) => tipo === "moov");
  const primerContenido = cajas.findIndex(({ tipo }) => tipo === "mdat");
  if (!indice || primerContenido < 0) return { estado: "no-se-pudo" };
  if (cajas.indexOf(indice) < primerContenido) return { estado: "ya-estaba", bytes: original };

  /* Un índice comprimido (`cmov`) no se puede corregir sin descomprimirlo. */
  const hijosIndice = cajasEntre(original, vista, indice.inicio + 8, indice.inicio + indice.largo);
  if (!hijosIndice || hijosIndice.some(({ tipo }) => tipo === "cmov")) return { estado: "no-se-pudo" };

  /* El orden nuevo: `ftyp`, el índice y después todo lo demás como estaba. */
  const orden = [cajas[0], indice, ...cajas.slice(1).filter((caja) => caja !== indice)];
  const nuevoInicio = new Map<Caja, number>();
  let posicion = 0;
  for (const caja of orden) {
    nuevoInicio.set(caja, posicion);
    posicion += caja.largo;
  }

  const salida = new Uint8Array(original.byteLength);
  for (const caja of orden) {
    salida.set(original.subarray(caja.inicio, caja.inicio + caja.largo), nuevoInicio.get(caja)!);
  }

  /* Corregir los punteros en la copia del índice, que ya está en su lugar
     nuevo. Cada uno se corre según la caja en que caía en el original. */
  const vistaSalida = new DataView(salida.buffer, salida.byteOffset, salida.byteLength);
  const indiceNuevo: Caja = { ...indice, inicio: nuevoInicio.get(indice)! };
  const tablas = tablasDePunteros(salida, vistaSalida, indiceNuevo);
  if (!tablas) return { estado: "no-se-pudo" };

  const nuevaPosicion = (vieja: number) => {
    const caja = cajas.find(({ inicio, largo }) => vieja >= inicio && vieja < inicio + largo);
    return caja && caja !== indice ? nuevoInicio.get(caja)! + (vieja - caja.inicio) : null;
  };

  for (const tabla of tablas) {
    const ancho = tabla.tipo === "co64" ? 8 : 4;
    /* Cabecera de 8, versión y banderas 4, cantidad 4. */
    const cantidad = vistaSalida.getUint32(tabla.inicio + 12);
    if (16 + cantidad * ancho > tabla.largo) return { estado: "no-se-pudo" };
    for (let i = 0; i < cantidad; i += 1) {
      const lugar = tabla.inicio + 16 + i * ancho;
      const vieja = ancho === 8 ? Number(vistaSalida.getBigUint64(lugar)) : vistaSalida.getUint32(lugar);
      const nueva = nuevaPosicion(vieja);
      if (nueva === null) return { estado: "no-se-pudo" };
      if (ancho === 8) vistaSalida.setBigUint64(lugar, BigInt(nueva));
      else if (nueva > 0xffffffff) return { estado: "no-se-pudo" };
      else vistaSalida.setUint32(lugar, nueva);
    }
  }

  return { estado: "preparado", bytes: salida };
}
