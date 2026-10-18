import { describe, expect, it } from "vitest";

import {
  esFormatoCorrecto,
  formatearDuracion,
  leerCabeceraMp4,
  leerDatosTutorial,
  nombreNuevo,
} from "./validacion";

/* Una caja de MP4: largo (4 bytes), tipo (4 letras) y contenido. */
function caja(tipo: string, contenido: Uint8Array = new Uint8Array(0)) {
  const bytes = new Uint8Array(8 + contenido.length);
  new DataView(bytes.buffer).setUint32(0, bytes.length);
  bytes.set(Array.from(tipo, (letra) => letra.charCodeAt(0)), 4);
  bytes.set(contenido, 8);
  return bytes;
}

function unir(...partes: Uint8Array[]) {
  const total = new Uint8Array(partes.reduce((suma, parte) => suma + parte.length, 0));
  let posicion = 0;
  for (const parte of partes) {
    total.set(parte, posicion);
    posicion += parte.length;
  }
  return total;
}

/* `mvhd` versión 0: versión y banderas, dos fechas de 4 bytes, escala y duración. */
function mvhd(escala: number, unidades: number, version: 0 | 1 = 0) {
  const fechas = version === 1 ? 16 : 8;
  const contenido = new Uint8Array(4 + fechas + 4 + (version === 1 ? 8 : 4) + 80);
  const vista = new DataView(contenido.buffer);
  contenido[0] = version;
  vista.setUint32(4 + fechas, escala);
  if (version === 1) vista.setBigUint64(8 + fechas, BigInt(unidades));
  else vista.setUint32(8 + fechas, unidades);
  return caja("mvhd", contenido);
}

const FTYP = caja("ftyp", new Uint8Array([105, 115, 111, 109, 0, 0, 2, 0]));
const MDAT = caja("mdat", new Uint8Array(64));

describe("leerCabeceraMp4", () => {
  it("lee la duración de un MP4 con inicio rápido", () => {
    const video = unir(FTYP, caja("moov", unir(mvhd(1000, 116_480))), MDAT);
    expect(leerCabeceraMp4(video)).toEqual({ duracion: 116 });
  });

  it("entiende la versión 1 de la cabecera, con números de 64 bits", () => {
    const video = unir(FTYP, caja("moov", unir(caja("free"), mvhd(30_000, 3_600_000, 1))), MDAT);
    expect(leerCabeceraMp4(video)).toEqual({ duracion: 120 });
  });

  it("rechaza el video con el índice al final, que no empieza hasta bajarse entero", () => {
    const video = unir(FTYP, MDAT, caja("moov", mvhd(1000, 5000)));
    expect(leerCabeceraMp4(video)).toEqual({ error: "sin-inicio-rapido" });
  });

  it("rechaza lo que no es MP4", () => {
    expect(leerCabeceraMp4(new TextEncoder().encode("<html>no soy un video</html>"))).toEqual({
      error: "no-es-mp4",
    });
    expect(leerCabeceraMp4(new Uint8Array(0))).toEqual({ error: "no-es-mp4" });
  });

  it("dice que está incompleto si el trozo leído corta antes del índice", () => {
    const video = unir(FTYP, caja("moov", unir(mvhd(1000, 5000))));
    expect(leerCabeceraMp4(video.subarray(0, FTYP.length + 20))).toEqual({ error: "incompleto" });
  });
});

describe("esFormatoCorrecto", () => {
  it("mira los primeros bytes y no el nombre", () => {
    expect(esFormatoCorrecto("video", FTYP)).toBe(true);
    expect(esFormatoCorrecto("video", new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]))).toBe(false);
    expect(esFormatoCorrecto("portada", new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(esFormatoCorrecto("portada", FTYP)).toBe(false);
    expect(esFormatoCorrecto("portada", new Uint8Array([0xff]))).toBe(false);
  });
});

describe("leerDatosTutorial", () => {
  it("limpia y acepta lo correcto", () => {
    expect(leerDatosTutorial({ numero: "3", titulo: "  Tus   productos ", descripcion: " Crear y buscar. " })).toEqual({
      correcto: true,
      datos: { numero: 3, titulo: "Tus productos", descripcion: "Crear y buscar." },
    });
  });

  it("rechaza lo que la base también rechazaría", () => {
    for (const entrada of [
      { numero: 0, titulo: "Bien" },
      { numero: 100, titulo: "Bien" },
      { numero: 2.5, titulo: "Bien" },
      { numero: 1, titulo: "ab" },
      { numero: 1, titulo: "x".repeat(81) },
      { numero: 1, titulo: "Bien", descripcion: "x".repeat(281) },
    ]) {
      expect(leerDatosTutorial(entrada).correcto, JSON.stringify(entrada).slice(0, 60)).toBe(false);
    }
  });
});

describe("nombreNuevo", () => {
  it("tiene la forma que exige la base y nunca se repite", () => {
    const uno = nombreNuevo(1, "video");
    expect(uno).toMatch(/^01-[0-9a-f]{32}\.mp4$/);
    expect(nombreNuevo(16, "portada")).toMatch(/^16-[0-9a-f]{32}\.jpg$/);
    expect(nombreNuevo(1, "video")).not.toBe(uno);
  });
});

describe("formatearDuracion", () => {
  it("en minutos y segundos", () => {
    expect(formatearDuracion(116)).toBe("1:56");
    expect(formatearDuracion(5)).toBe("0:05");
  });
});
