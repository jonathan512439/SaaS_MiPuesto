import { jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Calendario } from "./calendario";
import { SelectorDeFecha } from "./selector-de-fecha";
import { SelectorDeHora } from "./selector-de-hora";

/* El calendario del panel y sus campos de fecha y hora.
 *
 * Reemplazan a los del navegador, que decían «10/15/2026» y «02:30 PM». Se
 * comprueba lo que cambia la lectura: el mes en español, la semana desde el
 * lunes, hoy y el elegido marcados sin depender del color, los turnos en número
 * y los días fuera de rango apagados. */

const html = (elemento: ReturnType<typeof jsx>) => renderToString(elemento).replaceAll("<!-- -->", "");

describe("el calendario", () => {
  const dibujo = html(
    jsx(Calendario, {
      alElegir: () => {},
      etiqueta: "Elige el día",
      hoy: "2026-10-14",
      marcas: { "2026-10-15": 2 },
      minimo: "2026-10-14",
      valor: "2026-10-15",
    }),
  );

  it("muestra el mes en español y la semana desde el lunes", () => {
    expect(dibujo).toContain("Octubre de 2026");
    expect(dibujo.indexOf('abbr="lunes"')).toBeLessThan(dibujo.indexOf('abbr="domingo"'));
  });

  it("marca hoy y el elegido con palabras, no solo con color", () => {
    expect(dibujo).toMatch(/aria-current="date" aria-label="miércoles 14 de octubre, hoy"/);
    expect(dibujo).toMatch(/aria-label="jueves 15 de octubre, 2 turnos" aria-pressed="true"/);
  });

  it("apaga los días antes del mínimo", () => {
    expect(dibujo).toMatch(/data-calendario-dia="2026-10-13"[^>]*disabled=""/);
  });
});

describe("los campos de fecha y hora", () => {
  it("la fecha se lee como fecha, no como «10/15/2026»", () => {
    const campo = html(
      jsx(SelectorDeFecha, { alCambiar: () => {}, etiqueta: "Día", hoy: "2026-10-14", id: "dia", valor: "2026-10-15" }),
    );
    expect(campo).toContain("Jueves 15 de octubre");
    expect(campo).toContain('aria-haspopup="dialog"');
    expect(campo).not.toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it("vacío dice qué hacer", () => {
    const campo = html(
      jsx(SelectorDeFecha, { alCambiar: () => {}, etiqueta: "Termina", hoy: "2026-10-14", id: "fin", valor: "", textoVacio: "Sin vencimiento" }),
    );
    expect(campo).toContain("Sin vencimiento");
  });

  it("la hora va en 24 horas y conserva un valor fuera de paso", () => {
    const campo = html(jsx(SelectorDeHora, { alCambiar: () => {}, etiqueta: "Hora", id: "hora", valor: "09:07" }));
    expect(campo).toContain(">14:30<");
    expect(campo).toContain(">09:07<");
    expect(campo).not.toMatch(/AM|PM/);
  });
});

/* Ningún campo de fecha u hora del navegador en el panel ni en el catálogo:
   decían «10/15/2026» y «02:30 PM», y cambiaban de aspecto en cada teléfono.
   Se usa `SelectorDeFecha` y `SelectorDeHora`. */
describe("los campos del navegador", () => {
  it("no vuelven", async () => {
    const { readdirSync, readFileSync, statSync } = await import("node:fs");
    const { join, relative } = await import("node:path");
    const raiz = join(import.meta.dirname, "..", "..");
    const archivos = (directorio: string): string[] =>
      readdirSync(directorio).flatMap((nombre) => {
        const ruta = join(directorio, nombre);
        if (statSync(ruta).isDirectory()) return archivos(ruta);
        return nombre.endsWith(".tsx") && !nombre.includes(".test.") ? [ruta] : [];
      });
    const conCampoDelNavegador = ["app", "components"]
      .flatMap((carpeta) => archivos(join(raiz, carpeta)))
      .filter((archivo) =>
        /\btype=["{]?["'`](date|time|datetime-local)["'`]/.test(
          readFileSync(archivo, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, ""),
        ),
      )
      .map((archivo) => relative(raiz, archivo).replaceAll("\\", "/"));
    expect(conCampoDelNavegador).toEqual([]);
  });
});
