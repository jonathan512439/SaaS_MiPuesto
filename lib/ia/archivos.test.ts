import { describe, expect, it } from "vitest";

import { TIPOS_FOTO, TIPOS_LISTA, leerArchivoDeLaPeticion } from "./archivos";

/* Prefijos reales: son los primeros bytes de cada formato escritos en base64.
   Si alguien cambia la tabla de `servidor.ts` por unos inventados, estos dejan
   de coincidir y la prueba lo dice. */
const PDF = "JVBERi0xLjQK";
const JPEG = "/9j/4AAQSkZJRg";
const PNG = "iVBORw0KGgo";
const WEBP = "UklGRiQAAABXRUJQ";

describe("qué archivo se acepta para leer", () => {
  it("la lista toma foto y PDF; el producto solo foto", () => {
    expect(leerArchivoDeLaPeticion({ imagen: PDF, tipo: "application/pdf" }, TIPOS_LISTA)).toEqual({
      base64: PDF,
      tipo: "application/pdf",
    });

    /* Un PDF en la herramienta de producto no significa nada: lo que se pide
       ahí es la foto de una cosa que se vende. */
    expect(
      leerArchivoDeLaPeticion({ imagen: PDF, tipo: "application/pdf" }, TIPOS_FOTO),
    ).toBeNull();

    for (const [base64, tipo] of [
      [JPEG, "image/jpeg"],
      [PNG, "image/png"],
      [WEBP, "image/webp"],
    ]) {
      expect(leerArchivoDeLaPeticion({ imagen: base64, tipo }, TIPOS_FOTO)).not.toBeNull();
    }
  });

  /* El control que ahorra una llamada de las quinientas del día: el navegador
     anuncia `application/pdf` porque el archivo se llama así, y adentro hay
     otra cosa. Sin esto se descubre recién cuando Google contesta que no. */
  it("rechaza un archivo que no es lo que dice ser", () => {
    expect(
      leerArchivoDeLaPeticion({ imagen: "UEsDBBQ", tipo: "application/pdf" }, TIPOS_LISTA),
    ).toBeNull();
    expect(leerArchivoDeLaPeticion({ imagen: PDF, tipo: "image/png" }, TIPOS_LISTA)).toBeNull();
  });

  /* Al PDF se le deja más lugar porque no se puede comprimir antes de mandarlo.
     A la foto no: el navegador la achica, y un base64 gigante solo aparece si
     alguien evitó la pantalla. */
  it("le da al PDF más peso que a la foto, y a ninguno peso ilimitado", () => {
    const pdfLargo = PDF + "A".repeat(3_000_000);
    const fotoLarga = JPEG + "A".repeat(3_000_000);
    expect(
      leerArchivoDeLaPeticion({ imagen: pdfLargo, tipo: "application/pdf" }, TIPOS_LISTA),
    ).not.toBeNull();
    expect(leerArchivoDeLaPeticion({ imagen: fotoLarga, tipo: "image/jpeg" }, TIPOS_FOTO)).toBeNull();

    const pdfEnorme = PDF + "A".repeat(6_000_000);
    expect(
      leerArchivoDeLaPeticion({ imagen: pdfEnorme, tipo: "application/pdf" }, TIPOS_LISTA),
    ).toBeNull();
  });

  it("rechaza lo que ni siquiera tiene forma de petición", () => {
    expect(leerArchivoDeLaPeticion(null, TIPOS_LISTA)).toBeNull();
    expect(leerArchivoDeLaPeticion({ imagen: "", tipo: "application/pdf" }, TIPOS_LISTA)).toBeNull();
    expect(leerArchivoDeLaPeticion({ imagen: PDF }, TIPOS_LISTA)).toBeNull();
    expect(
      leerArchivoDeLaPeticion({ imagen: PDF, tipo: "application/msword" }, TIPOS_LISTA),
    ).toBeNull();
  });
});
