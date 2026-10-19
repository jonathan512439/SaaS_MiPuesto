import { describe, expect, it } from "vitest";

import { prepararInicioRapido } from "./inicio-rapido";

/* MP4 armados a mano, caja por caja: lo único que importa acá es dónde queda
   el índice y adónde apuntan sus punteros. */

const texto = (valor: string) => new TextEncoder().encode(valor);

function caja(tipo: string, ...partes: Uint8Array[]) {
  const largo = 8 + partes.reduce((suma, parte) => suma + parte.length, 0);
  const salida = new Uint8Array(largo);
  new DataView(salida.buffer).setUint32(0, largo);
  salida.set(texto(tipo), 4);
  let posicion = 8;
  for (const parte of partes) {
    salida.set(parte, posicion);
    posicion += parte.length;
  }
  return salida;
}

function tablaPunteros(tipo: "stco" | "co64", punteros: number[]) {
  const ancho = tipo === "co64" ? 8 : 4;
  const cuerpo = new Uint8Array(8 + punteros.length * ancho);
  const vista = new DataView(cuerpo.buffer);
  vista.setUint32(4, punteros.length);
  punteros.forEach((puntero, i) => {
    if (ancho === 8) vista.setBigUint64(8 + i * 8, BigInt(puntero));
    else vista.setUint32(8 + i * 4, puntero);
  });
  return caja(tipo, cuerpo);
}

const unir = (...partes: Uint8Array[]) => {
  const salida = new Uint8Array(partes.reduce((suma, parte) => suma + parte.length, 0));
  let posicion = 0;
  for (const parte of partes) {
    salida.set(parte, posicion);
    posicion += parte.length;
  }
  return salida;
};

const indiceCon = (tabla: Uint8Array) =>
  caja("moov", caja("trak", caja("mdia", caja("minf", caja("stbl", tabla)))));

/* Lo que el índice dice que hay en cada puntero, leído del archivo. */
function leerTrozos(bytes: Uint8Array, tipo: "stco" | "co64") {
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const lugar = new TextDecoder("latin1").decode(bytes).indexOf(tipo) - 4;
  const cantidad = vista.getUint32(lugar + 12);
  return Array.from({ length: cantidad }, (_, i) => {
    const puntero =
      tipo === "co64" ? Number(vista.getBigUint64(lugar + 16 + i * 8)) : vista.getUint32(lugar + 16 + i * 4);
    return new TextDecoder().decode(bytes.subarray(puntero, puntero + 4));
  });
}

const FTYP = caja("ftyp", texto("isom"), new Uint8Array(4), texto("isommp42"));

/* Un video como lo exporta un editor: el contenido primero, el índice al
   final, y el índice apuntando a «VID1», «AUD1» y «VID2». */
function exportadoPorEditor(tipo: "stco" | "co64") {
  const contenido = caja("mdat", texto("VID1AUD1VID2"));
  const relleno = caja("free");
  const inicioContenido = FTYP.length + relleno.length + 8;
  const punteros = [0, 4, 8].map((desplazamiento) => inicioContenido + desplazamiento);
  return unir(FTYP, relleno, contenido, indiceCon(tablaPunteros(tipo, punteros)));
}

describe("prepararInicioRapido", () => {
  it.each(["stco", "co64"] as const)(
    "pone el índice primero y sus punteros (%s) siguen llevando a los mismos trozos",
    (tipo) => {
      const original = exportadoPorEditor(tipo);
      expect(leerTrozos(original, tipo)).toEqual(["VID1", "AUD1", "VID2"]);

      const resultado = prepararInicioRapido(original);
      expect(resultado.estado).toBe("preparado");
      if (resultado.estado !== "preparado") return;

      const tipos = new TextDecoder("latin1").decode(resultado.bytes);
      expect(tipos.indexOf("moov")).toBeLessThan(tipos.indexOf("mdat"));
      expect(resultado.bytes.length).toBe(original.length);
      expect(leerTrozos(resultado.bytes, tipo)).toEqual(["VID1", "AUD1", "VID2"]);
    },
  );

  it("corrige cada puntero según su caja cuando hay dos de contenido", () => {
    const primera = caja("mdat", texto("VID1"));
    const segunda = caja("mdat", texto("AUD1"));
    const relleno = caja("free", new Uint8Array(5));
    const punteros = [FTYP.length + 8, FTYP.length + primera.length + relleno.length + 8];
    const original = unir(FTYP, primera, relleno, segunda, indiceCon(tablaPunteros("stco", punteros)));

    const resultado = prepararInicioRapido(original);
    expect(resultado.estado).toBe("preparado");
    if (resultado.estado === "preparado") {
      expect(leerTrozos(resultado.bytes, "stco")).toEqual(["VID1", "AUD1"]);
    }
  });

  /* El contenido que ya estaba después del índice no se mueve: correr todos los
     punteros lo mismo lo rompería. */
  it("no corre los punteros del contenido que ya estaba después del índice", () => {
    const antes = caja("mdat", texto("VID1"));
    const despues = caja("mdat", texto("AUD1"));
    const largoIndice = indiceCon(tablaPunteros("stco", [0, 0])).length;
    const punteros = [FTYP.length + 8, FTYP.length + antes.length + largoIndice + 8];
    const original = unir(FTYP, antes, indiceCon(tablaPunteros("stco", punteros)), despues);
    expect(leerTrozos(original, "stco")).toEqual(["VID1", "AUD1"]);

    const resultado = prepararInicioRapido(original);
    expect(resultado.estado).toBe("preparado");
    if (resultado.estado === "preparado") {
      expect(leerTrozos(resultado.bytes, "stco")).toEqual(["VID1", "AUD1"]);
    }
  });

  it("deja tal cual el video que ya tiene el índice adelante", () => {
    const resultado = prepararInicioRapido(exportadoPorEditor("stco"));
    if (resultado.estado !== "preparado") throw new Error("debía prepararse");
    const otraVez = prepararInicioRapido(resultado.bytes);
    expect(otraVez.estado).toBe("ya-estaba");
  });

  it("no toca un archivo cortado ni uno con el índice comprimido", () => {
    const completo = exportadoPorEditor("stco");
    expect(prepararInicioRapido(completo.subarray(0, completo.length - 3)).estado).toBe("no-se-pudo");

    const comprimido = unir(FTYP, caja("mdat", texto("VID1")), caja("moov", caja("cmov", texto("zlib"))));
    expect(prepararInicioRapido(comprimido).estado).toBe("no-se-pudo");
  });

  it("no toca lo que no es un MP4", () => {
    expect(prepararInicioRapido(texto("esto no es un video")).estado).toBe("no-se-pudo");
  });
});
